#!/bin/bash

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

"$BASE_DIR/monitor_cpu.sh"
"$BASE_DIR/monitor_red.sh"
"$BASE_DIR/monitor_dispositivos.sh"
"$BASE_DIR/monitor_usuarios.sh"
"$BASE_DIR/monitor_memoria.sh"
"$BASE_DIR/monitor_disco.sh"
"$BASE_DIR/monitor_servicios.sh"

exit 0
