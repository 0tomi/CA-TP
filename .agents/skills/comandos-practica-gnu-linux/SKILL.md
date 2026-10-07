---
name: comandos-practica-gnu-linux
description: Allowlist compacta de comandos, utilidades y herramientas vistos o mencionados en las clases prácticas de Computación Avanzada para trabajar en GNU/Linux.
---

# Comandos permitidos de las clases prácticas

Esta skill contiene la **lista de comandos permitidos** tomados de las clases prácticas de Computación Avanzada. Se agrupan por función para que los agentes puedan reutilizarlos directamente en tareas de monitorización, diagnóstico y administración relacionadas.

## Sistema, ayuda y paquetes

Comandos generales del sistema, consulta de ayuda y gestión de paquetes mencionados en las clases.

- `shutdown`
- `reboot`
- `exit`
- `logout`
- `man`
- `apropos`
- `whereis`
- `which`
- `whatis`
- `apt`

## Directorios, archivos e información del sistema

Comandos para navegar, crear, copiar, mover y eliminar archivos/directorios, además de consultar información básica del sistema.

- `pwd`
- `ls`
- `cd`
- `lsb_release`
- `uname`
- `touch`
- `mkdir`
- `rm`
- `mv`
- `cp`

## Lectura, edición y procesamiento de texto

Comandos para mostrar, recorrer, editar o procesar contenido textual.

- `cat`
- `more`
- `less`
- `head`
- `tail`
- `nano`
- `vi`
- `wc`

## Redes

Comandos para inspección, configuración y diagnóstico de red vistos o mencionados en el material.

- `ifconfig`
- `route`
- `arp`
- `netstat`
- `ss`
- `ip`
- `ping`
- `traceroute`
- `nslookup`
- `dig`

## Usuarios, sesiones, seguridad y permisos

Comandos para consultar usuarios y sesiones o gestionar identidad, contraseñas, permisos y propietarios.

- `id`
- `last`
- `who`
- `w`
- `su`
- `passwd`
- `chmod`
- `chown`

## Monitorización de procesos y recursos

Monitores de procesos, carga, CPU, memoria y actividad general del sistema.

- `time`
- `uptime`
- `ps`
- `top`
- `vmstat`
- `free`
- `iostat`
- `sar`
- `watch`
- `pstree`
- `htop`
- `btop`
- `glances`
- `atop`
- `nmon`
- `s-tui`

## Recolección de métricas de sysstat

Herramientas y scripts mencionados para recopilar y procesar información de actividad del sistema.

- `sadc`
- `debian-sa1`
- `sa1`
- `sa2`

## Almacenamiento y entrada/salida

Comandos para espacio en disco, archivos abiertos, dispositivos y monitorización de E/S.

- `df`
- `du`
- `lsof`
- `stat`
- `hdparm`
- `iotop`
- `ioping`

## Carga y benchmark

Herramientas utilizadas en las prácticas para generar carga o evaluar rendimiento.

- `stress`
- `bonnie++`
- `bon_csv2html`
- `bon_csv2txt`

## Empaquetado y compresión

Comandos vistos para empaquetar, comprimir, verificar y extraer archivos.

- `tar`
- `gzip`
- `gunzip`
- `bzip2`
- `bunzip2`
- `7z`
- `xz`
- `unxz`
- `zip`
- `unzip`
- `unrar`

## Bash y scripting

Intérpretes, builtins y utilidades usados explícitamente en los ejemplos de scripting.

- `bash`
- `sh`
- `echo`
- `read`
- `let`
- `expr`
- `break`
- `clear`
- `seq`

## Tareas programadas

Comandos y demonios mencionados para ejecución diferida o periódica de tareas.

- `at`
- `atq`
- `atrm`
- `crontab`
- `atd`
- `cron`
- `crond`
