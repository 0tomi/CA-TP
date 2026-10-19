#!/bin/bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

# df muestra el espacio usado de cada particion montada.
# -h: tamanios legibles (G, M); -P: una linea por particion.
# Se excluyen tmpfs/devtmpfs porque viven en RAM, no en disco.
DATOS=$(df -hP -x tmpfs -x devtmpfs)

"$DIR/api.sh" "disco" "$DATOS"

source "$DIR/alertas.sh"
alertar_lectura disco "$DATOS" >&2

exit 0
