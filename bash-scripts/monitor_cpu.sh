#!/bin/bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
API="${API_PATH:-/home/USUARIO/monitores/api.sh}"
[ ! -f "$API" ] && API="$DIR/api.sh"
[ ! -f "$API" ] && API="$DIR/api_mock.sh"

# vmstat: se toman dos muestras y se descarta la primera,
# porque representa promedios desde el arranque.
DATOS=$(vmstat 1 2 | tail -n 1)

"$API" "cpu" "$DATOS"

exit 0
