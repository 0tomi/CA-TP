#!/bin/bash

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

# Nombres de los procesos a comprobar (separados por espacios).
SERVICIOS="cron sshd"

# ps -C busca procesos por nombre; si no encuentra ninguno
# termina con error, y eso indica que el servicio no esta corriendo.
DATOS=$(for SERVICIO in $SERVICIOS; do
    if ps -C "$SERVICIO" > /dev/null; then
        echo "$SERVICIO activo"
    else
        echo "$SERVICIO inactivo"
    fi
done)

"$DIR/api.sh" "servicios" "$DATOS"

exit 0
