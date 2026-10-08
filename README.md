# CA-TP · Monitorización Debian en Tiempo Real

> Sistema de monitorización de recursos para Debian con ingesta HTTP en tiempo real y dashboard interactivo.

---

## 1. Levantar el Dashboard (Frontend + Backend)

El servidor de Node (`index.mjs`) expone la API REST y sirve la interfaz web compilada (`dist/`) de forma unificada en `0.0.0.0:8787`.

El **único comando** necesario para levantarlo desde la raíz del proyecto:

```bash
npm start
```

*(Compila automáticamente la interfaz y arranca el servidor unificado en el puerto `8787`)*.

Una vez iniciado, accedé desde el navegador a: **`http://localhost:8787`** (o `http://<IP_DE_TU_PC>:8787` desde cualquier dispositivo en la red local).

---

## 2. Conectar el Monitor de la VM con la API

Por defecto, los scripts apuntan a **`http://10.0.2.2:8787`**, que es la dirección fija de la PC anfitriona cuando la VM está en modo **NAT** en VirtualBox.

### Configuración directa (Cero ajustes de IP)

1. **Red de la VM:** En VirtualBox, dejá el adaptador de red en **NAT** (opción predeterminada).
2. **Crontab en Debian (`crontab -e`):** Agregá la tarea estándar sin variables extra:
   ```crontab
   * * * * * /home/USUARIO/monitores/monitor_todo.sh >> /home/USUARIO/monitores/cron.log
   ```
3. **Comprobar conexión:** Desde la terminal de la VM podés probar el enlace:
   ```bash
   curl -s http://10.0.2.2:8787/api/health
   # Respuesta esperada: {"status":"ok",...}
   ```

> [!NOTE]
> Si en lugar de NAT usás *Adaptador Puente (Bridged)*, simplemente definí `API_HOST=http://<IP_DE_TU_PC>:8787` antes de la línea de cron. Ante cualquier corte de red, `api.sh` preserva las lecturas en `cron.log` mediante su fallback automático.
