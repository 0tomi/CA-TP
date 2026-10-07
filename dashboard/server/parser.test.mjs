import test from 'node:test';
import assert from 'node:assert/strict';
import { MonitorLogError, parseMonitorLog } from './parser.mjs';
import { block, completeCycle, cpuOutput, neighborsOutput, networkOutput, sessionsOutput } from './fixtures.mjs';

const metadata = { collectedAt: '2026-10-07T12:00:00.000Z', hostLabel: 'Debian laboratorio' };

test('interpreta las cuatro salidas reales y conserva el texto de auditoría', () => {
  const metrics = parseMonitorLog(completeCycle().replaceAll('\n', '\r\n'), metadata);
  assert.equal(metrics.source, 'log');
  assert.equal(metrics.collectedAt, metadata.collectedAt);
  assert.equal(metrics.hostLabel, metadata.hostLabel);
  assert.deepEqual(metrics.cpu, {
    user: 20, system: 4, idle: 74, wait: 2, steal: 0,
    running: 2, blocked: 0, swapUsedKb: 0, freeMemoryKb: 1812040,
    bufferMemoryKb: 62412, cacheMemoryKb: 2193432,
  });
  assert.equal(metrics.interfaces.length, 2);
  assert.deepEqual(metrics.interfaces[1], {
    name: 'enp0s3', state: 'UP', mac: '08:00:27:16:ad:42',
    addresses: ['192.168.1.24/24', 'fe80::a00:27ff:fe16:ad42/64'],
    rxBytes: 125000000, txBytes: 48000000, rxPackets: 100000, txPackets: 64000,
    rxErrors: 3, txErrors: 1, rxDropped: 4, txDropped: 2,
  });
  assert.equal(metrics.interfaces[0].mac, null);
  assert.deepEqual(metrics.devices.map((device) => [device.state, device.mac]), [
    ['REACHABLE', '08:00:27:00:00:01'], ['FAILED', null],
    ['INCOMPLETE', null], ['STALE', '08:00:27:00:00:40'],
  ]);
  assert.deepEqual(metrics.sessions, [
    { user: 'gime', terminal: 'pts/0', loginAt: '2026-10-07 09:10', origin: '192.168.1.8' },
    { user: 'julian', terminal: 'tty3', loginAt: '2026-10-07 10:20', origin: '' },
    { user: 'ana', terminal: 'pts/1', loginAt: 'Oct 7 11:12', origin: 'laptop.local' },
  ]);
  assert.deepEqual(metrics.history, [{ sample: 1, usage: 26 }]);
  assert.equal(metrics.logs[1].output, networkOutput);
  assert.deepEqual(metrics.warnings, []);
});

test('la captura parcial nueva no se completa con recursos de ciclos anteriores', () => {
  const incomplete = completeCycle(74) + block('cpu', cpuOutput(40))
    + '=== API MOCK ===\nRecurso: red\n2: enp0s3: <UP> state UP\n';
  const metrics = parseMonitorLog(incomplete, metadata);
  assert.equal(metrics.cpu.idle, 40);
  assert.deepEqual(metrics.interfaces, []);
  assert.deepEqual(metrics.devices, []);
  assert.deepEqual(metrics.sessions, []);
  assert.deepEqual(metrics.logs.map((entry) => entry.resource), ['cpu']);
  assert.deepEqual(metrics.history, [{ sample: 1, usage: 26 }, { sample: 2, usage: 60 }]);
  assert.ok(metrics.warnings.some((warning) => warning.includes('interfaces de red') && warning.includes('incompleto')));
});

test('un bloque CPU o encabezado truncado no hace pasar una captura vieja por nueva', () => {
  for (const tail of ['=== API MOCK ===\nRecurso: cpu\n1 2', '=== API MOCK ===\n']) {
    const metrics = parseMonitorLog(completeCycle() + tail, metadata);
    assert.equal(metrics.cpu, null);
    assert.deepEqual(metrics.logs, []);
    assert.equal(metrics.history.length, 1);
    assert.ok(metrics.warnings.length > 0);
  }
});

test('tolera un comienzo cortado de log y no inventa CPU en ciclos sin ese recurso', () => {
  const metrics = parseMonitorLog('salida de un bloque anterior cortado\n================\n'
    + block('red', networkOutput) + block('dispositivos_red', ''), metadata);
  assert.equal(metrics.cpu, null);
  assert.equal(metrics.interfaces.length, 2);
  assert.deepEqual(metrics.devices, []);
  assert.ok(metrics.warnings.some((warning) => warning.includes('no incluye CPU')));
});

test('advierte filas malformadas sin reemplazarlas por valores cero', () => {
  const content = block('cpu', 'no hay datos')
    + block('red', networkOutput.replace('48000000   64000', 'error   64000'))
    + block('dispositivos_red', `${neighborsOutput}\nIP-invalida dev enp0s3 FAILED`)
    + block('usuarios', `${sessionsOutput}\npepe + pts/4 fecha ilegible`);
  const metrics = parseMonitorLog(content, metadata);
  assert.equal(metrics.cpu, null);
  assert.equal(metrics.interfaces.length, 1);
  assert.equal(metrics.devices.length, 4);
  assert.equal(metrics.sessions.length, 3);
  assert.deepEqual(metrics.history, []);
  assert.ok(metrics.warnings.some((warning) => warning.includes('CPU es inválida')));
  assert.ok(metrics.warnings.some((warning) => warning.includes('contadores incompletos')));
  assert.ok(metrics.warnings.some((warning) => warning.includes('vecinos de red')));
  assert.ok(metrics.warnings.some((warning) => warning.includes('fecha ilegible')));
});

test('conserva las últimas 60 muestras CPU sin asignarles fechas ni intervalos inventados', () => {
  const content = Array.from({ length: 65 }, (_, index) => block('cpu', cpuOutput(30 + index))).join('');
  const metrics = parseMonitorLog(content, { ...metadata, truncated: true });
  assert.equal(metrics.history.length, 60);
  assert.deepEqual(metrics.history[0], { sample: 6, usage: 65 });
  assert.deepEqual(metrics.history.at(-1), { sample: 65, usage: 6 });
  assert.ok(metrics.warnings.some((warning) => warning.includes('tramo final')));
});

test('un recurso repetido reinicia el ciclo y no conserva una CPU anterior', () => {
  const metrics = parseMonitorLog(completeCycle() + block('red', networkOutput), metadata);
  assert.equal(metrics.cpu, null);
  assert.equal(metrics.interfaces.length, 2);
  assert.deepEqual(metrics.sessions, []);
});

test('rechaza filas de contadores incompletas aunque las primeras columnas sean legibles', () => {
  const metrics = parseMonitorLog(block('red', networkOutput.replace('48000000   64000      1       2       0       0', '48000000   64000      1       2')), metadata);
  assert.equal(metrics.interfaces.length, 1);
  assert.ok(metrics.warnings.some((warning) => warning.includes('enp0s3')));
});

test('rechaza archivos vacíos, sin bloques o únicamente con bloques incompletos', () => {
  for (const content of ['', 'texto cualquiera', '=== API MOCK ===\nRecurso: cpu\n1 2 3', block('inventado', '3')]) {
    assert.throws(() => parseMonitorLog(content, metadata), (error) => error instanceof MonitorLogError && error.code === 'EMPTY_LOG');
  }
});
