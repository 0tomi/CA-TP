export const cpuOutput = (idle = 74) => `2 0 0 1812040 62412 2193432 0 0 0 12 120 300 ${100 - idle - 6} 4 ${idle} 2 0`;

export const networkOutput = `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
    inet6 ::1/128 scope host
    RX:  bytes packets errors dropped  missed   mcast
         14400     120      0       0       0       0
    TX:  bytes packets errors dropped carrier collsns
         14400     120      0       0       0       0
2: enp0s3@if5: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether 08:00:27:16:ad:42 brd ff:ff:ff:ff:ff:ff
    inet 192.168.1.24/24 brd 192.168.1.255 scope global enp0s3
    inet6 fe80::a00:27ff:fe16:ad42/64 scope link
    RX:  bytes packets errors dropped  missed   mcast
     125000000  100000      3       4       0       8
    TX:  bytes packets errors dropped carrier collsns
      48000000   64000      1       2       0       0`;

export const neighborsOutput = `192.168.1.1 dev enp0s3 lladdr 08:00:27:00:00:01 REACHABLE
192.168.1.99 dev enp0s3 FAILED
fe80::2 dev enp0s3 INCOMPLETE
192.168.1.40 dev enp0s3 lladdr 08:00:27:00:00:40 STALE`;

export const sessionsOutput = `           system boot  2026-10-07 09:00
           run-level 5  2026-10-07 09:00
LOGIN      tty1         2026-10-07 09:00              432 id=tty1
           .           tty2         2026-10-07 09:01              433 id=tty2 term=0 exit=0
gime       + pts/0      2026-10-07 09:10   .          501 (192.168.1.8)
julian     - tty3       2026-10-07 10:20  00:03       601
ana          pts/1      Oct 7 11:12      .           701 (laptop.local)`;

export function block(resource, output) {
  return `=== API MOCK ===\nRecurso: ${resource}\n${output}\n================\n`;
}

export function completeCycle(idle = 74) {
  return block('cpu', cpuOutput(idle)) + block('red', networkOutput)
    + block('dispositivos_red', neighborsOutput) + block('usuarios', sessionsOutput);
}
