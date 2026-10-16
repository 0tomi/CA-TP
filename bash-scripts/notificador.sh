#!/bin/bash
# Un único punto de extensión: agregar otro case, no cargar plugins.
notificar() {
    local respuesta cuerpo http
    case "$ALERTAS_CANAL" in
        consola) printf '%s\n' "$1" >&2 ;;
        telegram)
            # Token por stdin (no argv), sin .curlrc, redirecciones ni diagnósticos secretos.
            respuesta=$(curl -q --silent --connect-timeout 3 --max-time 8 \
                --proto '=https' --request POST --config - \
                --data-urlencode "chat_id=$TELEGRAM_CHAT_ID" \
                --data-urlencode "text=$1" --write-out $'\n%{http_code}' \
                2>/dev/null <<CONFIG
url = "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage"
CONFIG
            ) || return 1
            http=${respuesta##*$'\n'}
            cuerpo=${respuesta%$'\n'*}
            # Fallar cerrado: aceptar el encabezado JSON habitual de Telegram, no un
            # «ok» dentro del texto del mensaje ni solamente un HTTP 200.
            [[ $http == 200 && $cuerpo =~ ^[[:space:]]*\{[[:space:]]*\"ok\"[[:space:]]*:[[:space:]]*true[[:space:]]*[,\}] ]]
            ;;
        *) return 1 ;;
    esac
}
