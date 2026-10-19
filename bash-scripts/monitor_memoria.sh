#!/bin/bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

# free -m muestra la RAM y la swap en megabytes:
# total, usada, libre y disponible para nuevos procesos.
FREE=$(free -m)

# Top 5 procesos por uso de memoria (encabezado + 5 filas)
TOP_MEM=$(ps -eo pid,user,%mem,comm --sort=-%mem | head -n 6)

DATOS="$FREE"$'\n'"$TOP_MEM"

"$DIR/api.sh" "memoria" "$DATOS"

source "$DIR/alertas.sh"
alertar_lectura memoria "$DATOS" >&2

exit 0
