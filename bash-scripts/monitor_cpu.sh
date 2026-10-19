#!/bin/bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

# vmstat: se toman dos muestras y se descarta la primera,
# porque representa promedios desde el arranque.
VMSTAT=$(vmstat 1 2 | tail -n 1)

# Top 5 procesos por uso de CPU (encabezado + 5 filas)
TOP_CPU=$(ps -eo pid,user,%cpu,comm --sort=-%cpu | head -n 6)

DATOS="$VMSTAT"$'\n'"$TOP_CPU"

"$DIR/api.sh" "cpu" "$DATOS"

source "$DIR/alertas.sh"
alertar_lectura cpu "$DATOS" >&2

exit 0
