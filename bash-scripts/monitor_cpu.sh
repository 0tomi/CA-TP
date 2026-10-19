#!/bin/bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

# vmstat: se toman dos muestras y se descarta la primera,
# porque representa promedios desde el arranque.
DATOS=$(vmstat 1 2 | tail -n 1)

"$DIR/api.sh" "cpu" "$DATOS"

source "$DIR/alertas.sh"
alertar_lectura cpu "$DATOS" >&2

exit 0
