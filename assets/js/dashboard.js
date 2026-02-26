// Dashboard MIHM v2.0 — System Friction Framework v1.1
// Consume: assets/data/ags_metrics.json
// Política: Prohibido simulación no-exocáustica. Solo Monte Carlo.

(function () {
  'use strict';

  // ---------- Utilidades ----------
  const METRICS_URL = (typeof window !== 'undefined' && window.SF_METRICS_URL)
    ? window.SF_METRICS_URL
    : '/assets/data/ags_metrics.json';

  const STATUS_CLASSES = {
    'OK': 'ok',
    'DEGRADED': 'degraded',
    'CRITICAL': 'critical',
    'FRACTURE': 'fracture',
    'OPAQUE': 'opaque',
    'EMERGENCY_DECISION': 'emergency',
    'WARN': 'warn'
  };

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const fmt = (n, d = 3) => (typeof n === 'number' && isFinite(n)) ? n.toFixed(d) : '—';
  const pctFmt = (n, d = 1) => (typeof n === 'number' && isFinite(n)) ? (n * 100).toFixed(d) + '%' : '—';
  const safe = (s) => (s == null) ? '' : String(s);
  const byId = (id) => document.getElementById(id);

  function badge(status) {
    const key = String(status || '').toUpperCase();
    const cls = STATUS_CLASSES[key] || 'warn';
    return `<span class="badge ${cls}" title="${safe(key)}">${safe(key)}</span>`;
  }

  // Gauge SVG simple (tipo donut)
  function gauge(value, maxAbs, colorVar) {
    const v = (typeof value === 'number' && isFinite(value)) ? value : 0;
    const m = (typeof maxAbs === 'number' && isFinite(maxAbs) && maxAbs > 0) ? maxAbs : 1;
    const pct = clamp01(Math.abs(v / m));
    const size = 64;
    const stroke = 8;
    const r = (size / 2) - stroke;
    const c = 2 * Math.PI * r;
    const dash = (c * pct).toFixed(2);
    const offset = (c - dash).toFixed(2);
    const text = (m === 1) ? pctFmt(v, 0) : fmt(v, 2);

    return `
      <svg class="gauge" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Gauge ${text}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="${stroke}"></circle>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none"
                stroke="${colorVar || 'var(--accent)'}" stroke-width="${stroke}"
                stroke-dasharray="${dash} ${offset}" stroke-linecap="round"
                transform="rotate(-90 ${size / 2} ${size / 2})"></circle>
        <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" class="gauge-text">${safe(text)}</text>
      </svg>
    `;
  }

  function severityClass({ value, warn, crit, reverse = false }) {
    // reverse=true => valores más bajos son peores (p.ej. NTI componentes)
    if (!isFinite(value)) return 'opaque';
    if (!reverse) {
      if (value < crit) return 'critical';
      if (value < warn) return 'warn';
      return 'ok';
    } else {
      if (value < crit) return 'ok';      // bajo es bueno
      if (value < warn) return 'warn';
      return 'critical';
    }
  }

  // ---------- Renderers ----------
  function renderSystemCards(sys, container) {
    const IHG_pre = Number(sys.IHG_pre);
    const IHG_post = Number(sys.IHG_post);
    const IHG_corrected = Number(sys.IHG_corrected);
    const IHG_after_telemetry = Number(sys.IHG_after_telemetry);
    const NTI_post = Number(sys.NTI_post);
    const prob2030 = Number(sys.prob_collapse_2030);

    const ihgClass = severityClass({ value: IHG_post, warn: -0.3, crit: -0.5 });
    const ntiClass = severityClass({ value: NTI_post, warn: 0.6, crit: 0.4 });

    const ucaps = {
      ucapIHG: '−0.500',
      ucapNTI: '0.400',
      lN6: '0.85 → 0.43',
      mc: 'Monte Carlo 50k iter. seed=42',
      poisson: 'Proceso Poisson λ=0.1'
    };

    container.innerHTML = `
      <section class="sys-cards">
        <article class="card ihg-pre ok">
          <h3>IHG — Pre-fractura</h3>
          <div class="value">${fmt(IHG_pre)}</div>
          <div class="sub">Basal · ${safe(sys.t_pre || '—')}</div>
          <div class="g">${gauge(IHG_pre, 1.5, 'var(--warn)')}</div>
          <div class="meta">UCAP: ${ucaps.ucapIHG}</div>
        </article>

        <article class="card ihg-post ${ihgClass}">
          <h3>IHG — Post-fractura</h3>
          <div class="value">${fmt(IHG_post)}</div>
          <div class="sub">Shock exógeno · ${safe(sys.t_post || '—')}</div>
          <div class="g">${gauge(IHG_post, 1.5, 'var(--crit)')}</div>
          <div class="meta">${badge('EMERGENCY_DECISION')}</div>
        </article>

        <article class="card nti-post ${ntiClass}">
          <h3>NTI — Post-fractura</h3>
          <div class="value">${fmt(NTI_post)}</div>
          <div class="sub">Sistema en modo CIEGO</div>
          <div class="g">${gauge(NTI_post, 1, 'var(--crit)')}</div>
          <div class="meta">UCAP: ${ucaps.ucapNTI}</div>
        </article>

        <article class="card ihg-corrected">
          <h3>IHG Corregido (NTI)</h3>
          <div class="value">${fmt(IHG_corrected)}</div>
          <div class="sub">IHG × NTI</div>
          <div class="g">${gauge(IHG_corrected, 1.5, 'var(--text-muted)')}</div>
          <div class="meta">Con datos degradados</div>
        </article>

        <article class="card ihg-telemetry warn">
          <h3>IHG + Telemetría N6</h3>
          <div class="value">${fmt(IHG_after_telemetry)}</div>
          <div class="sub">L_N6: ${ucaps.lN6}</div>
          <div class="g">${gauge(IHG_after_telemetry, 1.5, 'var(--warn)')}</div>
          <div class="meta">+0.12 sobre post-fractura</div>
        </article>

        <article class="card collapse fracture">
          <h3>Prob. Colapso 2030</h3>
          <div class="value">${pctFmt(prob2030)}</div>
          <div class="sub">${ucaps.mc}</div>
          <div class="g">${gauge(prob2030, 1, 'var(--fracture)')}</div>
          <div class="meta">${ucaps.poisson}</div>
        </article>
      </section>
    `;
  }

  function renderNodeTable(nodes, container) {
    const rows = Object.entries(nodes || {}).map(([id, n]) => {
      const C = Number(n.C), E = Number(n.E), L = Number(n.L), M = Number(n.M);
      const fr = Number(n.friction);
      const dIHG = Number(n.ihg_contribution);
      const st = (n.status || '').toString().toUpperCase();

      const sev = severityClass({ value: fr, warn: 0.6, crit: 0.3, reverse: true });
      return `
        <tr class="${sev}">
          <td class="mono">${safe(id)}</td>
          <td>${safe(n.label)}</td>
          <td class="num">${fmt(C, 2)}</td>
          <td class="num">${fmt(E, 2)}</td>
          <td class="num">${fmt(L, 2)}</td>
          <td class="num">${fmt(M, 2)}</td>
          <td class="num">${fmt(fr, 2)}</td>
          <td>${badge(st)}</td>
          <td class="num ${dIHG >= 0 ? 'pos' : 'neg'}">${dIHG >= 0 ? '+' : ''}${fmt(dIHG)}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="sf-table">
        <thead>
          <tr>
            <th>Nodo</th>
            <th>Etiqueta</th>
            <th>Ci</th>
            <th>Ei</th>
            <th>Li</th>
            <th>Mi</th>
            <th>Fricción f</th>
            <th>Estado</th>
            <th>ΔIHG</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  function renderScenarios(scenarios, container) {
    const cards = (scenarios || []).map((s) => {
      const prob = Number(s.prob);
      const sev = severityClass({ value: prob, warn: 0.2, crit: 0.35 }); // >0.35 crítico
      return `
        <article class="scenario ${sev}">
          <header class="scenario__head">
            <span class="scenario__id mono">${safe(s.id)}</span>
            <h4 class="scenario__label">${safe(s.label)}</h4>
            <div class="scenario__prob">${pctFmt(prob, 0)}</div>
          </header>
          <p class="scenario__desc">${safe(s.description)}</p>
          <footer class="scenario__foot">
            <span>IHG@180d: <strong>${fmt(Number(s.ihg_180d), 2)}</strong></span>
          </footer>
        </article>
      `;
    }).join('');

    container.innerHTML = `<section class="scenarios">${cards}</section>`;
  }

  function renderInterventions(interventions, container) {
    const rows = (interventions || []).map((i) => {
      const gateLabel = (i.gate || '').toString().toUpperCase().replace('PASS','OK');
      return `
        <tr>
          <td class="mono">${safe(i.rank)}</td>
          <td>${safe(i.intervention)}</td>
          <td class="num">${fmt(Number(i.ihg_delta), 3)}</td>
          <td>${badge(gateLabel)}</td>
          <td>${safe(i.feasibility)}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="sf-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Intervención</th>
            <th>ΔIHG</th>
            <th>Gate</th>
            <th>Factibilidad</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function renderNTI(nti, container) {
    const comps = [
      { label: '1 − LDI_n', value: 1 - (Number(nti?.LDI_norm) || 0), note: 'Latencia decisión', reverse: false },
      { label: 'ICC_n',    value: Number(nti?.ICC_norm) || 0,         note: 'Concentración conocimiento', reverse: false },
      { label: 'CSR',      value: Number(nti?.CSR) || 0,              note: 'Cumplimiento reducción', reverse: false },
      { label: 'IRCI_n',   value: Number(nti?.IRCI_norm) || 0,        note: 'Resiliencia capital inst.', reverse: false },
      { label: 'IIM',      value: Number(nti?.IIM) || 0,              note: 'Integridad métricas', reverse: false },
    ];

    const rows = comps.map((c) => {
      const cls = severityClass({ value: c.value, warn: 0.6, crit: 0.3 });
      return `
        <tr class="${cls}">
          <td>${safe(c.label)}</td>
          <td class="num">${fmt(c.value, 3)}</td>
          <td class="muted">${safe(c.note)}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <table class="sf-table">
        <thead>
          <tr>
            <th>Componente</th>
            <th>Valor</th>
            <th>Descripción</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  // ---------- Init ----------
  async function init() {
    const loadingEls = document.querySelectorAll('.sf-loading');
    loadingEls.forEach(el => el.textContent = 'Cargando métricas...');

    let data;
    try {
      const res = await fetch(METRICS_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (err) {
      loadingEls.forEach(el => {
        el.textContent = `Error cargando métricas: ${err.message}`;
        el.style.color = 'var(--crit)';
      });
      console.error('[SF] metrics load failed:', err);
      return;
    }

    // Nav IHG
    const navIhg = byId('nav-ihg');
    if (navIhg && data?.system?.IHG_post != null) {
      navIhg.textContent = `IHG: ${fmt(Number(data.system.IHG_post))} [EMERGENCY]`;
    }

    // System
    const sysCards = byId('dashboard-system');
    if (sysCards) renderSystemCards(data.system || {}, sysCards);

    // Nodes
    const nodeTable = byId('dashboard-nodes');
    if (nodeTable) renderNodeTable(data.nodes || {}, nodeTable);

    // Scenarios
    const scenariosEl = byId('dashboard-scenarios');
    if (scenariosEl) renderScenarios(data.monte_carlo_scenarios || [], scenariosEl);

    // Interventions
    const interventionsEl = byId('dashboard-interventions');
    if (interventionsEl) renderInterventions(data.interventions_ranked || [], interventionsEl);

    // NTI
    const ntiEl = byId('dashboard-nti');
    if (ntiEl) renderNTI(data.nti_components || {}, ntiEl);

    // Active nav (robusto)
    const currentPath = (location.pathname || '/').replace(/\/+$/, '') || '/';
    document.querySelectorAll('.audit-nav__links a').forEach(a => {
      const href = (a.getAttribute('href') || '').replace(/\/+$/, '') || '/';
      if (href !== '/' && currentPath.includes(href)) a.classList.add('active');
      if (href === '/' && currentPath === '/') a.classList.add('active');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();