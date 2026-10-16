---
name: comandos-practica-gnu-linux
description: Repertorio de comandos de GNU/Linux vistos o mencionados en las clases prácticas 1 a 7 de Computación Avanzada, incluidos monitoreo, generación de carga y benchmarking.
---

# Repertorio de comandos — Computación Avanzada (Práctica)

Lista agrupada de comandos incluidos en el material de las clases prácticas de GNU/Linux.

## Ayuda y localización de comandos
Consulta de documentación, descripciones y ubicaciones de ejecutables.

`man`, `apropos`, `whereis`, `which`, `whatis`

## Sistema y sesiones
Estado e identificación del sistema, apagado, reinicio y finalización de sesiones.

`lsb_release`, `uname`, `uptime`, `shutdown`, `reboot`, `exit`, `logout`

## Archivos y directorios
Navegación y operaciones sobre archivos y directorios.

`pwd`, `ls`, `cd`, `touch`, `mkdir`, `rm`, `mv`, `cp`

## Visualización y edición de archivos
Lectura, paginación, inspección y edición de archivos de texto.

`cat`, `more`, `less`, `head`, `tail`, `nano`, `vi`

## Usuarios, sesiones y permisos
Consulta de usuarios conectados, historial de sesiones, identidad y administración de permisos.

`id`, `last`, `who`, `w`, `su`, `passwd`, `chmod`, `chown`

## Redes
Consulta de interfaces, rutas, vecinos, conexiones y resolución de nombres.

`ifconfig`, `route`, `arp`, `netstat`, `ip`, `ss`, `ping`, `traceroute`, `nslookup`, `dig`

Subcomandos citados: `ip address show`, `ip route show`, `ip neigh show`, `ip maddr`.

## Procesos y monitoreo interactivo
Estado, jerarquía, seguimiento y uso de recursos por procesos.

`ps`, `top`, `pstree`, `htop`, `btop`, `glances`, `atop`, `nmon`, `watch`, `time`

## CPU, memoria, actividad y estadísticas históricas
Medición de carga, memoria, CPU y actividad del sistema; recopilación de estadísticas.

`vmstat`, `free`, `iostat`, `sar`, `sadc`, `sa1`, `sa2`, `debian-sa1`

## Discos, archivos abiertos y E/S
Espacio, metadatos, descriptores, actividad y latencia de dispositivos de almacenamiento.

`df`, `du`, `lsof`, `stat`, `hdparm`, `iotop`, `ioping`

## Estrés del sistema y benchmarking
Generación de carga de CPU, RAM, E/S y disco; pruebas de rendimiento y presentación de resultados.

- `stress` — carga de CPU (`--cpu`), memoria (`--vm`, `--vm-bytes`), E/S (`--io`) y disco (`--hdd`, `--hdd-bytes`); duración (`--timeout`).
- `bonnie++` — pruebas de rendimiento de discos y sistemas de archivos.
- `s-tui` — monitoreo de CPU con integración con `stress`.
- `bon_csv2html`, `bon_csv2txt` — transformación de resultados CSV de Bonnie++.

## Empaquetado y compresión
Creación, prueba, extracción y descompresión de archivos y paquetes.

`tar`, `gzip`, `gunzip`, `bzip2`, `bunzip2`, `7z`, `xz`, `unxz`, `zip`, `unzip`, `unrar`

## Bash y utilidades empleadas en scripts
Intérprete, entrada/salida, aritmética, conteo, secuencias y control de ejecución.

`bash`, `echo`, `read`, `let`, `expr`, `wc`, `seq`, `clear`, `break`

Construcciones de Bash vistas en clase: `if`, `case`, `select`, `for`, `while`, `until`, `function`, `[ ... ]`.

## Programación de tareas
Tareas únicas y recurrentes, y consulta o eliminación de trabajos programados.

`at`, `atq`, `atrm`, `crontab`

Servicios mencionados: `atd`, `cron`/`crond`.

## Instalación de paquetes
Instalación de herramientas adicionales citadas en las clases.

`apt` (`apt install`)
