#!/bin/bash

API="/home/USUARIO/monitores/api_mock.sh"

# Muestra los vecinos conocidos por el sistema.
# No es un escaneo completo de toda la red.
DATOS=$(ip neigh show)

$API "dispositivos_red" "$DATOS"

exit 0
