#!/bin/bash

API="/home/USUARIO/monitores/api_mock.sh"

# ip -s muestra estadisticas de paquetes y bytes
# recibidos/enviados por las interfaces.
DATOS=$(ip -s address show)

$API "red" "$DATOS"

exit 0
