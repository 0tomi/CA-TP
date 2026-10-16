#!/bin/bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
API="${API_PATH:-/home/USUARIO/monitores/api.sh}"
[ ! -f "$API" ] && API="$DIR/api.sh"
[ ! -f "$API" ] && API="$DIR/api_mock.sh"

# free -m muestra la RAM y la swap en megabytes:
# total, usada, libre y disponible para nuevos procesos.
DATOS=$(free -m)

"$API" "memoria" "$DATOS"

source "$DIR/alertas.sh"
alertar_lectura memoria "$DATOS" >&2

exit 0
