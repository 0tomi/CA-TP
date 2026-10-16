## 1. Configurar Telegram

Desde la **raíz del repositorio**, en la VM Debian. Usar Bash para consultar Telegram.

1. En Telegram, abrir **@BotFather**, enviar `/newbot` y seguir las instrucciones.
   Guardar el token en privado; no pegarlo en el chat, historial, capturas ni Git.
2. Abrir el chat del **bot creado** y enviar `/start`.
3. Consultar las actualizaciones localmente y copiar el número de `message.chat.id`
   de ese chat: no usar `update_id` ni el nombre de usuario.

```bash
set +x
read -r -s -p 'Token (entrada oculta): ' token
printf '\n'
if [[ $token =~ ^[0-9]+:[A-Za-z0-9_-]+$ ]]; then
  printf 'url = "https://api.telegram.org/bot%s/getUpdates"\n' "$token" |
    curl -q --silent --fail --connect-timeout 3 --max-time 8 \
      --proto '=https' --config -
fi
unset token
```

El token viaja por stdin, **no por argv**. No compartir la respuesta; usar un bot sin webhook ni otros consumidores.

4. Copiar la plantilla **solo si no existe configuración propia**. Si pregunta
   por sobrescritura, responder que no para conservarla:

```bash
cp -i bash-scripts/alertas.example.conf bash-scripts/alertas.local.conf
chmod 600 bash-scripts/alertas.local.conf
nano bash-scripts/alertas.local.conf
```

El archivo local está ignorado por Git; `600` limita su lectura al propietario. Editar sin publicar credenciales:

```bash
ALERTAS_HABILITADAS=1
ALERTAS_CANAL=telegram
TELEGRAM_BOT_TOKEN='TOKEN_REAL_DEL_BOT'
TELEGRAM_CHAT_ID='123456789'
```

5. Verificar con esta muestra sintética: **envía Telegram real, sin generar carga**.
   Con los umbrales predeterminados intenta rojo y recuperación; comprobar el chat.

```bash
bash -c 'source bash-scripts/alertas.sh
alerta_porcentaje cpu 100
alerta_porcentaje cpu 0'
```

Si ya estaba registrado rojo, se suprime ese primer aviso. La configuración local
prevalece sobre variables de entorno; `ALERTAS_CONFIG` permite elegir otro archivo.
Para apagar los avisos, cambiar `ALERTAS_HABILITADAS=0` en el archivo efectivo.

## 2. Cómo funcionan los umbrales

Editar en `bash-scripts/alertas.local.conf`; estos son los valores predeterminados:

```bash
CPU_AMARILLO=50
CPU_ROJO=80
MEMORIA_AMARILLO=70
MEMORIA_ROJO=90
DISCO_AMARILLO=80
DISCO_ROJO=90
```

Los límites son **inclusivos**: normal por debajo de amarillo; amarillo desde ese
límite hasta antes de rojo; rojo desde su límite. Deben ser enteros entre 0 y 100,
con amarillo menor que rojo. CPU: 49% normal, 50% amarillo y 80% rojo.
RAM: 70% amarillo y 90% rojo; disco: 80% amarillo y 90% rojo.
CPU usa `100 − idle`; RAM, `usada × 100 / total` (entero); disco, `Use%` de `df`.
Se notifica **solo al cambiar de nivel**, también al bajar o recuperarse a normal.
Ejemplo CPU: `49 → 50 → 50 → 80 → 49` avisa amarillo, rojo y recuperación.
No avisa por el normal inicial ni por repetir un nivel ya entregado.
Si falla el envío, no confirma el nuevo estado: la próxima lectura reintenta
si todavía difiere del último nivel entregado; no hay una cola de mensajes.
El estado persiste en `$HOME/.local/state/ca-tp-alertas`, separado por canal/destino,
recurso y, para disco, filesystem/montaje; `ALERTAS_ESTADO_DIR` permite otra ruta.

## 3. Cómo funciona la prueba de estrés

Solo en una **VM de laboratorio**, nunca en el anfitrión ni como root. Requiere
`stress` instalado. Ejecutar CPU y RAM por separado; no llenar discos.
El script genera carga; los monitores miden y pueden enviar datos y alertas reales.

**CPU — terminal A**, desde la raíz del repositorio:

```bash
bash bash-scripts/prueba_stress.sh cpu 1 60
```

`1` es un worker, **no 1% de CPU**; en dos vCPU puede ocupar aproximadamente la
mitad del conjunto, sin garantizar un porcentaje. Se admiten de 1 a 4 workers.
La duración es de 1 a 300 segundos: el ejemplo ejecuta `--timeout 60s`.

**Terminal B**, también en la raíz: ejecutar cada comando en el momento indicado.

```bash
bash bash-scripts/monitor_cpu.sh  # Antes de iniciar la carga en A.
bash bash-scripts/monitor_cpu.sh  # Durante la carga, por ejemplo a los 10 s.
bash bash-scripts/monitor_cpu.sh  # Después de terminar, por ejemplo a los 5 s.
```

**RAM — terminal A**, una vez terminada la prueba CPU:

```bash
bash bash-scripts/prueba_stress.sh memoria 128M 60
```

En **terminal B**, repetir la observación antes, durante y después:

```bash
bash bash-scripts/monitor_memoria.sh  # Antes de iniciar RAM en A.
bash bash-scripts/monitor_memoria.sh  # Durante, por ejemplo a los 10 s.
bash bash-scripts/monitor_memoria.sh  # Después, por ejemplo a los 5 s.
```

RAM usa un worker: acepta `1M`–`1024M`, como máximo el **25% de la RAM disponible**
según `free -m`, y exige dejar **256M** de margen. Rechaza solicitudes mayores;
por ejemplo, con 300M disponibles, 64M dejaría 236M y se rechaza.
No garantizan evitar agotamiento de memoria. Observar la subida y bajada en el dashboard o respaldo de API.
No forzar rojo aumentando RAM. Si hubo alerta, comprobar recuperación. Para detener, **Ctrl+C en A**.
