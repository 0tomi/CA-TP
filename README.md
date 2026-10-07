# CA-TP

Trabajo práctico integrador de Computación Avanzada: scripts Bash para monitorizar un servidor Debian y una interfaz que presenta sus lecturas.

La [consigna del trabajo práctico](./Trabajo%20Práctico%20Integrador%20Grupal.md) es la fuente de verdad. Pide monitorizar al menos un recurso y programar la ejecución del script. La implementación actual recoge CPU, interfaces de red, vecinos de red y sesiones de usuarios, con una tarea cron cada minuto.

- [`bash-scripts/`](./bash-scripts/): monitores originales, módulo de salida mock y configuración cron. Los comandos utilizados están incluidos en la [lista de las clases prácticas](./.agents/skills/comandos-practica-gnu-linux/SKILL.md).
- [`dashboard/`](./dashboard/): interfaz inspirada en la referencia visual, modo demostración y puente de lectura del registro real.

Para explorar la demostración se necesita Node.js 22 o posterior:

```text
cd dashboard
npm install
npm run dev
```

Los datos de demostración están identificados como ejemplos. Para conectar el Debian, primero configurá las rutas `/home/USUARIO/monitores` de los scripts y la tarea cron. El puente de Node consulta el `cron.log` generado; no ejecuta comandos de monitorización ni cambia los scripts originales.

Las instrucciones de conexión, compilación, acceso remoto y verificación están en el [README del dashboard](./dashboard/README.md).
