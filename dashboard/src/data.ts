export interface Cpu {
  user: number; system: number; idle: number; wait: number; steal: number
  running: number; blocked: number; swapUsedKb: number; freeMemoryKb: number
  bufferMemoryKb: number; cacheMemoryKb: number
}
export interface NetworkInterface {
  name: string; state: string; addresses: string[]; mac: string | null
  rxBytes: number; txBytes: number; rxPackets: number; txPackets: number
  rxErrors: number; txErrors: number; rxDropped: number; txDropped: number
}
export interface Device { ip: string; interface: string; mac: string | null; state: string }
export interface Session { user: string; terminal: string; loginAt: string; origin: string }
export interface Memory { totalMb: number; usedMb: number; freeMb: number; availableMb: number; swapTotalMb: number; swapUsedMb: number }
export interface Disk { filesystem: string; size: string; used: string; available: string; usePercent: number; mount: string }
export interface Service { name: string; active: boolean }
export interface Metrics {
  source: 'demo' | 'log' | 'api'; collectedAt: string; hostLabel: string; cpu: Cpu | null
  interfaces: NetworkInterface[]; devices: Device[]; sessions: Session[]
  memory: Memory | null; disks: Disk[]; services: Service[]
  history: { sample: number; usage: number }[]
  logs: { resource: string; output: string }[]; warnings: string[]
}

const demoInterfaces: NetworkInterface[] = [
  { name: 'enp0s3', state: 'UP', addresses: ['192.168.1.20/24'], mac: '08:00:27:b4:2c:18', rxBytes: 184260096, txBytes: 72624128, rxPackets: 184082, txPackets: 82246, rxErrors: 0, txErrors: 0, rxDropped: 0, txDropped: 0 },
  { name: 'lo', state: 'UNKNOWN', addresses: ['127.0.0.1/8', '::1/128'], mac: '00:00:00:00:00:00', rxBytes: 2845696, txBytes: 2845696, rxPackets: 12376, txPackets: 12376, rxErrors: 0, txErrors: 0, rxDropped: 0, txDropped: 0 },
]
const demoDevices: Device[] = [
  { ip: '192.168.1.1', interface: 'enp0s3', mac: 'a4:2b:b0:19:32:01', state: 'REACHABLE' },
  { ip: '192.168.1.12', interface: 'enp0s3', mac: 'e0:d5:5e:4c:21:0a', state: 'REACHABLE' },
  { ip: '192.168.1.34', interface: 'enp0s3', mac: '08:00:27:ae:8f:14', state: 'STALE' },
  { ip: '192.168.1.45', interface: 'enp0s3', mac: '98:fa:9b:72:40:8e', state: 'REACHABLE' },
  { ip: '192.168.1.67', interface: 'enp0s3', mac: 'b8:27:eb:90:12:6b', state: 'STALE' },
  { ip: '192.168.1.80', interface: 'enp0s3', mac: '3c:52:82:11:a7:0c', state: 'REACHABLE' },
]
const demoSessions: Session[] = [
  { user: 'gime', terminal: 'pts/0', loginAt: '2026-10-07 09:14', origin: '192.168.1.12' },
  { user: 'debian', terminal: 'tty1', loginAt: '2026-10-07 08:30', origin: 'Local' },
  { user: 'admin', terminal: 'pts/1', loginAt: '2026-10-07 09:42', origin: '192.168.1.45' },
]
const demoDisks: Disk[] = [
  { filesystem: '/dev/sda1', size: '29G', used: '7.4G', available: '20G', usePercent: 27, mount: '/' },
  { filesystem: '/dev/sda3', size: '9.8G', used: '8.2G', available: '1.1G', usePercent: 89, mount: '/home' },
]
const demoServices: Service[] = [{ name: 'cron', active: true }, { name: 'sshd', active: true }]
export const demoData: Metrics = {
  source: 'demo', collectedAt: '2026-10-07T13:00:00.000Z', hostLabel: 'debian-lab',
  cpu: { user: 18, system: 8, idle: 74, wait: 0, steal: 0, running: 2, blocked: 0, swapUsedKb: 0, freeMemoryKb: 2843000, bufferMemoryKb: 126300, cacheMemoryKb: 1452800 },
  interfaces: demoInterfaces, devices: demoDevices, sessions: demoSessions,
  memory: { totalMb: 3916, usedMb: 1180, freeMb: 1240, availableMb: 2552, swapTotalMb: 1023, swapUsedMb: 0 },
  disks: demoDisks, services: demoServices,
  history: Array.from({ length: 100 }, (_, index) => ({ sample: index + 1, usage: [12, 15, 18, 16, 17, 24, 22, 20, 28, 23, 25, 26][index % 12] })),
  logs: [
    { resource: 'cpu', output: 'procs -----------memory---------- ---swap-- -----io---- -system-- -------cpu-------\n r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st\n 2  0      0 2843000 126300 1452800   0    0     0     8  312  421 18  8 74  0  0' },
    { resource: 'red', output: '1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN\n    inet 127.0.0.1/8 scope host lo\n    RX: bytes packets errors dropped\n        2845696 12376 0 0\n    TX: bytes packets errors dropped\n        2845696 12376 0 0\n2: enp0s3: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP\n    link/ether 08:00:27:b4:2c:18\n    inet 192.168.1.20/24 scope global enp0s3\n    RX: bytes packets errors dropped\n        184260096 184082 0 0\n    TX: bytes packets errors dropped\n        72624128 82246 0 0' },
    { resource: 'dispositivos_red', output: demoDevices.map(device => `${device.ip} dev ${device.interface} lladdr ${device.mac} ${device.state}`).join('\n') },
    { resource: 'usuarios', output: demoSessions.map(session => `${session.user.padEnd(9)} ${session.terminal.padEnd(7)} ${session.loginAt} (${session.origin})`).join('\n') },
    { resource: 'memoria', output: '               total        used        free      shared  buff/cache   available\nMem:            3916        1180        1240          18        1496        2552\nSwap:           1023           0        1023' },
    { resource: 'disco', output: ['Filesystem      Size  Used Avail Use% Mounted on', ...demoDisks.map(disk => `${disk.filesystem.padEnd(15)} ${disk.size.padStart(4)} ${disk.used.padStart(5)} ${disk.available.padStart(5)} ${`${disk.usePercent}%`.padStart(4)} ${disk.mount}`)].join('\n') },
    { resource: 'servicios', output: demoServices.map(service => `${service.name} ${service.active ? 'activo' : 'inactivo'}`).join('\n') },
  ], warnings: [],
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return 'Sin dato'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KiB', 'MiB', 'GiB', 'TiB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)) - 1, units.length - 1)
  return `${(bytes / 1024 ** (index + 1)).toLocaleString('es-AR', { maximumFractionDigits: 1 })} ${units[index]}`
}
export function percentage(value: number | undefined) { return value === undefined || !Number.isFinite(value) ? '—' : `${value.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%` }
export function readableDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Sin fecha de toma' : date.toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })
}
export function interfaceActive(item: NetworkInterface) { return item.state === 'UP' || (item.name === 'lo' && item.addresses.length > 0) }
export function validateMetrics(value: unknown): Metrics {
  if (!value || typeof value !== 'object') throw new Error('La respuesta no contiene métricas válidas.')
  const data = value as Metrics
  if (!['demo', 'log', 'api'].includes(data.source) || typeof data.collectedAt !== 'string' || typeof data.hostLabel !== 'string' || !['interfaces', 'devices', 'sessions', 'history', 'logs', 'warnings'].every(key => Array.isArray((data as unknown as Record<string, unknown>)[key]))) throw new Error('La respuesta no coincide con el formato de métricas del TP.')
  const numeric = (entry: unknown) => typeof entry === 'number' && Number.isFinite(entry) && entry >= 0
  const strings = (entry: unknown) => Array.isArray(entry) && entry.every(item => typeof item === 'string')
  if (data.cpu !== null && (!data.cpu || !['user', 'system', 'idle', 'wait', 'steal', 'running', 'blocked', 'swapUsedKb', 'freeMemoryKb', 'bufferMemoryKb', 'cacheMemoryKb'].every(key => numeric((data.cpu as unknown as Record<string, unknown>)[key])))) throw new Error('Los datos del procesador están incompletos.')
  if (data.interfaces.some(item => !item || typeof item.name !== 'string' || typeof item.state !== 'string' || !strings(item.addresses) || (item.mac !== null && typeof item.mac !== 'string') || !['rxBytes', 'txBytes', 'rxPackets', 'txPackets', 'rxErrors', 'txErrors', 'rxDropped', 'txDropped'].every(key => numeric((item as unknown as Record<string, unknown>)[key])))) throw new Error('Los datos de las interfaces están incompletos.')
  if (data.devices.some(item => !item || !['ip', 'interface', 'state'].every(key => typeof (item as unknown as Record<string, unknown>)[key] === 'string') || (item.mac !== null && typeof item.mac !== 'string'))) throw new Error('Los datos de los vecinos de red están incompletos.')
  if (data.sessions.some(item => !item || !['user', 'terminal', 'loginAt', 'origin'].every(key => typeof (item as unknown as Record<string, unknown>)[key] === 'string'))) throw new Error('Los datos de las sesiones están incompletos.')
  if (data.history.some(item => !item || !numeric(item.sample) || !numeric(item.usage)) || data.logs.some(item => !item || typeof item.resource !== 'string' || typeof item.output !== 'string') || !strings(data.warnings)) throw new Error('El histórico o los registros tienen un formato inválido.')
  data.memory ??= null; data.disks ??= []; data.services ??= []
  if (data.memory !== null && (typeof data.memory !== 'object' || !['totalMb', 'usedMb', 'freeMb', 'availableMb', 'swapTotalMb', 'swapUsedMb'].every(key => numeric((data.memory as unknown as Record<string, unknown>)[key])))) throw new Error('Los datos de memoria están incompletos.')
  if (!Array.isArray(data.disks) || data.disks.some(item => !item || !['filesystem', 'size', 'used', 'available', 'mount'].every(key => typeof (item as unknown as Record<string, unknown>)[key] === 'string') || !numeric(item.usePercent))) throw new Error('Los datos de las particiones están incompletos.')
  if (!Array.isArray(data.services) || data.services.some(item => !item || typeof item.name !== 'string' || typeof item.active !== 'boolean')) throw new Error('Los datos de los servicios están incompletos.')
  return data
}
