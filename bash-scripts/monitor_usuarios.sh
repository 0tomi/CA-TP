#!/bin/bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
API="${API_PATH:-/home/USUARIO/monitores/api.sh}"
[ ! -f "$API" ] && API="$DIR/api.sh"
[ ! -f "$API" ] && API="$DIR/api_mock.sh"

# Muestra los usuarios conectados al sistema.
DATOS=$(who -a)

"$API" "usuarios" "$DATOS"

exit 0
