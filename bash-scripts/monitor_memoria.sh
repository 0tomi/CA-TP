#!/bin/bash

API="/home/USUARIO/monitores/api_mock.sh"

# free -m muestra la RAM y la swap en megabytes:
# total, usada, libre y disponible para nuevos procesos.
DATOS=$(free -m)

"$API" "memoria" "$DATOS"

exit 0
