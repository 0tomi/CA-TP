import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { mkdtemp, mkdir, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createMonitorServer, readMetrics } from './index.mjs';
import { completeCycle } from './fixtures.mjs';

async function setup(t, { missingLog = false, emptyLog = false, missingDist = false } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ca-tp-dashboard-test-'));
  const logPath = path.join(root, 'cron.log');
  const distDir = path.join(root, 'dist');
  if (!missingLog) await writeFile(logPath, emptyLog ? '' : completeCycle());
  if (!missingDist) {
    await mkdir(distDir);
    await writeFile(path.join(distDir, 'index.html'), '<!doctype html><title>Dashboard</title>');
    await writeFile(path.join(distDir, 'style.css'), 'body { color: green; }');
  }
  await writeFile(path.join(root, 'secret.txt'), 'NO DEBE SER ACCESIBLE');
  const server = createMonitorServer({ logPath, distDir, hostLabel: 'Servidor de prueba' });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  });
  return { root, logPath, distDir, port: server.address().port };
}

function call(port, requestPath, { method = 'GET', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path: requestPath, method, headers, agent: false }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('GET metrics lee la ruta configurada y usa mtime como fecha del archivo', async (t) => {
  const { logPath, port } = await setup(t);
  const modifiedAt = new Date('2026-10-07T12:00:00.000Z');
  await utimes(logPath, modifiedAt, modifiedAt);
  const response = await call(port, '/api/metrics?path=secret.txt');
  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /application\/json/);
  assert.equal(response.headers['cache-control'], 'no-store');
  const metrics = JSON.parse(response.text);
  assert.equal(metrics.source, 'log');
  assert.equal(metrics.hostLabel, 'Servidor de prueba');
  assert.equal(metrics.collectedAt, modifiedAt.toISOString());
  assert.equal(metrics.cpu.idle, 74);
  assert.ok(!response.text.includes('NO DEBE SER ACCESIBLE'));
});

test('registro faltante o vacío produce 503, sin reemplazarlo por demo', async (t) => {
  for (const options of [{ missingLog: true }, { emptyLog: true }]) {
    const { port } = await setup(t, options);
    const response = await call(port, '/api/metrics');
    assert.equal(response.status, 503);
    const data = JSON.parse(response.text);
    assert.ok(data.error);
    assert.ok(['LOG_UNAVAILABLE', 'EMPTY_LOG'].includes(data.code));
    assert.equal(data.source, undefined);
  }
});

test('sirve la interfaz compilada, recursos y fallback de navegación', async (t) => {
  const { port } = await setup(t);
  for (const route of ['/', '/interfaces']) {
    const response = await call(port, route);
    assert.equal(response.status, 200);
    assert.match(response.text, /<title>Dashboard<\/title>/);
    assert.match(response.headers['content-type'], /text\/html/);
  }
  const css = await call(port, '/style.css');
  assert.equal(css.status, 200);
  assert.match(css.headers['content-type'], /text\/css/);
  assert.equal((await call(port, '/no-existe.css')).status, 404);
  const head = await call(port, '/style.css', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.text, '');
});

test('bloquea traversal incluso codificado y enlaces que salgan del dist', async (t) => {
  const { root, distDir, port } = await setup(t);
  for (const route of ['/../secret.txt', '/%2e%2e/secret.txt', '/%2f..%2fsecret.txt', '/%5c..%5csecret.txt']) {
    const response = await call(port, route);
    assert.equal(response.status, 403);
    assert.ok(!response.text.includes('NO DEBE SER ACCESIBLE'));
  }
  await symlink(root, path.join(distDir, 'outside'), 'junction');
  const response = await call(port, '/outside/secret.txt');
  assert.equal(response.status, 403);
  assert.ok(!response.text.includes('NO DEBE SER ACCESIBLE'));
});

test('el servidor es de lectura y permite solamente los orígenes configurados', async (t) => {
  const { port } = await setup(t);
  const local = await call(port, '/api/metrics', { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(local.status, 200);
  assert.equal(local.headers['access-control-allow-origin'], 'http://localhost:5173');
  const unknown = await call(port, '/api/metrics', { headers: { Origin: 'https://otro.example' } });
  assert.equal(unknown.status, 403);
  assert.equal(unknown.headers['access-control-allow-origin'], undefined);
  assert.equal((await call(port, '/api/metrics', { method: 'POST' })).status, 405);
  assert.equal((await call(port, '/api/health')).status, 200);
  assert.equal((await call(port, '/api/no-existe')).status, 404);
  assert.equal((await call(port, '/%invalid')).status, 400);
});

test('informa cómo iniciar la interfaz cuando dist todavía no existe', async (t) => {
  const { port } = await setup(t, { missingDist: true });
  const response = await call(port, '/');
  assert.equal(response.status, 404);
  assert.match(JSON.parse(response.text).error, /npm run build/);
  assert.equal((await call(port, '/api/metrics')).status, 200);
});

test('limita la lectura de logs extensos al tramo final', async (t) => {
  const { logPath } = await setup(t);
  await writeFile(logPath, `${'x'.repeat(2 * 1024 * 1024 + 100)}\n${completeCycle()}`);
  const metrics = await readMetrics(logPath);
  assert.equal(metrics.cpu.idle, 74);
  assert.ok(metrics.warnings.some((warning) => warning.includes('tramo final')));
});
