import { createServer } from 'node:http';
import { open, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MonitorLogError,
  parseMonitorLog,
  parseCpu,
  parseInterfaces,
  parseDevices,
  parseSessions,
  parseMemory,
  parseDisks,
  parseServices,
  RESOURCE_ORDER,
} from './parser.mjs';

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_LOG = path.resolve(SERVER_DIR, '../../bash-scripts/cron.log');
const DEFAULT_DIST = path.resolve(SERVER_DIR, '../dist');
const MAX_LOG_BYTES = 2 * 1024 * 1024;
const DEFAULT_ORIGINS = ['*'];

function readBody(request, limitBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
      } else {
        chunks.push(chunk);
      }
    });
    request.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    request.on('error', reject);
  });
}
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function json(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
}

function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

export async function readMetrics(logPath, hostLabel = 'Servidor Debian') {
  let handle;
  try {
    handle = await open(logPath, 'r');
    const fileStat = await handle.stat();
    if (!fileStat.isFile()) throw new MonitorLogError('La ruta del registro no corresponde a un archivo.', 'LOG_UNAVAILABLE');
    const size = Math.min(fileStat.size, MAX_LOG_BYTES);
    const buffer = Buffer.alloc(size);
    const { bytesRead } = await handle.read(buffer, 0, size, fileStat.size - size);
    let content = buffer.subarray(0, bytesRead).toString('utf8');
    const truncated = fileStat.size > MAX_LOG_BYTES;
    if (truncated) {
      const firstMarker = content.indexOf('=== API MOCK ===');
      content = firstMarker === -1 ? '' : content.slice(firstMarker);
    }
    return parseMonitorLog(content, { collectedAt: fileStat.mtime.toISOString(), hostLabel, truncated });
  } catch (error) {
    if (error instanceof MonitorLogError) throw error;
    throw new MonitorLogError('No se pudo leer el registro. Configurá MONITOR_LOG con la ruta del cron.log generado por los scripts.', 'LOG_UNAVAILABLE');
  } finally {
    await handle?.close();
  }
}

async function sendStatic(response, pathname, distDir, headOnly) {
  const resolvedRoot = await realpath(distDir).catch(() => null);
  if (!resolvedRoot) {
    json(response, 404, { error: 'La interfaz todavía no está compilada. Usá npm run dev o generala con npm run build.' });
    return;
  }
  let candidate = path.resolve(resolvedRoot, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (!isInside(resolvedRoot, candidate)) {
    json(response, 403, { error: 'Ruta no permitida.' });
    return;
  }
  let fileStat = await stat(candidate).catch(() => null);
  if (!fileStat?.isFile() && !path.extname(pathname)) {
    candidate = path.join(resolvedRoot, 'index.html');
    fileStat = await stat(candidate).catch(() => null);
  }
  if (!fileStat?.isFile()) {
    json(response, 404, { error: 'Archivo no encontrado.' });
    return;
  }
  const resolvedFile = await realpath(candidate);
  if (!isInside(resolvedRoot, resolvedFile)) {
    json(response, 403, { error: 'Ruta no permitida.' });
    return;
  }
  const extension = path.extname(candidate).toLowerCase();
  response.writeHead(200, {
    'Content-Type': CONTENT_TYPES[extension] ?? 'application/octet-stream',
    'Content-Length': fileStat.size,
    'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=3600',
  });
  response.end(headOnly ? undefined : await readFile(resolvedFile));
}

export function createMonitorServer({
  logPath = process.env.MONITOR_LOG || DEFAULT_LOG,
  distDir = DEFAULT_DIST,
  hostLabel = process.env.MONITOR_HOST_LABEL || 'Servidor Debian',
  allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? DEFAULT_ORIGINS,
  initialSnapshot = null,
} = {}) {
  let inMemorySnapshot = initialSnapshot;

  return createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const origin = request.headers.origin;
    const allowAnyOrigin = allowedOrigins.includes('*');
    if (origin && !allowAnyOrigin && !allowedOrigins.includes(origin)) {
      json(response, 403, { error: 'El origen de esta conexión no está permitido.' });
      return;
    }
    if (origin) {
      response.setHeader('Access-Control-Allow-Origin', allowAnyOrigin ? '*' : origin);
      response.setHeader('Vary', 'Origin');
      response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }
    if (!['GET', 'HEAD', 'POST'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD, POST, OPTIONS');
      json(response, 405, { error: 'Método no permitido.' });
      return;
    }
    try {
      const rawPath = (request.url ?? '/').split('?')[0];
      const decodedPath = decodeURIComponent(rawPath);
      if (!decodedPath.startsWith('/') || decodedPath.includes('\\') || decodedPath.includes('\0') || decodedPath.split('/').includes('..')) {
        json(response, 403, { error: 'Ruta no permitida.' });
        return;
      }
      const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;

      if (pathname === '/api/health') {
        if (!['GET', 'HEAD'].includes(request.method)) {
          response.setHeader('Allow', 'GET, HEAD, OPTIONS');
          json(response, 405, { error: 'Este endpoint permite solamente consultas de lectura.' });
          return;
        }
        json(response, 200, { status: 'ok', source: inMemorySnapshot ? 'api' : 'log' });
      } else if (pathname === '/api/metrics') {
        if (!['GET', 'HEAD'].includes(request.method)) {
          response.setHeader('Allow', 'GET, HEAD, OPTIONS');
          json(response, 405, { error: 'Este endpoint permite solamente consultas de lectura.' });
          return;
        }
        if (inMemorySnapshot) {
          json(response, 200, inMemorySnapshot);
        } else {
          const snapshot = await readMetrics(logPath, hostLabel);
          json(response, 200, snapshot);
        }
      } else if (pathname.startsWith('/api/ingest')) {
        const ingestMatch = pathname.match(/^\/api\/ingest\/([^/]+)$/);
        if (!ingestMatch) {
          json(response, 400, { error: 'Ruta de ingesta inválida.' });
          return;
        }
        if (request.method !== 'POST') {
          response.setHeader('Allow', 'POST, OPTIONS');
          json(response, 405, { error: 'El endpoint de ingesta solo admite peticiones POST.' });
          return;
        }
        const resource = ingestMatch[1];
        if (!RESOURCE_ORDER.includes(resource)) {
          json(response, 400, { error: `Recurso desconocido: ${resource}` });
          return;
        }

        let body;
        try {
          body = await readBody(request);
        } catch {
          json(response, 400, { error: 'Error al leer el cuerpo de la petición.' });
          return;
        }

        if (!body || !body.trim()) {
          json(response, 400, { error: 'Body vacío' });
          return;
        }

        const warnings = [];
        let parsed = null;
        let parseError = null;

        switch (resource) {
          case 'cpu':
            parsed = parseCpu(body);
            if (!parsed) {
              parseError = 'La muestra de CPU es inválida: se esperan las columnas numéricas de vmstat.';
            }
            break;
          case 'red':
            parsed = parseInterfaces(body, warnings);
            if (!parsed || parsed.length === 0) {
              parseError = warnings[0] || 'No se pudo interpretar la salida de las interfaces de red.';
            }
            break;
          case 'dispositivos_red':
            parsed = parseDevices(body, warnings);
            if (!parsed || (body.trim() && parsed.length === 0 && warnings.length > 0)) {
              parseError = warnings[0] || 'No se pudo interpretar la tabla de vecinos de red.';
            }
            break;
          case 'usuarios':
            parsed = parseSessions(body, warnings);
            if (!parsed || (body.trim() && parsed.length === 0 && warnings.length > 0)) {
              parseError = warnings[0] || 'No se pudo interpretar la lista de sesiones de usuarios.';
            }
            break;
          case 'memoria':
            parsed = parseMemory(body);
            if (!parsed) {
              parseError = 'La lectura de memoria es inválida: se esperan las filas Mem y Swap de free -m.';
            }
            break;
          case 'disco':
            parsed = parseDisks(body, warnings);
            if (!parsed || parsed.length === 0) {
              parseError = warnings[0] || 'No se pudieron interpretar las particiones de disco.';
            }
            break;
          case 'servicios':
            parsed = parseServices(body, warnings);
            if (!parsed || parsed.length === 0) {
              parseError = warnings[0] || 'No se pudo interpretar el estado de los servicios.';
            }
            break;
        }

        if (!inMemorySnapshot) {
          inMemorySnapshot = {
            source: 'api',
            collectedAt: new Date().toISOString(),
            hostLabel,
            cpu: null,
            interfaces: [],
            devices: [],
            sessions: [],
            memory: null,
            disks: [],
            services: [],
            history: [],
            logs: [],
            warnings: [],
          };
        }

        inMemorySnapshot.collectedAt = new Date().toISOString();

        const existingLogIndex = inMemorySnapshot.logs.findIndex((l) => l.resource === resource);
        if (existingLogIndex >= 0) {
          inMemorySnapshot.logs[existingLogIndex] = { resource, output: body };
        } else {
          inMemorySnapshot.logs.push({ resource, output: body });
        }

        if (parseError) {
          json(response, 422, { error: parseError, resource });
          return;
        }

        switch (resource) {
          case 'cpu': {
            inMemorySnapshot.cpu = parsed;
            const usage = Math.round((100 - parsed.idle) * 100) / 100;
            const lastSample = inMemorySnapshot.history.length > 0
              ? inMemorySnapshot.history[inMemorySnapshot.history.length - 1].sample
              : 0;
            inMemorySnapshot.history.push({ sample: lastSample + 1, usage });
            if (inMemorySnapshot.history.length > 60) {
              inMemorySnapshot.history = inMemorySnapshot.history.slice(-60);
            }
            break;
          }
          case 'red':
            inMemorySnapshot.interfaces = parsed;
            break;
          case 'dispositivos_red':
            inMemorySnapshot.devices = parsed;
            break;
          case 'usuarios':
            inMemorySnapshot.sessions = parsed;
            break;
          case 'memoria':
            inMemorySnapshot.memory = parsed;
            break;
          case 'disco':
            inMemorySnapshot.disks = parsed;
            break;
          case 'servicios':
            inMemorySnapshot.services = parsed;
            break;
        }

        json(response, 200, { ok: true, resource });
      } else if (pathname.startsWith('/api/')) {
        json(response, 404, { error: 'Consulta no encontrada.' });
      } else {
        if (!['GET', 'HEAD'].includes(request.method)) {
          response.setHeader('Allow', 'GET, HEAD, OPTIONS');
          json(response, 405, { error: 'Este servidor permite solamente consultas de lectura para archivos estáticos.' });
          return;
        }
        await sendStatic(response, decodedPath, distDir, request.method === 'HEAD');
      }
    } catch (error) {
      if (response.headersSent) {
        response.destroy();
      } else if (error instanceof URIError) {
        json(response, 400, { error: 'La dirección de la consulta es inválida.' });
      } else if (error instanceof MonitorLogError) {
        json(response, 503, { error: error.message, code: error.code });
      } else {
        json(response, 500, { error: 'No se pudo completar la consulta.' });
      }
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 8787);
  const host = process.env.HOST || '0.0.0.0';
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    process.stderr.write('PORT debe ser un número entre 1 y 65535.\n');
    process.exitCode = 1;
  } else {
    const server = createMonitorServer();
    server.on('error', (error) => {
      process.stderr.write(`No se pudo iniciar el servidor: ${error.message}\n`);
      process.exitCode = 1;
    });
    server.listen(port, host, () => {
      process.stdout.write(`Dashboard disponible en http://${host}:${port}\n`);
      process.stdout.write('Las lecturas provienen de MONITOR_LOG; no se ejecutan comandos de monitorización.\n');
    });
  }
}
