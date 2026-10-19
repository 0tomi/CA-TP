#!/bin/bash
# Sin red ni carga: todos los comandos que miden/estresan/envían se simulan.
set -euo pipefail
DIR=$(cd "${BASH_SOURCE[0]%/*}/.." && pwd)
TMP=$(mktemp -d)
trap 'rm -rf -- "$TMP"' EXIT
mkdir "$TMP/bin"
export PATH="$TMP/bin:$PATH" ALERTAS_CONFIG="$TMP/inexistente"
export ALERTAS_HABILITADAS=1 ALERTAS_CANAL=consola ALERTAS_ESTADO_DIR="$TMP/estado"
source "$DIR/alertas.sh"
fallo() { echo "FALLO: $*" >&2; exit 1; }
igual() { [[ $1 == "$2" ]] || fallo "$3: [$1] != [$2]"; }
aviso() { alerta_porcentaje "$@" 2>"$TMP/aviso"; }
silencio() { aviso "$@"; [[ ! -s $TMP/aviso ]] || fallo "Aviso inesperado: $*"; }
nivel() { aviso "$@"; [[ $(cat "$TMP/aviso") == *": $ESPERADO,"* ]] || fallo "Nivel $ESPERADO: $*"; }
# Umbrales inclusivos, repeticiones, escalada, descenso y recuperación.
silencio cpu 49
ESPERADO=amarillo nivel cpu 50
silencio cpu 79
ESPERADO=rojo nivel cpu 80
silencio cpu 80
ESPERADO=amarillo nivel cpu 79
ESPERADO=normal nivel cpu 49
silencio cpu 0
# Subsiguientes procesos comparten el mismo estado; recursos independientes.
bash -c 'source "$1/alertas.sh"; alerta_porcentaje cpu 49' _ "$DIR" 2>"$TMP/aviso"
[[ ! -s $TMP/aviso ]] || fallo 'Persistencia entre procesos'
silencio memoria 69
ESPERADO=amarillo nivel memoria 70
silencio memoria 89
ESPERADO=rojo nivel memoria 90
silencio disco 79 '/dev/a:/mnt/a b'
ESPERADO=amarillo nivel disco 80 '/dev/a:/mnt/a b'
silencio disco 89 '/dev/a:/mnt/a b'
ESPERADO=rojo nivel disco 90 '/dev/a:/mnt/a_b'
silencio disco 80 '/dev/a:/mnt/a b'
CPU_AMARILLO=60 CPU_ROJO=95 silencio cpu 50
CPU_AMARILLO=60 CPU_ROJO=95 ESPERADO=rojo nivel cpu 95
ESPERADO=normal nivel cpu 0
if CPU_AMARILLO=90 CPU_ROJO=50 aviso cpu 60; then fallo 'Aceptó umbrales invertidos'; fi
if aviso cpu '1+99'; then fallo 'Aceptó expresión aritmética'; fi
ALERTAS_HABILITADAS=0 silencio cpu 99
ALERTAS_CANAL=telegram TELEGRAM_BOT_TOKEN='' aviso cpu 80 && fallo 'Aceptó Telegram sin configurar'
igual "$(cat "$TMP/estado/consola/cpu-general.estado")" normal 'No debe modificar estado real al fallar'

# Configuración cargada incluso sin herencia de variables de una terminal.
printf '%s\n' 'ALERTAS_HABILITADAS=0' > "$TMP/local.conf"
ALERTAS_CONFIG="$TMP/local.conf" silencio cpu 99
printf '%s\n' 'ALERTAS_HABILITADAS=1' 'CPU_AMARILLO=55' 'CPU_ROJO=85' > "$TMP/local.conf"
ALERTAS_HABILITADAS=0 ALERTAS_CONFIG="$TMP/local.conf" silencio cpu 54
ALERTAS_HABILITADAS=0 ALERTAS_CONFIG="$TMP/local.conf" ESPERADO=amarillo nivel cpu 55
ESPERADO=normal nivel cpu 0

# Stub curl: registra opciones y stdin; nunca sale a Internet.
cat > "$TMP/bin/curl" <<'STUB'
#!/bin/bash
printf '%s\n' "$@" > "$PRUEBA_TMP/curl.args"
echo envio >> "$PRUEBA_TMP/envios"
[[ "$*" == *--config* ]] && cat > "$PRUEBA_TMP/curl.stdin"
case "${CURL_MODO:-ok}" in
    lento) touch "$PRUEBA_TMP/enviando"; sleep 0.3; printf '{"ok":true,"result":{}}\n200' ;;
    fallo) echo 'diagnóstico con TOKEN que no debe mostrarse' >&2; exit 7 ;;
    api) printf '{"ok":false,"description":"falló"}\n200' ;;
    http) printf '{"ok":true,"result":{}}\n500' ;;
    anidado) printf '{"result":{"ok":true}}\n200' ;;
    *) printf '{"ok":true,"result":{}}\n200' ;;
esac
STUB
chmod +x "$TMP/bin/curl"
export PRUEBA_TMP="$TMP" TELEGRAM_BOT_TOKEN='123:SOLO_PRUEBA' TELEGRAM_CHAT_ID=456
export ALERTAS_CANAL=telegram
for modo in fallo api http anidado; do
    export CURL_MODO=$modo
    if aviso cpu 80; then fallo "Aceptó fallo de envío $modo"; fi
    [[ ! -e $TMP/estado/telegram-456/cpu-general.estado ]] || fallo 'Fallo registrado como enviado'
    [[ $(cat "$TMP/aviso") != *TOKEN* && $(cat "$TMP/aviso") != *SOLO_PRUEBA* ]] || fallo 'Filtró token/diagnóstico'
done
# Sin alerta entregada, recuperarse no envía normal ni toca curl.
rm "$TMP/curl.args"
silencio cpu 0
[[ ! -e $TMP/curl.args ]] || fallo 'Recuperación de alerta nunca entregada'
export CURL_MODO=ok
aviso cpu 50
igual "$(cat "$TMP/estado/telegram-456/cpu-general.estado")" amarillo 'Estado entregado'
args=$(cat "$TMP/curl.args")
[[ $args == *--connect-timeout* && $args == *--max-time* && $args == *--data-urlencode* ]] || fallo 'curl sin límites/codificación'
[[ $args != *SOLO_PRUEBA* && $(cat "$TMP/curl.stdin") == *SOLO_PRUEBA* ]] || fallo 'Token en argv o ausente de stdin'
CURL_MODO=fallo aviso cpu 80 && fallo 'Escalada fallida aceptada'
igual "$(cat "$TMP/estado/telegram-456/cpu-general.estado")" amarillo 'Preservar último entregado'
aviso cpu 0
igual "$(cat "$TMP/estado/telegram-456/cpu-general.estado")" normal 'Recuperar después de escalada fallida'
CURL_MODO=fallo aviso cpu 80 && fallo 'Falló stub'
aviso cpu 80
igual "$(cat "$TMP/estado/telegram-456/cpu-general.estado")" rojo 'Reintento exitoso'
CURL_MODO=fallo aviso cpu 0 && fallo 'Recuperación fallida aceptada'
igual "$(cat "$TMP/estado/telegram-456/cpu-general.estado")" rojo 'Recuperación pendiente'
aviso cpu 0
rm "$TMP/curl.args"
silencio cpu 0
[[ ! -e $TMP/curl.args ]] || fallo 'Reenvió mismo nivel'
# Consola no suprime el primer aviso Telegram de otro recurso/chat.
ALERTAS_CANAL=consola ESPERADO=rojo nivel cpu 80
aviso cpu 80
igual "$(cat "$TMP/estado/telegram-456/cpu-general.estado")" rojo 'Consola no comparte estado'
TELEGRAM_CHAT_ID=789 aviso cpu 80
[[ -f $TMP/estado/telegram-789/cpu-general.estado ]] || fallo 'Chats comparten estado'
# Lock ocupado: no enviar ni eliminar un lock ajeno; liberarlo permite reintento.
mkdir "$TMP/estado/telegram-456/cpu-general.estado.lock"
silencio cpu 0
[[ -d $TMP/estado/telegram-456/cpu-general.estado.lock ]] || fallo 'Eliminó lock ajeno'
rm -r "$TMP/estado/telegram-456/cpu-general.estado.lock"
aviso cpu 0
[[ ! -d $TMP/estado/telegram-456/cpu-general.estado.lock ]] || fallo 'No limpió lock'

# Dos procesos: uno mantiene el lock durante el envío; el otro no lo pisa.
rm -f "$TMP/enviando"
: > "$TMP/envios"
CURL_MODO=lento alerta_porcentaje cpu 80 2>"$TMP/concurrente" &
pid=$!
for ((i=0; i<100; i++)); do
    [[ -f $TMP/enviando ]] && break
    sleep 0.01
done
[[ -f $TMP/enviando ]] || fallo 'No comenzó el envío simulado'
silencio cpu 80
wait "$pid"
igual "$(cat "$TMP/envios")" envio 'Un solo envío concurrente'
igual "$(cat "$TMP/estado/telegram-456/cpu-general.estado")" rojo 'Estado concurrente íntegro'

# Mediciones deterministas; se conservan payloads y se llama una vez a cada comando.
cat > "$TMP/bin/vmstat" <<'STUB'
#!/bin/bash
echo vmstat >> "$PRUEBA_TMP/mediciones"
echo encabezado
cat "$PRUEBA_TMP/cpu"
STUB
cat > "$TMP/bin/free" <<'STUB'
#!/bin/bash
echo free >> "$PRUEBA_TMP/mediciones"
cat "$PRUEBA_TMP/memoria"
STUB
cat > "$TMP/bin/df" <<'STUB'
#!/bin/bash
echo df >> "$PRUEBA_TMP/mediciones"
cat "$PRUEBA_TMP/disco"
STUB
chmod +x "$TMP/bin/"{vmstat,free,df}
printf '%s\n' '2 0 0 1812040 62412 2193432 0 0 0 12 120 300 16 4 80 0 0' > "$TMP/cpu"
printf '%s\n' ' total used free shared buff/cache available' 'Mem: 2048 128 1024 0 896 1920' 'Swap: 1024 0 1024' > "$TMP/memoria"
printf '%s\n' 'Filesystem Size Used Avail Use% Mounted on' '/dev/a 10G 9G 1G 90% /' '/dev/b 10G 8G 2G 80% /media/disco externo' > "$TMP/disco"
export CURL_MODO=fallo ALERTAS_CANAL=consola
for recurso in cpu memoria disco; do
    : > "$TMP/mediciones"
    for habilitado in 0 1; do
        ALERTAS_HABILITADAS=$habilitado bash "$DIR/monitor_$recurso.sh" > "$TMP/salida" 2> "$TMP/avisos"
        igual "$(cat "$TMP/salida")" "$(printf '=== API MOCK ===\nRecurso: %s\n%s\n================' "$recurso" "$(cat "$TMP/$recurso")")" "Payload $recurso"
    done
    igual "$(wc -l < "$TMP/mediciones" | tr -d ' ')" 2 "Una medición por ejecución de $recurso"
done
# Misma localización española que soporta el dashboard.
alertar_lectura memoria $'Mem.: 100 90 5 0 5 10\nInter: 10 0 10' 2>"$TMP/aviso"
[[ $(cat "$TMP/aviso") == *': rojo,'* ]] || fallo 'RAM traducida'

# Stress SIEMPRE simulado (también free); probar validación sin carga real.
cat > "$TMP/bin/stress" <<'STUB'
#!/bin/bash
printf '%s\n' "$@" > "$PRUEBA_TMP/stress.args"
echo "$$" > "$PRUEBA_TMP/stress.pid"
STUB
chmod +x "$TMP/bin/stress"
bash "$DIR/prueba_stress.sh" cpu 1 60 2>/dev/null
igual "$(cat "$TMP/stress.args")" $'--cpu\n1\n--timeout\n60s' 'CPU acotada'
bash "$DIR/prueba_stress.sh" cpu 1 60 2>/dev/null &
pid=$!
wait "$pid"
igual "$(cat "$TMP/stress.pid")" "$pid" 'exec entrega el mismo PID a stress'
bash "$DIR/prueba_stress.sh" memoria 128M 60 2>/dev/null
igual "$(cat "$TMP/stress.args")" $'--vm\n1\n--vm-bytes\n128M\n--vm-keep\n--timeout\n60s' 'Una reserva RAM con timeout'
rechazar() {
    rm -f "$TMP/stress.args"
    if bash "$DIR/prueba_stress.sh" "$@" 2>/dev/null; then fallo "Argumentos aceptados: $*"; fi
    [[ ! -e $TMP/stress.args ]] || fallo 'Lanzó stress antes de validar'
}
rechazar
rechazar cpu 0 60
rechazar cpu 5 60
rechazar cpu 1 0
rechazar cpu 1 301
rechazar cpu 1 -1
rechazar cpu 1 '1+1'
rechazar cpu 1 60 extra
rechazar disco 128M 60
rechazar memoria 10% 60
rechazar memoria 0M 60
rechazar memoria 2048M 60
rechazar memoria 512M 60  # >25% de 1920M disponibles
printf '%s\n' 'Mem: 512 200 200 0 112 300' > "$TMP/memoria"
rechazar memoria 64M 60  # deja menos de 256M
printf '%s\n' 'Mem: lectura inválida' > "$TMP/memoria"
rechazar memoria 1M 60
printf 'OK: umbrales, transiciones, fallos/reintentos, transportes, locks, payloads y stress simulado.\n'
