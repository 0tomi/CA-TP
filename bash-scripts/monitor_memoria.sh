#!/bin/bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

# free -m muestra la RAM y la swap en megabytes:
# total, usada, libre y disponible para nuevos procesos.
DATOS=$(free -m)

"$DIR/api.sh" "memoria" "$DATOS"

source "$DIR/alertas.sh"
alertar_lectura memoria "$DATOS" >&2

exit 0
