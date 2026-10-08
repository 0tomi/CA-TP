#!/bin/bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
API="${API_PATH:-/home/USUARIO/monitores/api.sh}"
[ ! -f "$API" ] && API="$DIR/api.sh"
[ ! -f "$API" ] && API="$DIR/api_mock.sh"

# ip -s muestra estadisticas de paquetes y bytes
# recibidos/enviados por las interfaces.
DATOS=$(ip -s address show)

"$API" "red" "$DATOS"

exit 0
