#!/bin/bash
# Envio real a la API de monitorización.
# En modo NAT (VirtualBox), la PC anfitriona es accesible en 10.0.2.2.
API_HOST="${API_HOST:-http://10.0.2.2:8787}"
API_HOST="${API_HOST%/}"
RECURSO=$1
DATOS=$2

# Intenta enviar a la API; si falla, mantiene la salida para cron.log
if ! curl -sf --connect-timeout 2 --max-time 5 -X POST \
     -H "Content-Type: text/plain" \
     --data-binary "$DATOS" \
     "$API_HOST/api/ingest/$RECURSO" > /dev/null 2>&1; then
    echo "=== API MOCK ==="
    echo "Recurso: $RECURSO"
    echo "$DATOS"
    echo "================"
fi

exit 0
