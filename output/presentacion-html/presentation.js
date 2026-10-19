'use strict';
(() => {
  const slides = [...document.querySelectorAll('.slide')];
  const dots = [...document.querySelectorAll('[data-go]')];
  const notes = document.querySelector('#notes-dialog');
  const demoInput = document.querySelector('#demo-url');
  const notesCopy = [
    '<p><strong>La idea del proyecto · 50 segundos.</strong> El trabajo parte de una necesidad concreta: observar recursos de un servidor Debian y poder leer esa información desde una interfaz visual.</p><p>Lo organizamos en dos carpetas. En <strong>bash-scripts</strong> están los monitores y los scripts que coordinan y envían la información. En <strong>dashboard</strong> están el servidor que interpreta las salidas y la interfaz que muestra gráficos y tablas.</p><p>No es una única consulta: son siete monitores especializados, conectados a un mismo circuito. Ahora vamos a seguir el recorrido de una lectura.</p>',
    '<p><strong>Cómo viaja una lectura · 75 segundos.</strong> Cron ejecuta <strong>monitor_todo.sh</strong> cada minuto. Ese script coordina los siete monitores. Cada monitor recolecta su recurso y entrega los datos y el identificador del recurso a <strong>api.sh</strong>.</p><p>Api.sh envía el texto mediante HTTP POST. El servidor recibe ese bloque, lo interpreta y lo transforma en JSON, que es el formato que consume la interfaz.</p><p>Si el envío falla, el bloque se imprime. La salida de la tarea programada queda agregada a <strong>cron.log</strong>, que también puede usarse como fuente de entrada.</p><p>Después de enviar, los monitores de CPU, memoria y disco comparan la lectura con sus umbrales. Esa comparación la hace <strong>alertas.sh</strong>: si el nivel cambia (normal, amarillo o rojo), <strong>notificador.sh</strong> envía el mensaje al bot de Telegram; si no cambia, no lo repite. Es el paso 5 de la diapositiva y corre en paralelo al envío hacia el servidor.</p>',
    '<p><strong>Bloque de mi compañero · 65 segundos.</strong> Este bloque cubre CPU, red y usuarios. Son tres temas, pero cuatro scripts porque red se divide en interfaces y vecinos.</p><p>Para CPU usamos <strong>vmstat 1 2</strong>. La primera muestra es un promedio desde el arranque, por eso se usa la segunda: refleja el último segundo y permite ver uso y espera de entrada/salida. El uso es 100 menos el porcentaje inactivo, y alerta en 50% (amarillo) y 80% (rojo).</p><p>Para red, <strong>ip -s address show</strong> obtiene las interfaces y sus contadores de tráfico acumulado. <strong>ip neigh show</strong> muestra los vecinos que el sistema conoce; no sale a escanear todos los equipos de la red.</p><p>Por último, <strong>who -a</strong> permite consultar sesiones, terminales y origen de las conexiones de usuarios.</p>',
    '<p><strong>Mi bloque · 65 segundos.</strong> Mis monitores son disco, memoria y servicios. Disco usa <strong>df</strong> para mostrar ocupación y disponibilidad de las particiones, excluyendo tmpfs y devtmpfs.</p><p>Memoria usa <strong>free -m</strong> para obtener RAM y swap en megabytes. El porcentaje de alerta es RAM usada sobre total: amarillo en 70%, rojo en 90%. Disco alerta por partición en 80% y 90%.</p><p>Servicios consulta <strong>ps -C</strong> por separado para cron y sshd y comprueba que esos procesos estén presentes. Es importante precisar el alcance: detectar un proceso no garantiza por sí solo que todas sus funciones respondan correctamente.</p><p>Los tres siguen el mismo circuito de salida: cada monitor entrega su lectura a api.sh. Para mostrar una alerta en vivo usamos <strong>prueba_stress.sh</strong>, que carga CPU o memoria de forma controlada y con tiempo límite.</p>',
    '<p><strong>Dashboard y transición a la demo · 65 segundos.</strong> El dashboard permite trabajar con datos simulados o con los datos que envía la VM por HTTP; la salida guardada en cron.log queda como respaldo.</p><p>En el panel hay dos modos: Demo y API. El endpoint <strong>/api/metrics</strong> prioriza lo recibido por HTTP; si todavía no llegó nada, lee cron.log como respaldo. Por eso conviene comprobar la fuente antes de mostrar la demo.</p><p>La interfaz organiza la información en Resumen, Red, Usuarios, Sistema y Registros. Las lecturas se renuevan cada minuto, con cada ejecución de cron.</p><p>Además del panel está Telegram: el dashboard muestra el estado y el bot avisa cuando CPU, RAM o disco cambian de nivel.</p><p><strong>Ahora dejamos la presentación y mostramos el dashboard real.</strong> Verificamos la fuente, recorremos las vistas y, con prueba_stress.sh, forzamos un umbral para que llegue la alerta a Telegram.</p>'
  ];
  let index = Math.max(0, Math.min(4, Number(location.hash.slice(1)) - 1 || 0));
  let lastFocus = null;
  demoInput.value = 'http://localhost:8787';
  try { demoInput.value = localStorage.getItem('debian-presentation-demo-url') || 'http://localhost:8787'; } catch (_) {}
  function updateNotes() {
    document.querySelector('#notes-title').textContent = `${String(index + 1).padStart(2, '0')} / ${slides[index].dataset.title}`;
    document.querySelector('#notes-content').innerHTML = notesCopy[index];
  }
  function go(next, updateHash = true) {
    index = Math.max(0, Math.min(slides.length - 1, next));
    slides.forEach((slide, i) => { slide.hidden = i !== index; slide.classList.toggle('active', i === index); if (i === index) slide.scrollTop = 0; });
    dots.forEach((dot, i) => { dot.classList.toggle('active', i === index); if (i === index) dot.setAttribute('aria-current', 'step'); else dot.removeAttribute('aria-current'); });
    document.querySelector('#current-number').textContent = String(index + 1).padStart(2, '0');
    document.querySelector('#current-title').textContent = slides[index].dataset.title;
    document.querySelector('#progress').style.width = `${(index + 1) / slides.length * 100}%`;
    document.querySelector('#prev-button').disabled = index === 0;
    document.querySelector('#next-button').disabled = index === slides.length - 1;
    document.querySelector('#live-announcement').textContent = `Diapositiva ${index + 1} de 5: ${slides[index].dataset.title}`;
    if (updateHash) history.replaceState(null, '', `#${index + 1}`);
    updateNotes();
  }
  function openNotes(focusUrl = false) {
    lastFocus = document.activeElement;
    updateNotes();
    if (!notes.open) notes.showModal();
    if (focusUrl) demoInput.focus();
  }
  notes.addEventListener('close', () => { if (lastFocus && lastFocus.isConnected) lastFocus.focus(); });
  notes.addEventListener('click', event => { if (event.target === notes) { const r = notes.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) notes.close(); } });
  async function fullscreen() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch (_) { document.querySelector('#live-announcement').textContent = 'Este navegador no permite activar pantalla completa. Podés usar su opción de pantalla completa.'; }
  }
  dots.forEach(dot => dot.addEventListener('click', () => go(Number(dot.dataset.go))));
  document.querySelector('.brand').addEventListener('click', e => { e.preventDefault(); go(0); });
  document.querySelector('#prev-button').addEventListener('click', () => go(index - 1));
  document.querySelector('#next-button').addEventListener('click', () => go(index + 1));
  document.querySelector('#notes-button').addEventListener('click', () => openNotes());
  document.querySelector('#fullscreen-button').addEventListener('click', fullscreen);
  document.querySelector('#motion-button').addEventListener('click', event => {
    const paused = document.body.classList.toggle('paused');
    event.currentTarget.textContent = paused ? '▷' : 'Ⅱ';
    event.currentTarget.setAttribute('aria-label', paused ? 'Reanudar animaciones' : 'Pausar animaciones');
    event.currentTarget.setAttribute('aria-pressed', String(paused));
  });
  demoInput.addEventListener('input', () => { demoInput.setCustomValidity(''); try { localStorage.setItem('debian-presentation-demo-url', demoInput.value.trim()); } catch (_) {} });
  document.querySelector('#demo-button').addEventListener('click', () => {
    const value = demoInput.value.trim();
    if (!value) { openNotes(true); return; }
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
      window.open(url.href, '_blank', 'noopener,noreferrer');
    } catch (_) { openNotes(true); demoInput.setCustomValidity('Ingresá una dirección completa que comience con http:// o https://.'); demoInput.reportValidity(); }
  });
  document.addEventListener('keydown', event => {
    if (notes.open || event.ctrlKey || event.metaKey || event.altKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (event.key === 'ArrowRight' || event.key === 'PageDown' || (event.key === ' ' && !/BUTTON|A/.test(event.target.tagName))) { event.preventDefault(); go(index + 1); }
    else if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); go(index - 1); }
    else if (event.key === 'Home') { event.preventDefault(); go(0); }
    else if (event.key === 'End') { event.preventDefault(); go(slides.length - 1); }
    else if (/^[1-5]$/.test(event.key)) go(Number(event.key) - 1);
    else if (event.key.toLowerCase() === 'n') openNotes();
    else if (event.key.toLowerCase() === 'f') fullscreen();
  });
  window.addEventListener('hashchange', () => { const n = Number(location.hash.slice(1)); if (Number.isInteger(n) && n >= 1 && n <= 5) go(n - 1, false); });
  function initAnimatedBackground() {
    const canvas = document.querySelector('#bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // The background is made of soft gradients, so it is rendered at a fraction of
    // the viewport and upscaled by CSS: same look, a fraction of the fill cost.
    const RENDER_SCALE = 0.5;
    const FRAME_MS = 1000 / 30;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let elapsed = 0;
    let lastTime = 0;
    let lastDraw = 0;
    let frame = 0;

    const orbs = [
      { cx: 0.32, ax: 0.18, sx: 0.24, px: 0.5, cy: 0.36, ay: 0.16, sy: 0.20, py: 0, r: 0.54, color: '16, 48, 38', a: 0.45 },
      { cx: 0.76, ax: 0.16, sx: 0.22, px: 1.2, cy: 0.58, ay: 0.18, sy: 0.28, py: 0.8, r: 0.58, color: '9, 36, 29', a: 0.52 },
      { cx: 0.68, ax: 0.15, sx: 0.32, px: 2.1, cy: 0.26, ay: 0.14, sy: 0.26, py: 1.5, r: 0.38, color: '212, 239, 128', a: 0.055 },
      { cx: 0.20, ax: 0.14, sx: 0.26, px: 2.8, cy: 0.78, ay: 0.14, sy: 0.22, py: 2.2, r: 0.46, color: '18, 62, 48', a: 0.36 },
      { cx: 0.84, ax: 0.12, sx: 0.18, px: 3.4, cy: 0.84, ay: 0.12, sy: 0.24, py: 3.1, r: 0.36, color: '201, 184, 139', a: 0.04 }
    ];
    const waves = [
      { base: 0.38, amp1: 42, amp2: 22, f1: 0.0016, f2: 0.0032, s1: 0.35, s2: 0.45, top: 'rgba(212, 239, 128, 0.04)', mid: 'rgba(20, 68, 54, 0.12)', line: 'rgba(212, 239, 128, 0.12)' },
      { base: 0.54, amp1: 50, amp2: 26, f1: 0.0014, f2: 0.0028, s1: -0.28, s2: 0.38, top: 'rgba(16, 55, 44, 0.14)', mid: 'rgba(8, 34, 26, 0.10)', line: 'rgba(100, 145, 110, 0.10)' },
      { base: 0.72, amp1: 58, amp2: 30, f1: 0.0012, f2: 0.0024, s1: 0.22, s2: -0.32, top: 'rgba(212, 239, 128, 0.03)', mid: 'rgba(18, 60, 48, 0.12)', line: 'rgba(212, 239, 128, 0.08)' }
    ];
    const particles = Array.from({ length: 18 }, (_, i) => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.18, vy: -0.08 - Math.random() * 0.22,
      size: 1.4 + Math.random() * 2, alpha: 0.06 + Math.random() * 0.14,
      phase: Math.random() * Math.PI * 2, lime: i % 3 === 0
    }));
    let vignette = null;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.round(width * RENDER_SCALE));
      canvas.height = Math.max(1, Math.round(height * RENDER_SCALE));
      ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
      vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.35, width / 2, height / 2, Math.max(width, height) * 0.78);
      vignette.addColorStop(0, 'rgba(2, 9, 7, 0.36)');
      vignette.addColorStop(0.65, 'rgba(2, 8, 6, 0.56)');
      vignette.addColorStop(1, 'rgba(1, 6, 4, 0.8)');
      particles.forEach(p => { p.px = p.x * width; p.py = p.y * height; });
      draw();
    }

    function draw() {
      const t = elapsed;
      const w = width;
      const h = height;
      const size = Math.max(w, h);
      ctx.fillStyle = '#020b08';
      ctx.fillRect(0, 0, w, h);

      for (const o of orbs) {
        const x = w * (o.cx + o.ax * Math.sin(t * o.sx + o.px));
        const y = h * (o.cy + o.ay * Math.cos(t * o.sy + o.py));
        const r = size * o.r;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(${o.color}, ${o.a})`);
        grad.addColorStop(0.55, `rgba(${o.color}, ${o.a * 0.3})`);
        grad.addColorStop(1, 'rgba(2, 11, 8, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }

      const step = 32;
      for (const wave of waves) {
        const baseY = h * wave.base;
        ctx.beginPath();
        for (let x = 0; x <= w + step; x += step) {
          const y = baseY + Math.sin(x * wave.f1 + t * wave.s1) * wave.amp1 + Math.cos(x * wave.f2 + t * wave.s2) * wave.amp2;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = wave.line;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.lineTo(w + step, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        const fill = ctx.createLinearGradient(0, baseY - wave.amp1, 0, h);
        fill.addColorStop(0, wave.top);
        fill.addColorStop(0.35, wave.mid);
        fill.addColorStop(1, 'rgba(2, 11, 8, 0)');
        ctx.fillStyle = fill;
        ctx.fill();
      }

      for (const p of particles) {
        const alpha = p.alpha * (0.6 + 0.4 * Math.sin(t * 1.5 + p.phase));
        ctx.fillStyle = p.lime ? `rgba(212, 239, 128, ${alpha})` : `rgba(160, 200, 160, ${alpha * 0.75})`;
        ctx.fillRect(p.px, p.py, p.size, p.size);
      }

      // Single scrim + vignette pass keeps text contrast high.
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);
    }

    function isStill() {
      return document.hidden || document.body.classList.contains('paused') || reducedMotion.matches;
    }

    function tick(now) {
      frame = 0;
      if (isStill()) { lastTime = 0; return; }
      if (!lastTime) lastTime = now;
      if (now - lastDraw >= FRAME_MS) {
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        lastDraw = now;
        elapsed += dt;
        for (const p of particles) {
          p.py += p.vy * dt * 60;
          p.px += (p.vx + Math.sin(elapsed * 0.8 + p.phase) * 0.16) * dt * 60;
          if (p.py < -10) { p.py = height + 10; p.px = Math.random() * width; }
          if (p.px < -10) p.px = width + 10;
          if (p.px > width + 10) p.px = -10;
        }
        draw();
      }
      frame = requestAnimationFrame(tick);
    }

    function start() {
      if (!frame && !isStill()) frame = requestAnimationFrame(tick);
    }

    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', start);
    document.querySelector('#motion-button').addEventListener('click', start);
    reducedMotion.addEventListener?.('change', start);
    resize();
    start();
  }

  function fitStage() {
    const deck = document.querySelector('#deck');
    deck.style.setProperty('--stage-scale', Math.min(window.innerWidth / 1600, window.innerHeight / 900));
  }
  window.addEventListener('resize', fitStage, { passive: true });
  fitStage();

  initAnimatedBackground();
  go(index, false);
})();
