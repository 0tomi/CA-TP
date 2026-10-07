#!/bin/bash

API="/home/USUARIO/monitores/api_mock.sh"

# vmstat: se toman dos muestras y se descarta la primera,
# porque representa promedios desde el arranque.
DATOS=$(vmstat 1 2 | tail -n 1)

$API "cpu" "$DATOS"

exit 0
