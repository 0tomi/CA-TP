#!/bin/bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
API="${API_PATH:-/home/USUARIO/monitores/api.sh}"
[ ! -f "$API" ] && API="$DIR/api.sh"
[ ! -f "$API" ] && API="$DIR/api_mock.sh"

# Muestra los vecinos conocidos por el sistema.
# No es un escaneo completo de toda la red.
DATOS=$(ip neigh show)

"$API" "dispositivos_red" "$DATOS"

exit 0
