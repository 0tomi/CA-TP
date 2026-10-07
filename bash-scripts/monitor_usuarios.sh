#!/bin/bash

API="/home/USUARIO/monitores/api_mock.sh"

# Muestra los usuarios conectados al sistema.
DATOS=$(who -a)

$API "usuarios" "$DATOS"

exit 0
