<<<<<<< HEAD
// Dashboard MIHM v1.2 - Carga datos en tiempo real
(function () {
  async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
=======
// assets/js/dashboard.js
(function () {
  const rel = (p) => (window.siteBase || '') + p; // por si defines siteBase en futuro
  const fmtPct = (x) => (Math.round(x * 100));
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Fetch ${path} ${res.status}`);
>>>>>>> 4282b3e146dad83e33d8b8782314368300182522
    return res.json();
  }

  function renderHeadline(ihg) {
    const el = document.getElementById('sf-headline');
<<<<<<< HEAD
    if (!el) return;
=======
>>>>>>> 4282b3e146dad83e33d8b8782314368300182522
    el.textContent = ihg.toFixed(3);
    el.className = ihg < -0.5 ? 'c-cr' : (ihg < -0.25 ? 'c-am' : 'c-ok');
  }

  function renderNTI(nti) {
    const el = document.getElementById('sf-nti');
<<<<<<< HEAD
    if (!el) return;
=======
>>>>>>> 4282b3e146dad83e33d8b8782314368300182522
    el.textContent = nti.toFixed(3);
    el.className = nti < 0.4 ? 'c-cr' : (nti < 0.55 ? 'c-am' : 'c-ok');
  }

  function renderProb(p) {
    const el = document.getElementById('sf-prob');
<<<<<<< HEAD
    if (!el) return;
    el.textContent = `${Math.round(p * 100)}%`;
=======
    el.textContent = `${fmtPct(p)}%`;
>>>>>>> 4282b3e146dad83e33d8b8782314368300182522
    el.className = p > 0.6 ? 'c-cr' : (p > 0.4 ? 'c-am' : 'c-ok');
  }

  function renderDims(dims) {
    const wrap = document.getElementById('sf-dims');
<<<<<<< HEAD
    if (!wrap) return;
    wrap.innerHTML = '';
    (dims || []).forEach(d => {
=======
    wrap.innerHTML = '';
    dims.forEach(d => {
>>>>>>> 4282b3e146dad83e33d8b8782314368300182522
      const row = document.createElement('div');
      row.className = 'dim-row';
      row.innerHTML = `
        <div class="dim-name">${d.name}</div>
        <div class="dim-bar">
          <div class="dim-fill" style="width:${Math.round(d.value*100)}%"></div>
          <div class="dim-ucap" style="left:${Math.round(d.ucap*100)}%"></div>
        </div>
        <div class="dim-val">${d.value.toFixed(3)}</div>
      `;
      wrap.appendChild(row);
    });
  }

  function renderNodes(nodes) {
    const tb = document.getElementById('sf-nodes');
<<<<<<< HEAD
    if (!tb) return;
    tb.innerHTML = '';
    (nodes || []).forEach(n => {
=======
    tb.innerHTML = '';
    nodes.forEach(n => {
>>>>>>> 4282b3e146dad83e33d8b8782314368300182522
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${n.name}</td>
        <td>${n.C.toFixed(2)}</td>
        <td>${n.E.toFixed(2)}</td>
        <td>${n.L.toFixed(2)}</td>
        <td>${n.K.toFixed(2)}</td>
        <td>${n.R.toFixed(2)}</td>
        <td>${n.M.toFixed(2)}</td>
        <td>${n.f.toFixed(2)}</td>
        <td>${n.status}</td>
      `;
      if (n.status === 'ALERTA') tr.classList.add('row-am');
      if (n.status === 'CRÍTICO') tr.classList.add('row-cr');
      tb.appendChild(tr);
    });
  }

  function renderInterv(arr) {
    const wrap = document.getElementById('sf-interv');
<<<<<<< HEAD
    if (!wrap) return;
    wrap.innerHTML = '';
    (arr || []).forEach(x => {
      const it = document.createElement('div');
      it.className = 'interv-item';
      const delta = x['Δf'] || x.delta || 0;
      it.innerHTML = `
        <div class="interv-name">${x.n}</div>
        <div class="interv-meta">Δf: ${delta.toFixed(2)} · impacto: ${x.impacto}</div>
=======
    wrap.innerHTML = '';
    arr.forEach(x => {
      const it = document.createElement('div');
      it.className = 'interv-item';
      it.innerHTML = `
        <div class="interv-name">${x.n}</div>
        <div class="interv-meta">Δf: ${x["Δf"].toFixed(2)} · impacto: ${x.impacto}</div>
>>>>>>> 4282b3e146dad83e33d8b8782314368300182522
      `;
      wrap.appendChild(it);
    });
  }

<<<<<<< HEAD
  function renderSpark(series) {
    const wrap = document.getElementById('sf-spark');
    if (!wrap || !series) return;
    wrap.innerHTML = '';
    
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = max - min || 1;
    
    series.forEach((v) => {
      const h = ((v - min) / range) * 100;
      const bar = document.createElement('div');
      bar.style.display = 'inline-block';
      bar.style.width = `calc(100% / ${series.length})`;
      bar.style.height = '60px';
      bar.style.background = 'linear-gradient(to top, var(--ac), transparent)';
      bar.style.opacity = (h / 100);
      bar.title = v.toFixed(3);
      wrap.appendChild(bar);
    });
  }

  async function init() {
    try {
      console.log('Loading dashboard data...');
      const data = await loadJSON('/assets/data/ags_metrics.json');
      
      renderHeadline(data.headline || 0);
      renderNTI(data.nti || 0);
      renderProb(data.prob_fractura_t4y || 0);
      renderDims(data.dims || []);
      renderNodes(data.nodes || []);
      renderInterv(data.intervenciones || []);
      renderSpark(data.series || []);
      
      console.log('✓ Dashboard loaded successfully');
    } catch (e) {
      console.error('Dashboard error:', e);
      const headline = document.getElementById('sf-headline');
      if (headline) headline.innerHTML = '<span style="color: var(--cr-t);">⚠ Error</span>';
    }
  }

  // Ejecutar cuando DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
=======
  function renderSpark(series, ucap = -0.5) {
    const el = document.getElementById('sf-spark');
    const w = el.clientWidth || 520, h = 90, p = 6;
    const min = Math.min(...series, ucap), max = Math.max(...series, ucap);
    const x = (i) => p + (i / (series.length - 1)) * (w - 2*p);
    const y = (v) => h - p - ((v - min) / (max - min || 1)) * (h - 2*p);

    const path = series.map((v,i) => `${i===0?'M':'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    const uY = y(ucap).toFixed(1);

    el.innerHTML = `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <rect x="0" y="0" width="${w}" height="${h}" fill="none"></rect>
        <rect x="0" y="${uY}" width="${w}" height="${h - uY}" class="fract-zone"></rect>
        <path d="${path}" fill="none" class="spark-line"></path>
      </svg>`;
  }

  // Simulación sencilla: Monte Carlo de 50k iteraciones client-side
  function monteCarloProbFractura(baseIHG, nti, steps = 48, sims = 50000) {
    // deriva negativa si NTI bajo → más prob. de caer bajo UCAP (-0.5)
    const mu = (nti - 0.5) * 0.02;   // deriva leve con NTI
    const sigma = 0.08;              // volatilidad
    let hits = 0;
    for (let s = 0; s < sims; s++) {
      let x = baseIHG;
      for (let t = 0; t < steps; t++) {
        // paso gaussiano aproximado (Box-Muller simple)
        const u1 = Math.random() || 1e-6;
        const u2 = Math.random() || 1e-6;
        const z = Math.sqrt(-2*Math.log(u1)) * Math.cos(2*Math.PI*u2);
        x = x + mu + sigma * z / Math.sqrt(steps);
        if (x < -0.5) { hits++; break; }
      }
    }
    return hits / sims;
  }

  function applyBlindMode(ihg, checked) {
    // BLIND MODE: más incertidumbre → penalización y ruido
    if (!checked) return ihg;
    const noise = (Math.random() - 0.5) * 0.06; // +/-0.03
    return clamp(ihg - 0.08 + noise, -1.5, 1.5);
  }

  async function main() {
    const data = await loadJSON(rel('{{ "/assets/data/ags_metrics.json" | relative_url }}'));

    // Estado base
    let ihg0 = data.headline;     // e.g., -0.62
    let nti0 = data.nti;          // e.g., 0.31
    let prob0 = data.prob_fractura_t4y; // e.g., 0.71

    // Pintar estado inicial
    renderHeadline(ihg0);
    renderNTI(nti0);
    renderProb(prob0);
    renderDims(data.dims || []);
    renderNodes(data.nodes || []);
    renderInterv(data.intervenciones || []);
    renderSpark(data.series || [], -0.5);

    // Toggle NTI / BLIND MODE
    const chk = document.getElementById('nti-toggle');
    const lbl = document.getElementById('nti-status');
    chk.addEventListener('change', () => {
      const ihgAdj = applyBlindMode(ihg0, chk.checked);
      const probAdj = monteCarloProbFractura(ihgAdj, nti0, 48, 50000);
      renderHeadline(ihgAdj);
      renderProb(probAdj);
      lbl.textContent = chk.checked ? 'BLIND MODE' : 'MODO ESTÁNDAR';
    });
  }

  // kick-off
  document.addEventListener('DOMContentLoaded', () => {
    main().catch(err => {
      console.error(err);
      const e = document.getElementById('sf-headline');
      if (e) e.textContent = 'ERR';
    });
  });
})();
>>>>>>> 4282b3e146dad83e33d8b8782314368300182522
