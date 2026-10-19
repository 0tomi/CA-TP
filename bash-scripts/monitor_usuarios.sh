#!/bin/bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

# Muestra los usuarios conectados al sistema.
DATOS=$(who -a)

"$DIR/api.sh" "usuarios" "$DATOS"

exit 0
