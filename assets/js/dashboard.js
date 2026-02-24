// Dashboard MIHM v2.0 — System Friction Framework v1.1
// Consume: assets/data/ags_metrics.json
// Prohibido: simulación no-exocáustica. Solo Monte Carlo.

(function () {
  'use strict';

  const METRICS_URL = window.SF_METRICS_URL || '/assets/data/ags_metrics.json';

  const STATUS_CLASSES = {
    'OK':       'ok',
    'DEGRADED': 'degraded',
    'CRITICAL': 'critical',
    'FRACTURE': 'fracture',
    'OPAQUE':   'opaque',
    'EMERGENCY_DECISION': 'emergency'
  };

  function badge(status) {
    const cls = STATUS_CLASSES[status] || 'warn';
    return `<span class="badge badge--${cls}">${status}</span>`;
  }

  function gauge(value, max, color) {
    const pct = Math.min(Math.abs(value / max) * 100, 100).toFixed(1);
    return `<div class="sf-gauge-wrap">
      <div class="sf-gauge-bar">
        <div class="sf-gauge-fill" style="width:${pct}%;background:${color}"></div>
      </div>
    </div>`;
  }

  function renderSystemCards(sys, container) {
    const ihgClass = sys.IHG_post < -0.5 ? 'critical' : sys.IHG_post < -0.3 ? 'warn' : 'ok';
    const ntiClass = sys.NTI_post < 0.4 ? 'critical' : sys.NTI_post < 0.6 ? 'warn' : 'ok';

    container.innerHTML = `
      <div class="sf-cards">
        <div class="sf-card">
          <div class="sf-card__label">IHG — Pre-fractura</div>
          <div class="sf-card__value sf-card__value--warn">${sys.IHG_pre.toFixed(3)}</div>
          <div class="sf-card__sub">21 feb 2026 — Basal</div>
          ${gauge(sys.IHG_pre, -1.5, 'var(--warn)')}
          <div class="sf-card__threshold">UCAP: −0.500</div>
        </div>
        <div class="sf-card">
          <div class="sf-card__label">IHG — Post-fractura</div>
          <div class="sf-card__value sf-card__value--${ihgClass}">${sys.IHG_post.toFixed(3)}</div>
          <div class="sf-card__sub">23 feb 2026 — Shock exógeno</div>
          ${gauge(sys.IHG_post, -1.5, 'var(--crit)')}
          <div class="sf-card__threshold">${badge('EMERGENCY_DECISION')}</div>
        </div>
        <div class="sf-card">
          <div class="sf-card__label">NTI — Post-fractura</div>
          <div class="sf-card__value sf-card__value--${ntiClass}">${sys.NTI_post.toFixed(3)}</div>
          <div class="sf-card__sub">Sistema en modo CIEGO</div>
          ${gauge(sys.NTI_post, 1, 'var(--crit)')}
          <div class="sf-card__threshold">UCAP: 0.400</div>
        </div>
        <div class="sf-card">
          <div class="sf-card__label">IHG Corregido (NTI)</div>
          <div class="sf-card__value sf-card__value--muted">${sys.IHG_corrected.toFixed(3)}</div>
          <div class="sf-card__sub">IHG × NTI</div>
          ${gauge(sys.IHG_corrected, -1.5, 'var(--text-muted)')}
          <div class="sf-card__threshold">Con datos degradados</div>
        </div>
        <div class="sf-card">
          <div class="sf-card__label">IHG + Telemetría N6</div>
          <div class="sf-card__value sf-card__value--warn">${sys.IHG_after_telemetry.toFixed(3)}</div>
          <div class="sf-card__sub">L_N6: 0.85 → 0.43</div>
          ${gauge(sys.IHG_after_telemetry, -1.5, 'var(--warn)')}
          <div class="sf-card__threshold">+0.12 sobre post-fractura</div>
        </div>
        <div class="sf-card">
          <div class="sf-card__label">Prob. Colapso 2030</div>
          <div class="sf-card__value sf-card__value--critical">${(sys.prob_collapse_2030 * 100).toFixed(1)}%</div>
          <div class="sf-card__sub">Monte Carlo 50k iter. seed=42</div>
          ${gauge(sys.prob_collapse_2030, 1, 'var(--fracture)')}
          <div class="sf-card__threshold">Proceso Poisson λ=0.1</div>
        </div>
      </div>
    `;
  }

  function renderNodeTable(nodes, container) {
    const rows = Object.entries(nodes).map(([id, n]) => `
      <tr>
        <td><strong>${id}</strong></td>
        <td>${n.label}</td>
        <td>${n.C.toFixed(2)}</td>
        <td>${n.E.toFixed(2)}</td>
        <td>${n.L.toFixed(2)}</td>
        <td>${n.M.toFixed(2)}</td>
        <td>${n.friction.toFixed(2)}</td>
        <td>${badge(n.status)}</td>
        <td style="color:${n.ihg_contribution < 0 ? 'var(--crit)' : 'var(--ok)'}">${n.ihg_contribution > 0 ? '+' : ''}${n.ihg_contribution.toFixed(3)}</td>
      </tr>
    `).join('');

    container.innerHTML = `
      <table class="sf-table">
        <thead>
          <tr>
            <th>Nodo</th><th>Etiqueta</th>
            <th>C<sub>i</sub></th><th>E<sub>i</sub></th>
            <th>L<sub>i</sub></th><th>M<sub>i</sub></th>
            <th>Fricción f</th><th>Estado</th><th>ΔIHG</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function renderScenarios(scenarios, container) {
    const cards = scenarios.map(s => {
      const probClass = s.prob > 0.35 ? 'critical' : s.prob > 0.2 ? 'warn' : 'ok';
      return `
        <div class="sf-scenario">
          <div class="sf-scenario__id">${s.id}</div>
          <div class="sf-scenario__label">${s.label}</div>
          <div class="sf-scenario__prob sf-card__value--${probClass}">${(s.prob * 100).toFixed(0)}%</div>
          <div class="sf-scenario__desc">${s.description}</div>
          <div style="font-family:var(--font-mono);font-size:0.6rem;color:var(--text-muted);margin-top:0.4rem">
            IHG@180d: ${s.ihg_180d.toFixed(2)}
          </div>
        </div>
      `;
    }).join('');
    container.innerHTML = `<div class="sf-scenarios">${cards}</div>`;
  }

  function renderInterventions(interventions, container) {
    const rows = interventions.map(i => `
      <tr>
        <td>${i.rank}</td>
        <td>${i.intervention}</td>
        <td style="color:var(--ok)">${i.ihg_delta}</td>
        <td>${badge(i.gate.replace('H', 'H').replace('PASS','OK') || i.gate)}</td>
        <td>${i.feasibility}</td>
      </tr>
    `).join('');
    container.innerHTML = `
      <table class="sf-table">
        <thead><tr><th>#</th><th>Intervención</th><th>ΔIHG</th><th>Gate</th><th>Factibilidad</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function renderNTI(nti, container) {
    const comps = [
      { label: '1 − LDI_n', value: 1 - nti.LDI_norm, note: 'Latencia decisión' },
      { label: 'ICC_n',     value: nti.ICC_norm,       note: 'Concentración conocimiento' },
      { label: 'CSR',       value: nti.CSR,            note: 'Cumplimiento reducción' },
      { label: 'IRCI_n',    value: nti.IRCI_norm,      note: 'Resiliencia capital inst.' },
      { label: 'IIM',       value: nti.IIM,            note: 'Integridad métricas' }
    ];
    const rows = comps.map(c => {
      const cls = c.value < 0.3 ? 'critical' : c.value < 0.6 ? 'warn' : 'ok';
      return `<tr>
        <td>${c.label}</td>
        <td class="sf-card__value--${cls}" style="font-family:var(--font-mono)">${c.value.toFixed(3)}</td>
        <td>${c.note}</td>
      </tr>`;
    }).join('');
    container.innerHTML = `
      <table class="sf-table">
        <thead><tr><th>Componente</th><th>Valor</th><th>Descripción</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  async function init() {
    const loadingEls = document.querySelectorAll('.sf-loading');
    loadingEls.forEach(el => el.textContent = 'Cargando métricas...');

    let data;
    try {
      const res = await fetch(METRICS_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (err) {
      loadingEls.forEach(el => {
        el.textContent = `Error cargando métricas: ${err.message}`;
        el.style.color = 'var(--crit)';
      });
      return;
    }

    // Update IHG in nav
    const navIhg = document.getElementById('nav-ihg');
    if (navIhg) {
      navIhg.textContent = `IHG: ${data.system.IHG_post.toFixed(3)} [EMERGENCY]`;
    }

    // System cards
    const sysCards = document.getElementById('dashboard-system');
    if (sysCards) renderSystemCards(data.system, sysCards);

    // Node table
    const nodeTable = document.getElementById('dashboard-nodes');
    if (nodeTable) renderNodeTable(data.nodes, nodeTable);

    // Scenarios
    const scenariosEl = document.getElementById('dashboard-scenarios');
    if (scenariosEl) renderScenarios(data.monte_carlo_scenarios, scenariosEl);

    // Interventions
    const interventionsEl = document.getElementById('dashboard-interventions');
    if (interventionsEl) renderInterventions(data.interventions_ranked, interventionsEl);

    // NTI components
    const ntiEl = document.getElementById('dashboard-nti');
    if (ntiEl) renderNTI(data.nti_components, ntiEl);

    // Mark active nav link
    const currentPath = window.location.pathname;
    document.querySelectorAll('.audit-nav__links a').forEach(a => {
      if (a.getAttribute('href') === currentPath ||
          (currentPath.includes(a.getAttribute('href')) && a.getAttribute('href') !== '/')) {
        a.classList.add('active');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
