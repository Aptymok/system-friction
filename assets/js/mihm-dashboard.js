// mihm-dashboard.js — System Friction Framework v1.1
// Motor de visualización MIHM. Consume meta/*.json.
// Sin dependencias externas. Funciona con GitHub Pages (archivos estáticos).
// Prohibido: datos hardcodeados. Toda información proviene de JSON.

(function (SF) {
  'use strict';

  const BASE = SF.base || '';

  // ── Fetch helpers ──────────────────────────────────────────────────────────
  async function load(path) {
    const r = await fetch(BASE + path);
    if (!r.ok) throw new Error(path + ' → HTTP ' + r.status);
    return r.json();
  }

  // ── Status → CSS class ────────────────────────────────────────────────────
  const STATUS_MAP = {
    'OK': 'ok', 'DEGRADED': 'warn', 'CRITICAL': 'critical',
    'FRACTURE': 'fracture', 'OPAQUE': 'opaque', 'EMERGENCY_DECISION': 'emergency'
  };
  function cls(s) { return STATUS_MAP[s] || 'warn'; }

  // ── Contribution heat color ───────────────────────────────────────────────
  function heatColor(delta) {
    if (delta >= 0) return 'var(--sf-ok)';
    if (delta > -0.05) return 'var(--sf-warn)';
    if (delta > -0.15) return 'var(--sf-critical)';
    return 'var(--sf-fracture)';
  }

  // ── IHG gauge (SVG arc) ───────────────────────────────────────────────────
  function ihgGauge(value) {
    const min = -1.2, max = 0.2;
    const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
    const r = 40, cx = 50, cy = 55;
    const startAngle = -210, range = 240;
    const angle = startAngle + pct * range;
    function polar(a, radius) {
      const rad = (a - 90) * Math.PI / 180;
      return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
    }
    function arc(a1, a2, radius) {
      const [x1, y1] = polar(a1, radius);
      const [x2, y2] = polar(a2, radius);
      const large = (a2 - a1 + 360) % 360 > 180 ? 1 : 0;
      return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
    }
    const color = value < -0.5 ? '#b91c1c' : value < -0.3 ? '#b45309' : '#16653a';
    return `<svg viewBox="0 0 100 80" width="120" height="96">
      <path d="${arc(-210, 30, r)}" stroke="#2a2a24" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="${arc(-210, angle, r)}" stroke="${color}" stroke-width="8" fill="none" stroke-linecap="round"/>
      <text x="50" y="52" text-anchor="middle" font-size="14" font-family="JetBrains Mono,monospace" fill="${color}" font-weight="500">${value.toFixed(3)}</text>
      <text x="50" y="66" text-anchor="middle" font-size="6" font-family="JetBrains Mono,monospace" fill="#5a5750">IHG</text>
    </svg>`;
  }

  // ── Render: system headline ────────────────────────────────────────────────
  function renderHeadline(sys, el) {
    const ihg = sys.IHG_post;
    const nti = sys.NTI_post;
    const c = cls(sys.protocol_activated);
    el.innerHTML = `
      <div class="sf-metric-row">
        <div class="sf-metric-gauge">${ihgGauge(ihg)}</div>
        <div class="sf-metric-stats">
          <div class="sf-stat">
            <span class="sf-stat__label">IHG pre-fractura</span>
            <span class="sf-stat__val sf-c-warn">${sys.IHG_pre.toFixed(3)}</span>
          </div>
          <div class="sf-stat">
            <span class="sf-stat__label">IHG post-fractura</span>
            <span class="sf-stat__val sf-c-crit">${ihg.toFixed(3)}</span>
          </div>
          <div class="sf-stat">
            <span class="sf-stat__label">NTI</span>
            <span class="sf-stat__val sf-c-crit">${nti.toFixed(3)}</span>
          </div>
          <div class="sf-stat">
            <span class="sf-stat__label">IHG × NTI</span>
            <span class="sf-stat__val sf-c-dim">${sys.IHG_corrected.toFixed(3)}</span>
          </div>
          <div class="sf-stat">
            <span class="sf-stat__label">P(colapso 2030)</span>
            <span class="sf-stat__val sf-c-fracture">${(sys.prob_collapse_2030 * 100).toFixed(0)}%</span>
          </div>
        </div>
        <div class="sf-metric-protocol">
          <span class="sf-badge sf-badge--${c}">${sys.protocol_activated.replace(/_/g,' ')}</span>
          <div class="sf-protocol-thresholds">
            <span>UCAP IHG: ${sys.ucap_threshold}</span>
            <span>UCAP NTI: ${sys.nti_ucap_threshold}</span>
          </div>
        </div>
      </div>`;
  }

  // ── Render: node table ─────────────────────────────────────────────────────
  function renderNodes(nodes, patterns, el) {
    const pmap = {};
    (patterns || []).forEach(p => { pmap[p.id] = p; });
    const rows = Object.entries(nodes).map(([id, n]) => {
      const patLinks = (n.pattern_refs || []).map(pid => {
        const p = pmap[pid];
        return p ? `<a href="${p.url}" title="${p.title}">${pid}</a>` : pid;
      }).join(' ');
      const barW = Math.min(100, Math.abs(n.friction / 3) * 100).toFixed(0);
      const barColor = n.friction > 2 ? '#b91c1c' : n.friction > 1 ? '#b45309' : '#16653a';
      return `<tr>
        <td class="sf-mono">${id}</td>
        <td>${n.label}</td>
        <td class="sf-mono">${n.C.toFixed(2)}</td>
        <td class="sf-mono">${n.E.toFixed(2)}</td>
        <td class="sf-mono">${n.L.toFixed(2)}</td>
        <td class="sf-mono">${n.M.toFixed(2)}</td>
        <td class="sf-mono">
          <div style="display:flex;align-items:center;gap:0.4rem">
            <span>${n.friction.toFixed(2)}</span>
            <div style="flex:1;height:3px;background:#1c1c18;border-radius:2px;max-width:60px">
              <div style="width:${barW}%;height:100%;background:${barColor};border-radius:2px"></div>
            </div>
          </div>
        </td>
        <td><span class="sf-badge sf-badge--${cls(n.status)}">${n.status}</span></td>
        <td class="sf-mono" style="color:${heatColor(n.ihg_contribution)}">${n.ihg_contribution > 0 ? '+' : ''}${n.ihg_contribution.toFixed(3)}</td>
        <td class="sf-mono sf-links">${patLinks}</td>
      </tr>`;
    }).join('');
    el.innerHTML = `<table class="sf-table sf-table--nodes">
      <thead><tr>
        <th>Nodo</th><th>Etiqueta</th>
        <th>C<sub>i</sub></th><th>E<sub>i</sub></th><th>L<sub>i</sub></th><th>M<sub>i</sub></th>
        <th>f</th><th>Estado</th><th>ΔIHG</th><th>Patrones</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  // ── Render: NTI bar chart ──────────────────────────────────────────────────
  function renderNTI(comps, total, el) {
    const items = [
      ['1 − LDI', 1 - comps.LDI_norm, 'Latencia decisión'],
      ['ICC',     comps.ICC_norm,      'Concentración conocimiento'],
      ['CSR',     comps.CSR,           'Cumplimiento reducción'],
      ['IRCI',    comps.IRCI_norm,     'Resiliencia capital'],
      ['IIM',     comps.IIM,           'Integridad métricas']
    ];
    const rows = items.map(([label, val, desc]) => {
      const pct = (val * 100).toFixed(0);
      const color = val < 0.3 ? '#b91c1c' : val < 0.6 ? '#b45309' : '#16653a';
      return `<div class="sf-nti-row">
        <span class="sf-nti-label">${label}</span>
        <div class="sf-nti-bar">
          <div class="sf-nti-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="sf-nti-val" style="color:${color}">${val.toFixed(3)}</span>
        <span class="sf-nti-desc">${desc}</span>
      </div>`;
    }).join('');
    el.innerHTML = `<div class="sf-nti-total">NTI = ${total.toFixed(3)} <span class="sf-badge sf-badge--critical">BLIND MODE</span></div>
      <div class="sf-nti-bars">${rows}</div>`;
  }

  // ── Render: Monte Carlo scenarios ─────────────────────────────────────────
  function renderScenarios(scenarios, el) {
    const cards = scenarios.map(s => {
      const pct = (s.prob * 100).toFixed(0);
      const c = s.prob > 0.35 ? 'critical' : s.prob > 0.2 ? 'warn' : 'ok';
      return `<div class="sf-scenario">
        <div class="sf-scenario__id">${s.id}</div>
        <div class="sf-scenario__label">${s.label}</div>
        <div class="sf-scenario__prob sf-c-${c}">${pct}%</div>
        <div class="sf-scenario__ihg">IHG@180d: ${s.ihg_180d.toFixed(2)}</div>
        <div class="sf-scenario__desc">${s.description}</div>
      </div>`;
    }).join('');
    el.innerHTML = `<div class="sf-scenarios">${cards}</div>`;
  }

  // ── Render: interventions ─────────────────────────────────────────────────
  function renderInterventions(items, patterns, el) {
    const pmap = {};
    (patterns || []).forEach(p => { pmap[p.id] = p; });
    const rows = items.map(i => {
      const p = pmap[i.pattern_addresses];
      const plink = p ? `<a href="${p.url}">${i.pattern_addresses}</a>` : i.pattern_addresses;
      return `<tr>
        <td class="sf-mono">${i.rank}</td>
        <td>${i.intervention}</td>
        <td class="sf-mono sf-c-ok">${i.ihg_delta}</td>
        <td class="sf-mono">${plink}</td>
        <td>${i.feasibility}</td>
      </tr>`;
    }).join('');
    el.innerHTML = `<table class="sf-table">
      <thead><tr><th>#</th><th>Intervención</th><th>ΔIHG</th><th>Patrón</th><th>Factibilidad</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  // ── Render: pattern→MIHM bridge ────────────────────────────────────────────
  function renderPatternBridge(patterns, nodes, el) {
    const nodeMap = {};
    Object.keys(nodes).forEach(id => { nodeMap[id] = nodes[id].label; });

    const critical = patterns.filter(p => p.friction_contribution === 'critical');
    const high = patterns.filter(p => p.friction_contribution === 'high');
    const observed = patterns.filter(p => p.observed_in_ags);

    const makeRow = p => {
      const c = {'critical':'critical','high':'warn','medium':'','low':'ok','none':''}[p.friction_contribution] || '';
      const vars = (p.mihm_variables || []).join(', ');
      const nodes_txt = (p.node_affinity || []).map(n => `${n}`).join(' ');
      return `<tr>
        <td class="sf-mono"><a href="${p.url}">${p.id}</a></td>
        <td>${p.title}</td>
        <td class="sf-mono">${vars}</td>
        <td>${p.friction_mechanism}</td>
        <td><span class="sf-badge sf-badge--${c}">${p.friction_contribution}</span></td>
        <td class="sf-mono">${nodes_txt}</td>
        <td class="sf-mono">${p.ags_ref ? `<a href="/nodo-ags/#${p.ags_ref}">${p.ags_ref}</a>` : '—'}</td>
      </tr>`;
    };

    el.innerHTML = `
      <div class="sf-bridge-summary">
        <span>${critical.length} patrones críticos</span>
        <span>${high.length} de alto impacto</span>
        <span>${observed.length} observados en AGS</span>
      </div>
      <table class="sf-table">
        <thead><tr><th>Doc</th><th>Patrón</th><th>Variables MIHM</th><th>Mecanismo</th><th>Fricción</th><th>Nodos</th><th>AGS</th></tr></thead>
        <tbody>${patterns.filter(p => p.friction_contribution !== 'none').map(makeRow).join('')}</tbody>
      </table>`;
  }

  // ── Recommendations engine ─────────────────────────────────────────────────
  function buildRecommendations(metrics, patterns) {
    const criticalNodes = Object.entries(metrics.nodes)
      .filter(([_, n]) => ['CRITICAL','FRACTURE','OPAQUE'].includes(n.status));
    const criticalPatterns = patterns.filter(p =>
      ['critical','high'].includes(p.friction_contribution) && p.observed_in_ags
    );
    return {
      immediate: criticalPatterns.slice(0, 3).map(p => ({
        pattern: p.id,
        title: p.title,
        url: p.url,
        reason: `Variables afectadas: ${p.mihm_variables.join(', ')}`,
        nodes: p.node_affinity
      })),
      monitor: criticalNodes.map(([id, n]) => ({
        node: id,
        label: n.label,
        status: n.status,
        friction: n.friction,
        patterns: n.pattern_refs
      }))
    };
  }

  function renderRecommendations(recs, el) {
    const docs = recs.immediate.map(r => `
      <div class="sf-rec">
        <div class="sf-rec__id">${r.pattern}</div>
        <a class="sf-rec__title" href="${r.url}">${r.title}</a>
        <div class="sf-rec__reason">${r.reason}</div>
        <div class="sf-rec__nodes">${r.nodes.join(' · ')}</div>
      </div>`).join('');
    const nodes = recs.monitor.map(n => `
      <div class="sf-rec sf-rec--node">
        <div class="sf-rec__id">${n.node}</div>
        <div class="sf-rec__title">${n.label}</div>
        <span class="sf-badge sf-badge--${n.status === 'CRITICAL' ? 'critical' : n.status === 'FRACTURE' ? 'fracture' : 'opaque'}">${n.status}</span>
        <div class="sf-rec__reason">f = ${n.friction.toFixed(2)}</div>
      </div>`).join('');
    el.innerHTML = `
      <div class="sf-recs-grid">
        <div>
          <div class="sf-section-label">Patrones a revisar ahora</div>
          ${docs}
        </div>
        <div>
          <div class="sf-section-label">Nodos en monitor</div>
          ${nodes}
        </div>
      </div>`;
  }

  // ── Main init ──────────────────────────────────────────────────────────────
  async function init() {
    // Update loading states
    document.querySelectorAll('[data-sf-load]').forEach(el => {
      el.innerHTML = '<span class="sf-loading">—</span>';
    });

    let metrics, patterns;
    try {
      [metrics, patterns] = await Promise.all([
        load('/meta/ags_metrics.json'),
        load('/meta/patterns.json')
      ]);
    } catch (e) {
      document.querySelectorAll('[data-sf-load]').forEach(el => {
        el.innerHTML = `<span class="sf-error">${e.message}</span>`;
      });
      return;
    }

    const pats = patterns.patterns || [];

    // Update nav IHG badge
    const navBadge = document.getElementById('sf-nav-ihg');
    if (navBadge) navBadge.textContent = `IHG ${metrics.system.IHG_post.toFixed(3)}`;

    const handlers = {
      'sf-headline':         el => renderHeadline(metrics.system, el),
      'sf-nodes':            el => renderNodes(metrics.nodes, pats, el),
      'sf-nti':              el => renderNTI(metrics.nti_components, metrics.system.NTI_post, el),
      'sf-scenarios':        el => renderScenarios(metrics.monte_carlo_scenarios, el),
      'sf-interventions':    el => renderInterventions(metrics.interventions_ranked, pats, el),
      'sf-pattern-bridge':   el => renderPatternBridge(pats, metrics.nodes, el),
      'sf-recommendations':  el => {
        const recs = buildRecommendations(metrics, pats);
        renderRecommendations(recs, el);
      }
    };

    Object.entries(handlers).forEach(([id, fn]) => {
      const el = document.getElementById(id);
      if (el) fn(el);
    });

    // Active nav
    const path = window.location.pathname;
    document.querySelectorAll('.sf-nav a').forEach(a => {
      const href = a.getAttribute('href');
      if (href && path.startsWith(href) && href !== '/') a.classList.add('active');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window.SF || (window.SF = {}));
