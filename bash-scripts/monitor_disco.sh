#!/bin/bash

API="/home/USUARIO/monitores/api_mock.sh"

# df muestra el espacio usado de cada particion montada.
# -h: tamanios legibles (G, M); -P: una linea por particion.
# Se excluyen tmpfs/devtmpfs porque viven en RAM, no en disco.
DATOS=$(df -hP -x tmpfs -x devtmpfs)

"$API" "disco" "$DATOS"

exit 0
