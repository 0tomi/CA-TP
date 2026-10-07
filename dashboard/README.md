# Dashboard de monitorización Debian

La interfaz adapta el diseño de referencia a los cuatro monitores del trabajo práctico: CPU, interfaces de red, vecinos de red y sesiones de usuarios. Los scripts Bash originales siguen siendo la fuente de las lecturas reales.

## Iniciar la demostración

Se necesita Node.js 22 o posterior. Desde la raíz del repositorio:

```text
cd dashboard
npm install
npm run dev
```

Abrí la dirección que indique el servidor de desarrollo. El modo **Demostración** usa datos de ejemplo identificados en la interfaz; esos valores no son mediciones del equipo que abre la página. Podés explorar la UI sin tener Debian ni ejecutar los monitores.

## Conectar las lecturas reales

Los scripts de `../bash-scripts/` envían su salida al módulo `api_mock.sh`. Ese módulo escribe bloques de texto; todavía no realiza solicitudes HTTP. La tarea cron guarda esos bloques en un `cron.log` una vez por minuto. El servidor de este dashboard lee ese archivo y ofrece una API de consulta. No ejecuta Bash ni recolecta métricas adicionales.

En Debian, configurá las rutas `/home/USUARIO/monitores` de los scripts y de `CRONTAB.txt` con el usuario y la ubicación donde los instalaste. La tarea actual es:

```text
* * * * * /home/USUARIO/monitores/monitor_todo.sh >> /home/USUARIO/monitores/cron.log
```

El usuario de cron debe poder ejecutar los scripts y escribir el archivo; el usuario del servidor del dashboard necesita permiso de lectura sobre ese registro. La línea actual registra la salida normal de los scripts. Los mensajes de error de los comandos no se agregan automáticamente al archivo.

En otra terminal, desde `dashboard`, iniciá el servidor sobre el mismo Debian que contiene el archivo:

```text
MONITOR_LOG=/home/USUARIO/monitores/cron.log node server/index.mjs
```

Durante el desarrollo, Vite deriva `/api` al servidor local en el puerto `8787`. Abrí la configuración de conexión del panel, seleccioná **Leer el log del TP**, dejá `/api/metrics` como dirección y elegí **Guardar y conectar**. Si el registro no existe o todavía no tiene bloques completos, la API devuelve un error legible; nunca lo reemplaza por datos de demostración.

En PowerShell, para leer una copia del registro:

```powershell
$env:MONITOR_LOG = 'C:/ruta/cron.log'
node server/index.mjs
```

También podés iniciar el servidor con `npm run server`; por defecto busca `../bash-scripts/cron.log`. No se incluye un registro real ni se crea uno con cifras inventadas.

## Compilar y servir

```text
npm run build
MONITOR_LOG=/home/USUARIO/monitores/cron.log node server/index.mjs
```

El servidor entrega la interfaz compilada de `dist/` y la API desde el mismo origen. Abrí `http://127.0.0.1:8787`. Para consultarlo desde otro equipo, se recomienda un túnel SSH hacia ese puerto. El servidor escucha solamente en localhost por defecto.

Si se necesita acceso directo dentro de una red confiable, la dirección debe configurarse explícitamente:

```text
HOST=0.0.0.0 MONITOR_LOG=/home/USUARIO/monitores/cron.log node server/index.mjs
```

Este puente no incorpora autenticación: usá esa opción solamente en la red controlada de la demostración. Para separar los orígenes de la UI y la API, configurá `ALLOWED_ORIGINS` con los orígenes autorizados separados por comas. Los valores de desarrollo admitidos por defecto son `http://localhost:5173` y `http://127.0.0.1:5173`.

| Variable | Valor por defecto | Uso |
| --- | --- | --- |
| `MONITOR_LOG` | `../bash-scripts/cron.log`, relativo a la ubicación del servidor | Archivo generado por cron; no se elige por URL |
| `MONITOR_HOST_LABEL` | `Servidor Debian` | Nombre visible del servidor monitorizado |
| `HOST` | `127.0.0.1` | Dirección donde escucha el servidor |
| `PORT` | `8787` | Puerto HTTP |
| `ALLOWED_ORIGINS` | Los dos orígenes localhost de desarrollo | Orígenes autorizados para solicitudes desde otro sitio |

## Qué significa cada dato

- **CPU:** porcentajes y contadores de la última fila de `vmstat 1 2`. Se descarta el promedio desde el arranque. El histórico conserva hasta 60 muestras válidas; su posición corresponde al orden del archivo, sin asignarles horarios inventados.
- **Memoria:** cantidades libres, buffers, cache y swap presentes en `vmstat`. El TP no recoge el total de RAM: no se calcula un porcentaje de memoria usada.
- **Red:** bytes y paquetes RX/TX acumulados por interfaz, direcciones IPv4/IPv6, estado, errores y descartes de `ip -s address show`. Los contadores no se presentan como velocidad instantánea ni Mbps.
- **Vecinos:** entradas de `ip neigh show`, incluidas `FAILED` o `INCOMPLETE` sin MAC. Representan los vecinos conocidos por el sistema; no un escaneo completo de los equipos conectados.
- **Usuarios:** sesiones con terminal de `who -a`. Se filtran los registros auxiliares de arranque, nivel de ejecución y espera de login. La fecha se conserva tal como la entrega el comando, sin suponer una zona horaria.

`collectedAt` es la última modificación del archivo de cron, no la hora individual de cada medición. Los scripts no guardan timestamps por bloque. Si una nueva ejecución todavía está escribiendo, la respuesta incluye únicamente sus recursos completos y avisa qué falta; no mezcla silenciosamente esa captura con una anterior. Los textos originales se conservan en la respuesta para consultar las salidas del TP.

Los discos, los servicios y los contenedores aparecen como posibilidades en la consigna, pero los scripts actuales no los monitorizan. La interfaz no los presenta como mediciones implementadas.

## API y verificaciones

- `GET /api/metrics`: devuelve las lecturas del registro, sus salidas originales y los avisos de datos ausentes o inválidos. Devuelve `503` si el registro no está disponible o no contiene bloques completos.
- `GET /api/health`: confirma que el puente está disponible; no certifica la salud del Debian ni la frescura del registro.

La lectura está limitada a los últimos 2 MiB del archivo para mantener acotado el uso de memoria. Un aviso indica cuando esto puede limitar el histórico. Las filas inválidas se omiten con un aviso; las métricas ausentes no se convierten en ceros.

```text
npm test
npm run build
```

Las pruebas cubren el contrato del log, las capturas parciales, el filtrado de sesiones, las interfaces y vecinos, el histórico, la API y el acceso limitado a archivos estáticos.
