// Dashboard MIHM v1.2 - Carga datos en tiempo real
(function () {
  async function loadJSON(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function renderHeadline(ihg) {
    const el = document.getElementById('sf-headline');
    if (!el) return;
    el.textContent = ihg.toFixed(3);
    el.className = ihg < -0.5 ? 'c-cr' : (ihg < -0.25 ? 'c-am' : 'c-ok');
  }

  function renderNTI(nti) {
    const el = document.getElementById('sf-nti');
    if (!el) return;
    el.textContent = nti.toFixed(3);
    el.className = nti < 0.4 ? 'c-cr' : (nti < 0.55 ? 'c-am' : 'c-ok');
  }

  function renderProb(p) {
    const el = document.getElementById('sf-prob');
    if (!el) return;
    el.textContent = `${Math.round(p * 100)}%`;
    el.className = p > 0.6 ? 'c-cr' : (p > 0.4 ? 'c-am' : 'c-ok');
  }

  function renderDims(dims) {
    const wrap = document.getElementById('sf-dims');
    if (!wrap) return;
    wrap.innerHTML = '';
    (dims || []).forEach(d => {
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
    if (!tb) return;
    tb.innerHTML = '';
    (nodes || []).forEach(n => {
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
    if (!wrap) return;
    wrap.innerHTML = '';
    (arr || []).forEach(x => {
      const it = document.createElement('div');
      it.className = 'interv-item';
      const delta = x['Δf'] || x.delta || 0;
      it.innerHTML = `
        <div class="interv-name">${x.n}</div>
        <div class="interv-meta">Δf: ${delta.toFixed(2)} · impacto: ${x.impacto}</div>
      `;
      wrap.appendChild(it);
    });
  }

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
      const data = await loadJSON(window.dataUrl || '/assets/data/ags_metrics.json');
      
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
