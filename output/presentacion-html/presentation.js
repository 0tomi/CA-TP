'use strict';
(() => {
  const slides = [...document.querySelectorAll('.slide')];
  const dots = [...document.querySelectorAll('[data-go]')];
  const notes = document.querySelector('#notes-dialog');
  const demoInput = document.querySelector('#demo-url');
  const notesCopy = [
    '<p><strong>La idea del proyecto · 50 segundos.</strong> El trabajo parte de una necesidad concreta: observar recursos de un servidor Debian y poder leer esa información desde una interfaz visual.</p><p>Lo organizamos en dos carpetas. En <strong>bash-scripts</strong> están los monitores y los scripts que coordinan y envían la información. En <strong>dashboard</strong> están el servidor que interpreta las salidas y la interfaz que muestra gráficos y tablas.</p><p>No es una única consulta: son siete monitores especializados, conectados a un mismo circuito. Ahora vamos a seguir el recorrido de una lectura.</p>',
    '<p><strong>Cómo viaja una lectura · 75 segundos.</strong> Cron ejecuta <strong>monitor_todo.sh</strong> cada minuto. Ese script coordina los siete monitores. Cada monitor recolecta su recurso y entrega los datos y el identificador del recurso a <strong>api.sh</strong>.</p><p>Api.sh envía el texto mediante HTTP POST. El servidor recibe ese bloque, lo interpreta y lo transforma en JSON, que es el formato que consume la interfaz.</p><p>Si el envío falla, el bloque se imprime. La salida de la tarea programada queda agregada a <strong>cron.log</strong>, que también puede usarse como fuente de entrada.</p><p>Aclaración clave: el panel consulta cada cinco segundos, pero cron genera nuevas lecturas cada minuto. Actualizar la pantalla no significa volver a medir el sistema.</p>',
    '<p><strong>Bloque de mi compañero · 65 segundos.</strong> Este bloque cubre CPU, red y usuarios. Son tres temas, pero cuatro scripts porque red se divide en interfaces y vecinos.</p><p>Para CPU usamos <strong>vmstat 1 2</strong>. La segunda muestra refleja el intervalo observado y permite ver uso y espera de entrada/salida.</p><p>Para red, <strong>ip -s address show</strong> obtiene las interfaces y sus contadores de tráfico acumulado. <strong>ip neigh show</strong> muestra los vecinos que el sistema conoce; no sale a escanear todos los equipos de la red.</p><p>Por último, <strong>who -a</strong> permite consultar sesiones, terminales y origen de las conexiones de usuarios.</p>',
    '<p><strong>Mi bloque · 65 segundos.</strong> Mis monitores son disco, memoria y servicios. Disco usa <strong>df</strong> para mostrar ocupación y disponibilidad de las particiones, excluyendo tmpfs y devtmpfs.</p><p>Memoria usa <strong>free -m</strong> para obtener RAM y swap en megabytes. Nos permite observar cuánto se está usando y cuánto está disponible.</p><p>Servicios consulta <strong>ps -C</strong> por separado para cron y sshd y comprueba que esos procesos estén presentes. Es importante precisar el alcance: detectar un proceso no garantiza por sí solo que todas sus funciones respondan correctamente.</p><p>Los tres siguen el mismo circuito de salida: cada monitor entrega su lectura a api.sh.</p>',
    '<p><strong>Dashboard y transición a la demo · 65 segundos.</strong> El dashboard permite trabajar con datos simulados, con datos recibidos por HTTP o con la salida de los scripts guardada en archivo.</p><p>Los modos API y log usan el mismo endpoint. El servidor da prioridad a los datos HTTP que tenga disponibles y, si no hay, lee el archivo. Por eso conviene comprobar la fuente antes de mostrar la demo.</p><p>La interfaz organiza la información en Resumen, Red, Usuarios, Sistema y Registros. La consulta se actualiza cada cinco segundos; la recolección programada sigue siendo cada minuto.</p><p><strong>Ahora dejamos la presentación y mostramos el dashboard real.</strong> Verificamos la fuente, recorremos las vistas y mostramos la relación entre los scripts y los datos de la interfaz.</p>'
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

    let width = 0;
    let height = 0;
    let lastTime = 0;
    let elapsed = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resize, { passive: true });
    resize();

    // Floating ambient micro-particles for depth
    const particleCount = 24;
    const particles = Array.from({ length: particleCount }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: -0.08 - Math.random() * 0.22,
      size: 1.2 + Math.random() * 2.0,
      alpha: 0.06 + Math.random() * 0.14,
      phase: Math.random() * Math.PI * 2,
      lime: i % 3 === 0
    }));

    function render(now) {
      if (!lastTime) lastTime = now;
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const isPaused = document.body.classList.contains('paused') || reducedMotion.matches;
      if (!isPaused) {
        elapsed += dt;
      }

      const t = elapsed;
      const w = width;
      const h = height;

      // 1. Base dark background (deep obsidian midnight green)
      ctx.fillStyle = '#020b08';
      ctx.fillRect(0, 0, w, h);

      // 2. Large organic fluid/aurora orbs (softened & darkened for high text contrast)
      const orbs = [
        {
          x: w * (0.32 + 0.18 * Math.sin(t * 0.24 + 0.5)),
          y: h * (0.36 + 0.16 * Math.cos(t * 0.20)),
          r: Math.max(w, h) * 0.54,
          color: 'rgba(16, 48, 38, 0.45)'
        },
        {
          x: w * (0.76 + 0.16 * Math.cos(t * 0.22 + 1.2)),
          y: h * (0.58 + 0.18 * Math.sin(t * 0.28 + 0.8)),
          r: Math.max(w, h) * 0.58,
          color: 'rgba(9, 36, 29, 0.52)'
        },
        {
          x: w * (0.68 + 0.15 * Math.sin(t * 0.32 + 2.1)),
          y: h * (0.26 + 0.14 * Math.cos(t * 0.26 + 1.5)),
          r: Math.max(w, h) * 0.38,
          color: 'rgba(212, 239, 128, 0.055)'
        },
        {
          x: w * (0.20 + 0.14 * Math.cos(t * 0.26 + 2.8)),
          y: h * (0.78 + 0.14 * Math.sin(t * 0.22 + 2.2)),
          r: Math.max(w, h) * 0.46,
          color: 'rgba(18, 62, 48, 0.36)'
        },
        {
          x: w * (0.84 + 0.12 * Math.sin(t * 0.18 + 3.4)),
          y: h * (0.84 + 0.12 * Math.cos(t * 0.24 + 3.1)),
          r: Math.max(w, h) * 0.36,
          color: 'rgba(201, 184, 139, 0.04)'
        },
        {
          x: w * (0.14 + 0.12 * Math.sin(t * 0.34 + 4.0)),
          y: h * (0.18 + 0.12 * Math.cos(t * 0.30 + 4.5)),
          r: Math.max(w, h) * 0.32,
          color: 'rgba(212, 239, 128, 0.04)'
        }
      ];

      for (let i = 0; i < orbs.length; i++) {
        const o = orbs[i];
        const grad = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
        grad.addColorStop(0, o.color);
        grad.addColorStop(0.55, o.color.replace(/[\d\.]+\)$/, '0.14)'));
        grad.addColorStop(1, 'rgba(2, 11, 8, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. Fluid undulating aurora waves (subtle, dark, organic flow)
      const waveLayers = [
        {
          baseY: h * 0.38,
          amp1: 42,
          amp2: 22,
          freq1: 0.0016,
          freq2: 0.0032,
          speed1: 0.35,
          speed2: 0.45,
          colorTop: 'rgba(212, 239, 128, 0.04)',
          colorMid: 'rgba(20, 68, 54, 0.12)',
          lineColor: 'rgba(212, 239, 128, 0.12)',
          lineWidth: 1.0
        },
        {
          baseY: h * 0.54,
          amp1: 50,
          amp2: 26,
          freq1: 0.0014,
          freq2: 0.0028,
          speed1: -0.28,
          speed2: 0.38,
          colorTop: 'rgba(16, 55, 44, 0.14)',
          colorMid: 'rgba(8, 34, 26, 0.10)',
          lineColor: 'rgba(100, 145, 110, 0.10)',
          lineWidth: 0.9
        },
        {
          baseY: h * 0.72,
          amp1: 58,
          amp2: 30,
          freq1: 0.0012,
          freq2: 0.0024,
          speed1: 0.22,
          speed2: -0.32,
          colorTop: 'rgba(212, 239, 128, 0.03)',
          colorMid: 'rgba(18, 60, 48, 0.12)',
          lineColor: 'rgba(212, 239, 128, 0.08)',
          lineWidth: 0.8
        }
      ];

      const step = 20;
      for (let wi = 0; wi < waveLayers.length; wi++) {
        const wave = waveLayers[wi];
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w + step; x += step) {
          const y = wave.baseY +
            Math.sin(x * wave.freq1 + t * wave.speed1) * wave.amp1 +
            Math.cos(x * wave.freq2 + t * wave.speed2) * wave.amp2;
          if (x === 0) ctx.lineTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.closePath();

        const waveGrad = ctx.createLinearGradient(0, wave.baseY - wave.amp1, 0, h);
        waveGrad.addColorStop(0, wave.colorTop);
        waveGrad.addColorStop(0.35, wave.colorMid);
        waveGrad.addColorStop(1, 'rgba(2, 11, 8, 0)');
        ctx.fillStyle = waveGrad;
        ctx.fill();

        // Luminous subtle edge stroke
        ctx.beginPath();
        for (let x = 0; x <= w + step; x += step) {
          const y = wave.baseY +
            Math.sin(x * wave.freq1 + t * wave.speed1) * wave.amp1 +
            Math.cos(x * wave.freq2 + t * wave.speed2) * wave.amp2;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = wave.lineColor;
        ctx.lineWidth = wave.lineWidth;
        ctx.stroke();
      }

      // 4. Subtle floating luminous dust particles (faint ambient motes)
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!isPaused) {
          p.y += p.vy;
          p.x += p.vx + Math.sin(t * 0.8 + p.phase) * 0.16;
          if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
          if (p.x < -10) p.x = w + 10;
          if (p.x > w + 10) p.x = -10;
        }
        const pAlpha = p.alpha * (0.6 + 0.4 * Math.sin(t * 1.5 + p.phase));
        ctx.fillStyle = p.lime
          ? `rgba(212, 239, 128, ${pAlpha})`
          : `rgba(160, 200, 160, ${pAlpha * 0.75})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Overall dark contrast scrim + cinematic vignette to ensure 100% white text legibility
      ctx.fillStyle = 'rgba(2, 8, 6, 0.28)';
      ctx.fillRect(0, 0, w, h);

      const vignette = ctx.createRadialGradient(w * 0.5, h * 0.5, Math.min(w, h) * 0.35, w * 0.5, h * 0.5, Math.max(w, h) * 0.78);
      vignette.addColorStop(0, 'rgba(2, 9, 7, 0.08)');
      vignette.addColorStop(0.65, 'rgba(2, 8, 6, 0.38)');
      vignette.addColorStop(1, 'rgba(1, 6, 4, 0.72)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, w, h);

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
  }

  initAnimatedBackground();
  go(index, false);
})();
