import { isIP } from 'node:net';

const RESOURCE_ORDER = ['cpu', 'red', 'dispositivos_red', 'usuarios', 'memoria', 'disco', 'servicios'];
const RESOURCE_LABELS = {
  cpu: 'CPU',
  red: 'interfaces de red',
  dispositivos_red: 'vecinos de red',
  usuarios: 'sesiones de usuarios',
  memoria: 'memoria RAM',
  disco: 'particiones de disco',
  servicios: 'servicios',
};

export class MonitorLogError extends Error {
  constructor(message, code = 'INVALID_LOG') {
    super(message);
    this.name = 'MonitorLogError';
    this.code = code;
  }
}

function extractBlocks(content, warnings) {
  const events = [];
  let current = null;
  for (const line of content.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (line.trim() === '=== API MOCK ===') {
      if (current) events.push({ ...current, complete: false });
      current = { resource: null, lines: [], headerRead: false };
    } else if (current && line.trim() === '================') {
      events.push({ ...current, complete: true });
      current = null;
    } else if (current) {
      if (!current.headerRead) {
        const resource = /^Recurso:\s*(\S+)\s*$/.exec(line.trim());
        current.resource = resource?.[1] ?? null;
        current.headerRead = true;
        if (!resource) warnings.push('Se encontró un bloque sin un recurso reconocible.');
      } else {
        current.lines.push(line);
      }
    }
  }
  if (current) events.push({ ...current, complete: false });
  return events.map(({ resource, lines, complete }) => ({
    resource,
    output: lines.join('\n'),
    complete,
  }));
}

function latestCycle(events, warnings) {
  let cycle = new Map();
  let lastIndex = -1;
  for (const event of events) {
    const index = RESOURCE_ORDER.indexOf(event.resource);
    if (index === -1) {
      if (event.resource) warnings.push(`El recurso «${event.resource}» no pertenece a los monitores del TP.`);
      // A new, unfinished header must not make an older complete cycle look fresh.
      if (!event.complete && !event.resource) {
        cycle = new Map();
        lastIndex = -1;
        warnings.push('Comenzó una nueva captura, pero su encabezado todavía está incompleto.');
      }
      continue;
    }
    if (index <= lastIndex) cycle = new Map();
    cycle.set(event.resource, event);
    lastIndex = index;
  }
  return cycle;
}

function parseCpu(output) {
  const lines = output.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length !== 1) return null;
  const values = lines[0].trim().split(/\s+/).map(Number);
  if (values.length < 17 || values.some((value) => !Number.isFinite(value) || value < 0)) return null;
  if (values.slice(12, 17).some((value) => value > 100)) return null;
  return {
    user: values[12],
    system: values[13],
    idle: values[14],
    wait: values[15],
    steal: values[16],
    running: values[0],
    blocked: values[1],
    swapUsedKb: values[2],
    freeMemoryKb: values[3],
    bufferMemoryKb: values[4],
    cacheMemoryKb: values[5],
  };
}

function parseCounters(header, row) {
  const names = header.trim().split(/\s+/);
  const values = row?.trim().split(/\s+/).map(Number) ?? [];
  if (values.length !== names.length || values.some((value) => !Number.isFinite(value) || value < 0)) return null;
  const counters = {};
  for (const key of ['bytes', 'packets', 'errors', 'dropped']) {
    const index = names.indexOf(key);
    if (index === -1 || !Number.isFinite(values[index]) || values[index] < 0) return null;
    counters[key] = values[index];
  }
  return counters;
}

function parseInterfaces(output, warnings) {
  const groups = [];
  let group = null;
  for (const line of output.split(/\r?\n/)) {
    const header = /^\s*\d+:\s+([^:]+):\s*(.*)$/.exec(line);
    if (header) {
      group = {
        name: header[1].split('@')[0].trim(),
        state: /\bstate\s+(\S+)/.exec(header[2])?.[1] ?? 'UNKNOWN',
        addresses: [],
        mac: null,
        lines: [],
      };
      groups.push(group);
    } else if (group) {
      group.lines.push(line);
      const address = /^\s*inet6?\s+(\S+)/.exec(line);
      if (address) group.addresses.push(address[1]);
      const mac = /^\s*link\/ether\s+([a-fA-F0-9:]+)/.exec(line);
      if (mac) group.mac = mac[1];
    }
  }
  if (!groups.length) warnings.push('No se pudo interpretar la salida de las interfaces de red.');
  return groups.flatMap(({ lines, ...interfaceData }) => {
    let rx = null;
    let tx = null;
    lines.forEach((line, index) => {
      const header = /^\s*(RX|TX):\s+(.+)$/.exec(line);
      if (!header) return;
      const counters = parseCounters(header[2], lines[index + 1]);
      if (header[1] === 'RX') rx = counters;
      else tx = counters;
    });
    if (!rx || !tx) {
      warnings.push(`La interfaz ${interfaceData.name} tiene contadores incompletos o inválidos.`);
      return [];
    }
    return [{
      ...interfaceData,
      rxBytes: rx.bytes,
      txBytes: tx.bytes,
      rxPackets: rx.packets,
      txPackets: tx.packets,
      rxErrors: rx.errors,
      txErrors: tx.errors,
      rxDropped: rx.dropped,
      txDropped: tx.dropped,
    }];
  });
}

function parseDevices(output, warnings) {
  const states = new Set(['INCOMPLETE', 'REACHABLE', 'STALE', 'DELAY', 'PROBE', 'FAILED', 'NOARP', 'PERMANENT', 'NONE']);
  return output.split(/\r?\n/).filter((line) => line.trim()).flatMap((line, index) => {
    const tokens = line.trim().split(/\s+/);
    const deviceIndex = tokens.indexOf('dev');
    const macIndex = tokens.indexOf('lladdr');
    const mac = macIndex === -1 ? null : tokens[macIndex + 1];
    const state = tokens.findLast((token) => states.has(token)) ?? (tokens.includes('proxy') ? 'PROXY' : null);
    if (!isIP(tokens[0]) || deviceIndex < 1 || !tokens[deviceIndex + 1] || !state
      || (mac !== null && !/^(?:[\da-fA-F]{2}:){5}[\da-fA-F]{2}$/.test(mac ?? ''))) {
      warnings.push(`Se omitió una fila inválida de vecinos de red (línea ${index + 1}).`);
      return [];
    }
    return [{ ip: tokens[0], interface: tokens[deviceIndex + 1], mac, state }];
  });
}

function parseSessions(output, warnings) {
  const auxiliary = /^(?:LOGIN|login|reboot|shutdown|system|run-level|\.)$/i;
  const terminalPattern = /^(?:pts\/\d+|tty[\w/-]*|console|vc\/\d+|hvc\d+|xvc\d+|:\d+(?:\.\d+)?)$/;
  return output.split(/\r?\n/).filter((line) => line.trim()).flatMap((line, index) => {
    const tokens = line.trim().split(/\s+/);
    if (auxiliary.test(tokens[0])) return [];
    const terminalIndex = /^[+?-]$/.test(tokens[1] ?? '') ? 2 : 1;
    if (!terminalPattern.test(tokens[terminalIndex] ?? '')) return [];
    const dateIndex = terminalIndex + 1;
    let dateParts = 0;
    if (/^\d{4}-\d{2}-\d{2}$/.test(tokens[dateIndex] ?? '') && /^\d{2}:\d{2}(?::\d{2})?$/.test(tokens[dateIndex + 1] ?? '')) {
      dateParts = 2;
    } else if (/^\p{L}{3,}\.?$/u.test(tokens[dateIndex] ?? '') && /^\d{1,2}$/.test(tokens[dateIndex + 1] ?? '') && /^\d{2}:\d{2}(?::\d{2})?$/.test(tokens[dateIndex + 2] ?? '')) {
      dateParts = 3;
    }
    if (!dateParts) {
      warnings.push(`Se omitió una sesión con fecha ilegible (línea ${index + 1}).`);
      return [];
    }
    return [{
      user: tokens[0],
      terminal: tokens[terminalIndex],
      // Preserve the source text: who does not provide a timezone or always a year.
      loginAt: tokens.slice(dateIndex, dateIndex + dateParts).join(' '),
      origin: /\(([^()]*)\)\s*$/.exec(line)?.[1] ?? '',
    }];
  });
}

function parseMemory(output) {
  const rows = output.split(/\r?\n/).map((line) => line.trim().split(/\s+/));
  // free translates its labels: «Mem:»/«Mem.:» and «Swap:»/«Inter:» in Spanish locales.
  const mem = rows.find((tokens) => /^Mem/i.test(tokens[0]))?.slice(1).map(Number) ?? [];
  const swap = rows.find((tokens) => /^(?:Swap|Inter)/i.test(tokens[0]))?.slice(1).map(Number) ?? [];
  const valid = (values, count) => values.length >= count && values.every((value) => Number.isFinite(value) && value >= 0);
  if (!valid(mem, 6) || !valid(swap, 3)) return null;
  return {
    totalMb: mem[0],
    usedMb: mem[1],
    freeMb: mem[2],
    availableMb: mem[5],
    swapTotalMb: swap[0],
    swapUsedMb: swap[1],
  };
}

function parseDisks(output, warnings) {
  return output.split(/\r?\n/).filter((line) => line.trim()).flatMap((line, index) => {
    if (index === 0) return []; // df header, translated by the locale.
    const tokens = line.trim().split(/\s+/);
    const usage = /^(\d{1,3})%$/.exec(tokens[4] ?? '');
    if (tokens.length < 6 || !usage || Number(usage[1]) > 100) {
      warnings.push(`Se omitió una fila inválida de particiones (línea ${index + 1}).`);
      return [];
    }
    return [{
      filesystem: tokens[0],
      size: tokens[1],
      used: tokens[2],
      available: tokens[3],
      usePercent: Number(usage[1]),
      mount: tokens.slice(5).join(' '),
    }];
  });
}

function parseServices(output, warnings) {
  return output.split(/\r?\n/).filter((line) => line.trim()).flatMap((line, index) => {
    const service = /^(\S+)\s+(activo|inactivo)$/.exec(line.trim());
    if (!service) {
      warnings.push(`Se omitió una línea inválida de servicios (línea ${index + 1}).`);
      return [];
    }
    return [{ name: service[1], active: service[2] === 'activo' }];
  });
}

export function parseMonitorLog(content, { collectedAt, hostLabel = 'Servidor Debian', truncated = false } = {}) {
  const warnings = [];
  if (truncated) warnings.push('El archivo es extenso: se leyó su tramo final y el histórico disponible puede estar limitado.');
  const events = extractBlocks(content, warnings);
  if (!events.some((event) => event.complete && RESOURCE_ORDER.includes(event.resource))) {
    throw new MonitorLogError('El archivo todavía no contiene bloques completos de los monitores del TP.', 'EMPTY_LOG');
  }
  const cycle = latestCycle(events, warnings);
  const snapshot = {
    source: 'log',
    collectedAt: collectedAt ?? null,
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
    warnings,
  };
  for (const resource of RESOURCE_ORDER) {
    const event = cycle.get(resource);
    if (!event?.complete) {
      warnings.push(event
        ? `El bloque de ${RESOURCE_LABELS[resource]} de la captura más reciente está incompleto.`
        : `La captura más reciente no incluye ${RESOURCE_LABELS[resource]}.`);
      continue;
    }
    snapshot.logs.push({ resource, output: event.output });
    if (resource === 'cpu') {
      snapshot.cpu = parseCpu(event.output);
      if (!snapshot.cpu) warnings.push('La muestra de CPU es inválida: se esperan las columnas numéricas de vmstat.');
    } else if (resource === 'red') snapshot.interfaces = parseInterfaces(event.output, warnings);
    else if (resource === 'dispositivos_red') snapshot.devices = parseDevices(event.output, warnings);
    else if (resource === 'usuarios') snapshot.sessions = parseSessions(event.output, warnings);
    else if (resource === 'memoria') {
      snapshot.memory = parseMemory(event.output);
      if (!snapshot.memory) warnings.push('La lectura de memoria es inválida: se esperan las filas Mem y Swap de free -m.');
    } else if (resource === 'disco') snapshot.disks = parseDisks(event.output, warnings);
    else if (resource === 'servicios') snapshot.services = parseServices(event.output, warnings);
  }
  const cpuSamples = events.filter((event) => event.complete && event.resource === 'cpu')
    .map((event) => parseCpu(event.output)).filter(Boolean);
  snapshot.history = cpuSamples.slice(-60).map((cpu, index, samples) => ({
    sample: cpuSamples.length - samples.length + index + 1,
    usage: Math.round((100 - cpu.idle) * 100) / 100,
  }));
  snapshot.warnings = [...new Set(warnings)];
  return snapshot;
}
