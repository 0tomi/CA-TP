#!/bin/bash

# Modulo mock de envio a API.
# Mas adelante, esta funcion puede reemplazarse por la llamada real al endpoint.

enviar_api() {
    RECURSO=$1
    DATOS=$2

    echo "=== API MOCK ==="
    echo "Recurso: $RECURSO"
    echo "$DATOS"
    echo "================"
}

enviar_api "$1" "$2"

exit 0
