#!/bin/bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

# Muestra los vecinos conocidos por el sistema.
# No es un escaneo completo de toda la red.
DATOS=$(ip neigh show)

"$DIR/api.sh" "dispositivos_red" "$DATOS"

exit 0
