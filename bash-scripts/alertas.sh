#!/bin/bash
# Se carga desde los monitores; nunca cambia DATOS ni la salida de la API.
source "${BASH_SOURCE[0]%/*}/notificador.sh"

alerta_porcentaje() (
    # Subshell: configuración, umask y traps no alteran el monitor llamante.
    local recurso=$1 valor=$2 identidad=${3:-general} amarillo rojo nivel=normal
    local anterior=normal clave archivo bloqueo base config
    config=${ALERTAS_CONFIG:-${BASH_SOURCE[0]%/*}/alertas.local.conf}
    if [[ -e $config ]]; then
        [[ -r $config ]] && source "$config" || { echo 'Alertas: configuración ilegible.' >&2; return 1; }
    fi
    [[ ${ALERTAS_HABILITADAS:-0} == 1 ]] || return 0
    ALERTAS_CANAL=${ALERTAS_CANAL:-consola}
    case "$ALERTAS_CANAL" in
        consola) clave=consola ;;
        telegram)
            [[ ${TELEGRAM_BOT_TOKEN:-} =~ ^[0-9]+:[A-Za-z0-9_-]+$ && ${TELEGRAM_CHAT_ID:-} =~ ^-?[0-9]+$ ]] || {
                echo 'Alertas: Telegram sin token/chat_id válido; monitor continúa.' >&2; return 1;
            }
            clave="telegram-$TELEGRAM_CHAT_ID" ;;
        *) echo 'Alertas: canal desconocido.' >&2; return 1 ;;
    esac
    case "$recurso" in
        cpu) amarillo=${CPU_AMARILLO:-50}; rojo=${CPU_ROJO:-80} ;;
        memoria) amarillo=${MEMORIA_AMARILLO:-70}; rojo=${MEMORIA_ROJO:-90} ;;
        disco) amarillo=${DISCO_AMARILLO:-80}; rojo=${DISCO_ROJO:-90} ;;
        *) return 1 ;;
    esac
    # Validar ANTES de aritmética; limitar longitud y forzar base decimal.
    [[ $valor =~ ^[0-9]{1,3}$ && $amarillo =~ ^[0-9]{1,3}$ && $rojo =~ ^[0-9]{1,3}$ ]] || return 1
    valor=$((10#$valor)); amarillo=$((10#$amarillo)); rojo=$((10#$rojo))
    (( valor <= 100 && amarillo < rojo && rojo <= 100 )) || { echo 'Alertas: umbrales inválidos.' >&2; return 1; }
    (( valor >= amarillo )) && nivel=amarillo
    (( valor >= rojo )) && nivel=rojo
    # Codificación reversible: /home/a y /home_a no comparten estado.
    identidad=${identidad//%/%25}; identidad=${identidad//\//%2F}
    base=${ALERTAS_ESTADO_DIR:-${HOME:?}/.local/state/ca-tp-alertas}/$clave
    umask 077
    mkdir -p -- "$base" || return 1
    archivo="$base/$recurso-$identidad.estado"
    bloqueo="$archivo.lock"
    # Un cron concurrente omite solo esta clave. No borrar locks de otros procesos.
    if ! mkdir -- "$bloqueo" 2>/dev/null; then
        [[ -d $bloqueo ]] || echo 'Alertas: no se pudo crear el bloqueo de estado.' >&2
        return 0
    fi
    trap 'rm -rf -- "$bloqueo"' EXIT
    trap 'exit 1' HUP INT TERM
    if [[ -f $archivo ]]; then
        read -r anterior < "$archivo" || return 1
        case "$anterior" in normal|amarillo|rojo) ;; *) echo 'Alertas: estado inválido.' >&2; return 1 ;; esac
    fi
    [[ $nivel == "$anterior" ]] && return 0
    if notificar "${HOSTNAME:-Debian} | $recurso (${3:-general}): $nivel, $valor% (antes: $anterior)"; then
        # Escritura atómica bajo lock: jamás registrar como entregado un fallo.
        printf '%s\n' "$nivel" > "$bloqueo/nuevo" && mv -- "$bloqueo/nuevo" "$archivo"
    else
        echo 'Alertas: envío no confirmado; se reintentará en la próxima lectura.' >&2
        return 1
    fi
)

alertar_lectura() {
    local recurso=$1 datos=$2 etiqueta total usada resto sistema tam libre porcentaje montaje
    local -a columnas
    case "$recurso" in
        cpu)
            read -r -a columnas <<< "$datos"
            [[ ${columnas[14]:-} =~ ^[0-9]{1,3}$ ]] || return 0
            (( 10#${columnas[14]} <= 100 )) || return 0
            alerta_porcentaje cpu "$((100 - 10#${columnas[14]}))" || : ;;
        memoria)
            while read -r etiqueta total usada resto; do
                [[ $etiqueta == Mem* && $total =~ ^[0-9]{1,9}$ && $usada =~ ^[0-9]{1,9}$ ]] || continue
                (( 10#$total > 0 && 10#$usada <= 10#$total )) || continue
                alerta_porcentaje memoria "$((10#$usada * 100 / 10#$total))" || :
                break
            done <<< "$datos" ;;
        disco)
            while read -r sistema tam usada libre porcentaje montaje; do
                [[ $porcentaje =~ ^[0-9]{1,3}%$ && -n $montaje ]] || continue
                # Montaje + filesystem: dos particiones o reemplazos no se pisan.
                alerta_porcentaje disco "${porcentaje%\%}" "${#sistema}:$sistema:$montaje" || :
            done <<< "$datos" ;;
    esac
    return 0
}
