#!/bin/bash
# Solo CPU o RAM; stress controla y termina sus propios workers.
error() { echo "Error: $*" >&2; exit 2; }
if [[ $# == 1 && ($1 == "all" || $1 == "ambos" || $1 == "mixto") ]]; then
    tipo=$1 cantidad=90 segundos=60
elif [[ $# == 2 && ($1 == "all" || $1 == "ambos" || $1 == "mixto") ]]; then
    tipo=$1 cantidad=90 segundos=$2
elif [[ $# == 3 ]]; then
    tipo=$1 cantidad=$2 segundos=$3
else
    error 'Uso: prueba_stress.sh all [SEGUNDOS] | prueba_stress.sh cpu N SEGUNDOS | prueba_stress.sh memoria NM SEGUNDOS'
fi
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
    all|ambos|mixto)
        porcentaje=${cantidad:-90}
        [[ $porcentaje =~ ^[0-9]{1,2}$ ]] || error 'Porcentaje entero: 50 a 95 (ejemplo: 90).'
        porcentaje=$((10#$porcentaje))
        (( porcentaje >= 50 && porcentaje <= 95 )) || error 'Porcentaje debe estar entre 50 y 95%.'
        disponible=0 total=0 usada=0
        while read -r etiqueta t u l c ca d resto; do
            if [[ $etiqueta == Mem: ]]; then
                total=$t; usada=$u; disponible=$d
                break
            fi
        done <<< "$(LC_ALL=C free -m)"
        [[ $disponible =~ ^[0-9]{1,9}$ && $total =~ ^[0-9]{1,9}$ ]] || error 'No se pudo leer la memoria del sistema.'
        total=$((10#$total)); usada=$((10#$usada)); disponible=$((10#$disponible))
        objetivo=$(( total * porcentaje / 100 ))
        mb=$(( objetivo - usada ))
        # Deja al menos 150 MB libres de margen para evitar que el kernel active OOM Killer
        if (( mb > disponible - 150 )); then
            mb=$(( disponible - 150 ))
        fi
        if (( mb < 16 )); then
            mb=16
        fi
        cpus=$(nproc 2>/dev/null || echo 2)
        (( cpus >= 1 && cpus <= 8 )) || cpus=2
        cantidad="${cpus} CPUs + ${mb}M RAM (~${porcentaje}%)"
        opciones=(--cpu "$cpus" --vm 1 --vm-bytes "${mb}M" --vm-keep) ;;
    *) error 'Recurso permitido: cpu, memoria o all.' ;;
esac
command -v stress >/dev/null 2>&1 || error 'Instalar stress en la VM: sudo apt install stress'
printf 'Prueba %s: %s durante %ss; ejecutar solamente en la VM.\n' "$tipo" "$cantidad" "$segundos" >&2
# exec evita procesos huérfanos de una envoltura; stress tiene timeout y maneja
# SIGINT/SIGTERM con sus hijos. No usamos killall ni buscamos procesos ajenos.
exec stress "${opciones[@]}" --timeout "${segundos}s"
