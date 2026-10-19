#!/bin/bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

# ip -s muestra estadisticas de paquetes y bytes
# recibidos/enviados por las interfaces.
DATOS=$(ip -s address show)

"$DIR/api.sh" "red" "$DATOS"

exit 0
