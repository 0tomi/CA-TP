#!/bin/bash
# Solo CPU o RAM; stress controla y termina sus propios workers.
error() { echo "Error: $*" >&2; exit 2; }
[[ $# == 3 ]] || error 'Uso: prueba_stress.sh cpu N SEGUNDOS | memoria NM SEGUNDOS'
tipo=$1 cantidad=$2 segundos=$3
[[ $segundos =~ ^[0-9]{1,3}$ ]] || error 'Duración entera: 1 a 300 segundos.'
segundos=$((10#$segundos))
(( segundos >= 1 && segundos <= 300 )) || error 'Duración: 1 a 300 segundos.'
case "$tipo" in
    cpu)
        [[ $cantidad =~ ^[0-9]{1,2}$ ]] || error 'CPU: 1 a 4 workers.'
        cantidad=$((10#$cantidad))
        (( cantidad >= 1 && cantidad <= 4 )) || error 'CPU: 1 a 4 workers.'
        opciones=(--cpu "$cantidad") ;;
    memoria)
        [[ $cantidad =~ ^[0-9]{1,4}M$ ]] || error 'RAM: megabytes enteros, por ejemplo 128M.'
        mb=${cantidad%M}; mb=$((10#$mb))
        (( mb >= 1 && mb <= 1024 )) || error 'RAM: 1 a 1024M.'
        disponible=0
        while read -r etiqueta total usada libre compartida cache disponible resto; do
            [[ $etiqueta == Mem: ]] && break
        done <<< "$(LC_ALL=C free -m)"
        [[ $disponible =~ ^[0-9]{1,9}$ ]] || error 'No se pudo leer RAM disponible.'
        disponible=$((10#$disponible))
        # Una sola reserva: <=25% disponible y al menos 256M de margen.
        (( mb <= disponible / 4 && disponible - mb >= 256 )) || error 'RAM insuficiente: máximo 25% disponible, dejando 256M libres.'
        opciones=(--vm 1 --vm-bytes "${mb}M" --vm-keep) ;;
    *) error 'Recurso permitido: cpu o memoria (nunca disco).' ;;
esac
command -v stress >/dev/null 2>&1 || error 'Instalar stress en la VM: sudo apt install stress'
printf 'Prueba %s: %s durante %ss; ejecutar solamente en la VM.\n' "$tipo" "$cantidad" "$segundos" >&2
# exec evita procesos huérfanos de una envoltura; stress tiene timeout y maneja
# SIGINT/SIGTERM con sus hijos. No usamos killall ni buscamos procesos ajenos.
exec stress "${opciones[@]}" --timeout "${segundos}s"
