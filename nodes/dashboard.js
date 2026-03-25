'use strict';

const MIHM = {

  /* Normalización por variable */
  normalize: {
    F_s:   v => Math.min(v / 2.0, 1.0),
    I_mc:  v => Math.max(0, Math.min(1, v)),
    E_r:   (v, max) => Math.max(0, Math.min(1, v / (max || 1))),
    D_i:   v => 1 / (1 + Math.exp(-4 * (v - 0.5))),
    G_f:   v => Math.min(Math.abs(v), 1.0),
    C_s:   (D_o, R_o) => {
      const eps = 0.01;
      const denom = Math.max(D_o, eps);
      return Math.max(0, Math.min(1, 1 - Math.abs(D_o - R_o) / denom));
    },
    D_cog: v => Math.min(v / 2.0, 1.0),
    R_sem: v => Math.max(0, Math.min(1, v)),
    V_i:   v => Math.max(0, Math.min(1, v)),
    C_sem: v => Math.max(0, Math.min(1, v)),
    Phi:   (v, max) => Math.max(0, Math.min(1, v / (max || 1))),
  },

  /* Pesos directos por variable */
  weights: {
    F_s: 0.10, G_f: 0.10,
    D_i: 0.075, D_cog: 0.075,
    I_mc: 0.0833, E_r: 0.0833, V_i: 0.0833,
    R_sem: 0.10, C_sem: 0.10,
    C_s: 0.10, Phi: 0.10,
  },

  /* Términos de interacción (penalizaciones multiplicativas) */
  interactions: [
    { id: 'friction_coherence',       w: 0.10, fn: x => x.F_s * x.C_s,              label: 'F_s × C_s' },
    { id: 'density_energy',           w: 0.10, fn: x => x.D_i * (1 - x.E_r),        label: 'D_i × (1−E_r)' },
    { id: 'cognitive_semantic_delay', w: 0.10, fn: x => x.D_cog * (1 - x.R_sem),    label: 'D_cog × (1−R_sem)' },
    { id: 'gradient_intent',          w: 0.10, fn: x => x.G_f * (1 - x.V_i),        label: 'G_f × (1−V_i)' },
    { id: 'semantic_cognitive_field', w: 0.10, fn: x => x.C_sem * x.Phi,            label: 'C_sem × Φ' },
  ],

  /**
   * calculateIHG(norm_vars) → { ihg, terms, interactions_sum }
   * norm_vars: objeto con todas las variables ya normalizadas a [0,1]
   */
  calculateIHG(n) {
    // Constraint: R_sem <= C_sem
    if (n.R_sem > n.C_sem) n.R_sem = n.C_sem;

    const terms = {};
    let direct_sum = 0;
    for (const [v, w] of Object.entries(this.weights)) {
      const val = n[v] !== undefined ? n[v] : 0;
      terms[v] = w * val;
      direct_sum += terms[v];
    }

    let int_sum = 0;
    const int_terms = {};
    for (const t of this.interactions) {
      const val = Math.max(0, t.fn(n));
      int_terms[t.id] = { value: val, penalty: t.w * val, label: t.label };
      int_sum += t.w * val;
    }

    // Cap interaction penalty
    const penalty = Math.min(int_sum, 0.5);
    const ihg = Math.max(-0.5, Math.min(1.0, direct_sum - penalty));

    return { ihg, direct_sum, penalty, terms, int_terms };
  },

  /**
   * Filtro temporal de primer orden
   * IHG_s(t) = alpha * IHG(t) + (1 - alpha) * IHG_s(t-1)
   */
  smooth(ihg_current, ihg_prev, alpha = 0.30) {
    if (ihg_prev === null || ihg_prev === undefined) return ihg_current;
    return alpha * ihg_current + (1 - alpha) * ihg_prev;
  },

  /** Condición UCAP */
  checkUCAP(ihg_s, g_f, consecutive_below = 0) {
    const byThreshold = ihg_s < -0.40 && consecutive_below >= 3;
    const byGradient = g_f >= 0.70;
    return byThreshold || byGradient;
  },

  /** Corrección por integridad de señal */
  ntiCorrection(ihg, nti) {
    if (nti < 0.40) return ihg * (1 - nti);
    return ihg;
  },

  /** Estado operativo dado IHG_s */
  getState(ihg_s) {
    if (ihg_s >= 0.50)  return { id: 'S0', label: 'HOMEOSTASIS',     color: 'ok',       protocol: 'Monitoreo estándar' };
    if (ihg_s >= 0.20)  return { id: 'S1', label: 'OPERATIVO',       color: 'ok',       protocol: 'Monitoreo estándar' };
    if (ihg_s >= 0.00)  return { id: 'S2', label: 'ALERTA AMARILLA', color: 'amarilla', protocol: 'Revisión activa' };
    if (ihg_s >= -0.20) return { id: 'S3', label: 'ALERTA NARANJA',  color: 'naranja',  protocol: 'Intervención directa' };
    if (ihg_s >= -0.40) return { id: 'S4', label: 'ALERTA ROJA',     color: 'roja',     protocol: 'Protocolo emergencia' };
    return               { id: 'S5', label: 'EMERGENCY_DECISION', color: 'ucap',     protocol: 'UCAP ACTIVADO' };
  },
};


/* ─────────────────────────────────────────────────────────────────
   2. NTI — Nodo de Trazabilidad Institucional
───────────────────────────────────────────────────────────────── */

const NTI = {
  calculate(ldi_norm, icc_norm, csr, irci_norm, iim) {
    return (1 / 5) * ((1 - ldi_norm) + icc_norm + csr + irci_norm + iim);
  },

  getDecisionGate(nti) {
    if (nti >= 0.70) return { level: 'LIBRE',     label: 'Decisiones estructurales habilitadas',   color: 'ok' };
    if (nti >= 0.50) return { level: 'CONGELADA', label: 'Estructural reversible con bandera',      color: 'amarilla' };
    if (nti >= 0.30) return { level: 'TÁCTICA',   label: 'Solo táctica con documentación explícita', color: 'naranja' };
    return            { level: 'CIEGA',     label: 'BLIND MODE — solo override H3',          color: 'ucap' };
  },
};


/* ─────────────────────────────────────────────────────────────────
   3. DATOS DE REFERENCIA — NODO AGS
   Valores empíricos validados. Caso fundacional del sistema.
───────────────────────────────────────────────────────────────── */

const AGS = {
  meta: {
    name: 'Nodo Aguascalientes',
    id: 'nodo-ags',
    event: 'Post-fractura pacto no escrito · 22-23 feb 2026',
    days: 136,
    final_ihg: -0.620,
    final_nti: 0.351,
    final_state: 'EMERGENCY_DECISION',
  },

  stages: [
    {
      id: 'ags-01', label: 'AGS-01 · Baseline',
      date: '2024-02-15', stage_name: 'Equilibrio implícito activo',
      ihg: -0.15, nti: 0.85,
      vars: { F_s: 0.28, I_mc: 0.92, E_r: 0.85, D_i: 0.30, G_f: 0.15,
              C_s: 0.72, D_cog: 0.20, R_sem: 0.68, V_i: 0.75, C_sem: 0.70, Phi: 0.65 },
      nti_components: { LDI: 0.15, ICC: 0.85, CSR: 0.92, IRCI: 0.90, IIM: 0.85 },
    },
    {
      id: 'ags-02', label: 'AGS-02 · Crisis Onset',
      date: '2024-02-23', stage_name: 'Narcobloqueos iniciales',
      ihg: -0.28, nti: 0.72,
      vars: { F_s: 0.45, I_mc: 0.75, E_r: 0.70, D_i: 0.48, G_f: 0.32,
              C_s: 0.58, D_cog: 0.40, R_sem: 0.55, V_i: 0.60, C_sem: 0.62, Phi: 0.55 },
      nti_components: { LDI: 0.28, ICC: 0.72, CSR: 0.65, IRCI: 0.85, IIM: 0.72 },
    },
    {
      id: 'ags-03', label: 'AGS-03 · Acute Phase',
      date: '2024-03-15', stage_name: 'Fragmentación cadenas de mando',
      ihg: -0.44, nti: 0.61,
      vars: { F_s: 0.62, I_mc: 0.58, E_r: 0.52, D_i: 0.65, G_f: 0.51,
              C_s: 0.44, D_cog: 0.58, R_sem: 0.42, V_i: 0.45, C_sem: 0.50, Phi: 0.42 },
      nti_components: { LDI: 0.39, ICC: 0.61, CSR: 0.42, IRCI: 0.80, IIM: 0.60 },
    },
    {
      id: 'ags-04', label: 'AGS-04 · Stabilization',
      date: '2024-04-10', stage_name: 'Recuperación parcial coordinada',
      ihg: -0.41, nti: 0.68,
      vars: { F_s: 0.54, I_mc: 0.65, E_r: 0.60, D_i: 0.55, G_f: 0.44,
              C_s: 0.52, D_cog: 0.48, R_sem: 0.50, V_i: 0.52, C_sem: 0.55, Phi: 0.48 },
      nti_components: { LDI: 0.32, ICC: 0.68, CSR: 0.55, IRCI: 0.82, IIM: 0.65 },
    },
    {
      id: 'ags-05', label: 'AGS-05 · Secondary Shock',
      date: '2024-05-20', stage_name: 'Sistema pierde capacidad de recuperación',
      ihg: -0.55, nti: 0.45,
      vars: { F_s: 0.74, I_mc: 0.42, E_r: 0.38, D_i: 0.72, G_f: 0.65,
              C_s: 0.38, D_cog: 0.70, R_sem: 0.32, V_i: 0.35, C_sem: 0.40, Phi: 0.30 },
      nti_components: { LDI: 0.55, ICC: 0.45, CSR: 0.28, IRCI: 0.68, IIM: 0.42 },
    },
    {
      id: 'ags-06', label: 'AGS-06 · EMERGENCY_DECISION',
      date: '2024-06-30', stage_name: 'Post-fractura pacto implícito',
      ihg: -0.620, nti: 0.351,
      vars: { F_s: 0.89, I_mc: 0.28, E_r: 0.22, D_i: 0.85, G_f: 0.82,
              C_s: 0.21, D_cog: 0.88, R_sem: 0.18, V_i: 0.20, C_sem: 0.25, Phi: 0.15 },
      nti_components: { LDI: 0.55, ICC: 0.80, CSR: 0.30, IRCI: 0.90, IIM: 0.60 },
    },
  ],

  /* Monte Carlo validado: 50,000 iter · seed 42 */
  monteCarlo: {
    iterations: 50000, seed: 42,
    p_collapse_conditional: 0.31,
    confidence_interval: [0.306, 0.314],
    p_collapse_2030: 0.71,
    distribution: {
      convergence: 0.08,
      oscillation: 0.21,
      managed_degradation: 0.40,
      accelerated_collapse: 0.31,
    },
  },
};


/* ─────────────────────────────────────────────────────────────────
   4. OBSERVER O(t) — APTYMOK COUNCIL
   Capa 0 · Campo Reflexivo
   El observador no es neutral. Su presencia modifica el campo.
───────────────────────────────────────────────────────────────── */

const OBSERVER = {
  id: 'APTYMOK',
  equation: 'S(t+1) = F(S(t), I(t), O(t))',
  layer: 'Capa 0 · Campo Reflexivo',
  icr_status: 'INDETERMINADO',
  icr_note: 'El ICR se calculará cuando observacion_proceso_cara_B.md tenga entradas suficientes para parametrizar O(t).',
  cara_b: '/docs/observacion-proceso/',

  /* Estados cognitivos registrados */
  states: [
    { t: 'T0', label: 'Activación inicial', signal: 'Alta densidad metafórica / baja especificidad operativa' },
    { t: 'T5', label: 'Azumbado', signal: 'Reorganización cognitiva — colapso de tensión + reconfiguración coherente' },
    { t: 'T7', label: 'Salto computacional', signal: 'Marco simbólico → arquitectura técnica ejecutable' },
    { t: 'T10', label: 'Acta Fundacional', signal: 'Sistema consciente de sí mismo como participante en la dinámica que estudia' },
    { t: 'T12', label: 'MIHM v3.0', signal: 'Infraestructura cognitiva navegable · Versión actual' },
  ],

  phi_params: {
    beta_description: 'β alto → deriva determinista hacia atractores · β bajo → exploración estocástica',
    field_equation: 'Φ(x) = Σᵢ αᵢ · Φᵢ(x)',
    transition: 'P(xₜ₊₁) ∝ exp(β · Φ(xₜ₊₁))',
  },

  councils: [
    { id: 'core', label: 'Serie · Marco teórico',    status: 'ACTIVO', docs: 12 },
    { id: 'ags',  label: 'Nodo AGS · Empírico',       status: 'VALIDADO', docs: 6 },
    { id: 'lab',  label: 'Laboratorio · Explorador',  status: 'ACTIVO', docs: 1 },
    { id: 'obs',  label: 'Observatorio · Dashboard',  status: 'ACTIVO v3', docs: 0 },
  ],
};


/* ─────────────────────────────────────────────────────────────────
   5. DETECCIÓN DE PATRONES
   Activa patrones de SF a partir de valores de variables MIHM v3
───────────────────────────────────────────────────────────────── */

const PATTERNS = {
  rules: [
    { id: 'umbral-dual',          condition: n => n.F_s > 0.50 && n.C_s < 0.50,              severity: 'naranja' },
    { id: 'latencia-politica',    condition: n => n.F_s > 0.60 && n.V_i < 0.40,              severity: 'roja' },
    { id: 'coherencia-aparente',  condition: n => n.C_s < 0.40,                               severity: 'naranja' },
    { id: 'equilibrio-implicito', condition: n => n.C_sem > 0.65 && n.F_s < 0.20 && n.Phi > 0.70, severity: 'latente' },
    { id: 'alerta-ignorada',      condition: n => n.D_i > 0.70 && n.I_mc < 0.40,             severity: 'naranja' },
    { id: 'compliance-narrativo', condition: n => n.C_s < 0.40 && n.R_sem > 0.60,            severity: 'roja' },
    { id: 'contexto-perdido',     condition: n => n.D_cog > 0.60,                             severity: 'amarilla' },
    { id: 'señal-ruido',          condition: n => n.D_i > 0.60 && n.R_sem < 0.50,            severity: 'amarilla' },
    { id: 'incentivo-contradictorio', condition: n => n.V_i < 0.30 && n.C_s < 0.50,         severity: 'roja' },
    { id: 'deuda-de-decisión',    condition: n => n.D_cog > 0.70 && n.C_s < 0.50,           severity: 'roja' },
  ],

  detect(norm_vars) {
    return this.rules
      .filter(r => r.condition(norm_vars))
      .map(r => ({ ...r, active: true }));
  },
};


/* ─────────────────────────────────────────────────────────────────
   6. UTILIDADES DE RENDERIZADO
   Funciones helpers para construir HTML con el design system SF.
───────────────────────────────────────────────────────────────── */

const SF = {
  /* Colores por estado */
  color(state) {
    const map = {
      ok: 'var(--c-ok, #5a9b6e)',
      amarilla: 'var(--c-am, #c9892a)',
      naranja: 'var(--c-or, #d4651a)',
      roja: 'var(--c-cr, #c86e6e)',
      ucap: 'var(--c-ucap, #c86e6e)',
      latente: 'var(--c-dim, #5a5852)',
    };
    return map[state] || map.ok;
  },

  /* Formatea número IHG con signo */
  fmt(n, decimals = 3) {
    const v = parseFloat(n).toFixed(decimals);
    return (parseFloat(n) >= 0 ? '+' : '') + v;
  },

  /* Badge de protocolo */
  badge(label, color = 'ok') {
    return `<span class="sf-badge sf-badge--${color}" style="
      display:inline-block;padding:0.15rem 0.5rem;border:1px solid ${this.color(color)};
      color:${this.color(color)};font-family:var(--fm,monospace);font-size:0.62rem;
      letter-spacing:0.1em;text-transform:uppercase;">${label}</span>`;
  },

  /* Fila de métrica */
  metricRow(label, value, unit = '', color = 'ok') {
    return `<div style="display:flex;justify-content:space-between;padding:0.4rem 0;
      border-bottom:1px solid var(--bd,#222220);">
      <span style="font-family:var(--fm,monospace);font-size:0.7rem;color:var(--tx3,#5a5852)">${label}</span>
      <span style="font-family:var(--fm,monospace);font-size:0.7rem;font-weight:600;
        color:${this.color(color)}">${value}${unit ? ' <span style="color:var(--tx3)">' + unit + '</span>' : ''}</span>
    </div>`;
  },

  /* Mini barra de progreso */
  bar(value, maxVal = 1, color = 'ok') {
    const pct = Math.min(100, Math.max(0, (value / maxVal) * 100));
    return `<div style="height:3px;background:var(--bd,#222220);margin:0.2rem 0;">
      <div style="height:100%;width:${pct}%;background:${this.color(color)};transition:width 0.6s ease;"></div>
    </div>`;
  },

  /** Inyecta CSS del sistema una sola vez */
  injectCSS() {
    if (document.getElementById('sf-dashboard-css')) return;
    const style = document.createElement('style');
    style.id = 'sf-dashboard-css';
    style.textContent = `
      :root {
        --bg: #0d0d0b; --surface: #131310; --bd: #222220;
        --tx: #c8c4b8; --tx3: #5a5852; --tx-bright: #e8e4d8;
        --ac: #c8a96e; --ac-dim: #7a6540;
        --c-ok: #5a9b6e; --c-am: #c9892a; --c-or: #d4651a;
        --c-cr: #c86e6e; --c-ucap: #c86e6e; --c-dim: #5a5852;
        --fm: 'JetBrains Mono', 'SF Mono', monospace;
        --serif: 'EB Garamond', Georgia, serif;
        --r: 2px;
      }
      .sf-panel {
        border: 1px solid var(--bd); background: var(--surface);
        padding: 1.5rem 1.75rem; margin: 1.5rem 0;
      }
      .sf-panel-label {
        font-family: var(--fm); font-size: 0.58rem; letter-spacing: 0.22em;
        text-transform: uppercase; color: var(--ac-dim); margin-bottom: 1rem;
        display: flex; align-items: center; gap: 1rem;
      }
      .sf-panel-label::after { content:''; height:1px; background:var(--bd); width:32px; }
      .sf-ihg-value {
        font-family: var(--fm); font-size: 2.2rem; font-weight: 600; line-height: 1;
      }
      .sf-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; }
      .sf-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; }
      .sf-node-card {
        border: 1px solid var(--bd); padding: 1rem 1.25rem; cursor: pointer;
        transition: border-color 0.2s;
      }
      .sf-node-card:hover { border-color: var(--ac); }
      .sf-node-card.active { border-color: var(--ac); background: #1a1508; }
      .sf-var-row {
        display:grid; grid-template-columns:3rem 1fr 3.5rem 2rem;
        gap:0.5rem; align-items:center; padding:0.3rem 0;
        border-bottom:1px solid var(--bd);
      }
      .sf-pattern-tag {
        display:inline-block; margin:0.2rem; padding:0.2rem 0.5rem;
        border:1px solid; border-radius:0; font-family:var(--fm);
        font-size:0.6rem; text-transform:uppercase; letter-spacing:0.08em;
      }
      .sf-observer-state {
        font-family: var(--fm); font-size: 0.68rem; color: var(--tx);
        padding: 0.6rem 0; border-bottom: 1px solid var(--bd);
        display: flex; gap: 1rem; align-items: baseline;
      }
      .sf-observer-t {
        color: var(--ac-dim); font-size: 0.6rem; min-width: 2.5rem;
      }
      .sf-phi-eq {
        font-family: var(--fm); font-size: 0.72rem; color: var(--ac);
        background: #0f0d05; padding: 0.8rem 1rem; margin: 0.8rem 0;
        border-left: 2px solid var(--ac-dim);
      }
      .sf-mc-bar-wrap { margin: 0.8rem 0; }
      .sf-mc-scenario {
        display:flex; align-items:center; gap:0.75rem; margin-bottom:0.5rem;
      }
      .sf-mc-bar-bg {
        flex:1; height:6px; background:var(--bd); position:relative;
      }
      .sf-mc-bar-fill {
        height:100%; position:absolute; top:0; left:0; transition:width 0.8s ease;
      }
      .sf-timeline {
        display:flex; gap:0.5rem; flex-wrap:wrap; margin:1rem 0;
      }
      .sf-timeline-point {
        padding:0.5rem 0.75rem; border:1px solid var(--bd); cursor:pointer;
        transition:all 0.2s; text-align:center;
      }
      .sf-timeline-point:hover { border-color:var(--ac); }
      .sf-timeline-point.active { border-color:var(--ac); background:#1a1508; }
      .sf-loading { color:var(--tx3); font-family:var(--fm); font-size:0.75rem; }
      @media (max-width:640px) {
        .sf-grid-2, .sf-grid-3 { grid-template-columns:1fr; }
        .sf-var-row { grid-template-columns:2.5rem 1fr 3rem; }
      }
    `;
    document.head.appendChild(style);
  },
};


/* ─────────────────────────────────────────────────────────────────
   7. RENDER FUNCTIONS
───────────────────────────────────────────────────────────────── */

/**
 * renderHeadline — Banner de estado global IHG
 * Target: #sf-headline
 */
function renderHeadline(stage) {
  const el = document.getElementById('sf-headline');
  if (!el) return;

  const result = MIHM.calculateIHG({ ...stage.vars });
  const ihg_s = MIHM.smooth(result.ihg, result.ihg * 0.85);
  const nti_val = NTI.calculate(
    stage.nti_components.LDI, stage.nti_components.ICC,
    stage.nti_components.CSR, stage.nti_components.IRCI, stage.nti_components.IIM
  );
  const ihg_final = MIHM.ntiCorrection(ihg_s, nti_val);
  const state = MIHM.getState(ihg_final);

  el.innerHTML = `
    <div class="sf-panel" style="border-color:${SF.color(state.color)};">
      <div class="sf-panel-label" style="color:${SF.color(state.color)};opacity:0.7">
        MIHM v3.0 · Estado observado · ${stage.date}
      </div>
      <div style="display:flex;gap:3rem;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <div class="sf-ihg-value" style="color:${SF.color(state.color)}">${SF.fmt(ihg_final)}</div>
          <div style="font-family:var(--fm);font-size:0.6rem;color:var(--tx3);margin-top:0.3rem">IHG · Índice Homeostático Global</div>
        </div>
        <div>
          <div style="font-family:var(--fm);font-size:1.4rem;font-weight:600;color:var(--tx)">${SF.fmt(nti_val, 3)}</div>
          <div style="font-family:var(--fm);font-size:0.6rem;color:var(--tx3);margin-top:0.3rem">NTI · Trazabilidad</div>
        </div>
        <div>
          ${SF.badge(state.label, state.color)}
          <div style="font-family:var(--fm);font-size:0.6rem;color:var(--tx3);margin-top:0.5rem">${state.protocol}</div>
        </div>
        <div>
          <div style="font-family:var(--fm);font-size:0.65rem;color:var(--tx3)">${stage.label}</div>
          <div style="font-family:var(--serif);font-size:1.05rem;color:var(--tx);margin-top:0.2rem">${stage.stage_name}</div>
        </div>
      </div>
    </div>`;
}


/**
 * renderVariables — Panel de 11 variables MIHM v3
 * Target: #sf-variables
 */
function renderVariables(stage) {
  const el = document.getElementById('sf-variables');
  if (!el) return;

  const vars = stage.vars;
  const varDefs = [
    { k: 'F_s',   label: 'Fricción Sistémica',           dim: 'structural', high_bad: true },
    { k: 'G_f',   label: 'Gradiente de Fricción',        dim: 'structural', high_bad: true },
    { k: 'D_i',   label: 'Densidad de Interacción',      dim: 'temporal',   high_bad: true },
    { k: 'D_cog', label: 'Desfase Cognitivo',            dim: 'temporal',   high_bad: true },
    { k: 'I_mc',  label: 'Interacción Multicanal',       dim: 'relational', high_bad: false },
    { k: 'E_r',   label: 'Energía Relacional',           dim: 'relational', high_bad: false },
    { k: 'V_i',   label: 'Vector Intencional',           dim: 'relational', high_bad: false },
    { k: 'R_sem', label: 'Resonancia Semántica',         dim: 'semantic',   high_bad: false },
    { k: 'C_sem', label: 'Campo Semántico Compartido',   dim: 'semantic',   high_bad: false },
    { k: 'C_s',   label: 'Coherencia Sistémica',         dim: 'cognitive',  high_bad: false },
    { k: 'Phi',   label: 'Campo Cognitivo Φ',            dim: 'cognitive',  high_bad: false },
  ];

  const dimColors = {
    structural: 'roja', temporal: 'naranja', relational: 'ok',
    semantic: 'amarilla', cognitive: 'amarilla'
  };

  const rows = varDefs.map(({ k, label, dim, high_bad }) => {
    const v = vars[k] || 0;
    const isAlarm = high_bad ? v > 0.60 : v < 0.40;
    const color = isAlarm ? (v > 0.80 || v < 0.20 ? 'roja' : 'naranja') : 'ok';
    const barColor = high_bad ? (v > 0.70 ? 'roja' : v > 0.40 ? 'naranja' : 'ok')
                               : (v < 0.30 ? 'roja' : v < 0.50 ? 'naranja' : 'ok');
    return `
      <div class="sf-var-row">
        <span style="font-family:var(--fm);font-size:0.65rem;color:${SF.color(dimColors[dim])}">${k}</span>
        <div>
          <div style="font-family:var(--fm);font-size:0.6rem;color:var(--tx3)">${label}</div>
          ${SF.bar(v, 1, barColor)}
        </div>
        <span style="font-family:var(--fm);font-size:0.72rem;font-weight:600;color:${SF.color(color)};text-align:right">${v.toFixed(3)}</span>
        <span style="font-family:var(--fm);font-size:0.55rem;color:var(--tx3)">${isAlarm ? '⚠' : '·'}</span>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="sf-panel">
      <div class="sf-panel-label">Variables MIHM v3.0 · 11 variables activas</div>
      ${rows}
    </div>`;
}


/**
 * renderNTI — Desglose del Nodo de Trazabilidad Institucional
 * Target: #sf-nti
 */
function renderNTI(stage) {
  const el = document.getElementById('sf-nti');
  if (!el) return;

  const c = stage.nti_components;
  const nti = NTI.calculate(c.LDI, c.ICC, c.CSR, c.IRCI, c.IIM);
  const gate = NTI.getDecisionGate(nti);

  const components = [
    { key: 'LDI',  label: 'Latencia Decisional',         value: (1 - c.LDI), raw: c.LDI, note: 'LDI_norm → contribución: 1 − LDI_norm' },
    { key: 'ICC',  label: 'Concentración Conocimiento',  value: c.ICC,   raw: c.ICC, note: 'ICC_norm = 1 − Herfindahl_conocimiento' },
    { key: 'CSR',  label: 'Cobertura Señal de Riesgo',   value: c.CSR,   raw: c.CSR, note: 'acciones_ejecutadas / señales_detectadas' },
    { key: 'IRCI', label: 'Resiliencia Capital Inst.',   value: c.IRCI,  raw: c.IRCI, note: 'proxy: factor compactación acuífero' },
    { key: 'IIM',  label: 'Integridad Información',      value: c.IIM,   raw: c.IIM, note: '1 − |reportado − verificado| / reportado' },
  ];

  const compRows = components.map(({ key, label, value, note }) => {
    const color = value >= 0.60 ? 'ok' : value >= 0.40 ? 'amarilla' : 'roja';
    return `
      <div style="padding:0.6rem 0;border-bottom:1px solid var(--bd)">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:0.2rem">
          <span style="font-family:var(--fm);font-size:0.65rem;color:var(--ac-dim)">${key}</span>
          <span style="font-family:var(--fm);font-size:0.72rem;font-weight:600;color:${SF.color(color)}">${value.toFixed(3)}</span>
        </div>
        <div style="font-family:var(--fm);font-size:0.58rem;color:var(--tx3);margin-bottom:0.2rem">${label}</div>
        ${SF.bar(value, 1, color)}
        <div style="font-family:var(--fm);font-size:0.55rem;color:var(--tx3);opacity:0.7">${note}</div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="sf-panel">
      <div class="sf-panel-label">NTI · Nodo de Trazabilidad Institucional</div>
      <div style="display:flex;gap:2rem;align-items:baseline;margin-bottom:1.5rem;flex-wrap:wrap">
        <div>
          <div style="font-family:var(--fm);font-size:1.8rem;font-weight:600;
            color:${SF.color(gate.level==='LIBRE'?'ok':gate.level==='CONGELADA'?'amarilla':gate.level==='TÁCTICA'?'naranja':'ucap')}"
          >${nti.toFixed(3)}</div>
          <div style="font-family:var(--fm);font-size:0.58rem;color:var(--tx3);margin-top:0.2rem">NTI · [0, 1]</div>
        </div>
        <div>
          ${SF.badge(gate.level, gate.color)}
          <div style="font-family:var(--fm);font-size:0.6rem;color:var(--tx3);margin-top:0.4rem">${gate.label}</div>
        </div>
      </div>
      <div style="font-family:var(--fm);font-size:0.65rem;color:var(--tx3);margin-bottom:1rem">
        NTI = (1/5) × [(1−LDI) + ICC + CSR + IRCI + IIM]
      </div>
      ${compRows}
    </div>`;
}


/**
 * renderNodes — Timeline AGS + tarjetas de etapas
 * Target: #sf-nodes
 */
function renderNodes(activeIndex = 5) {
  const el = document.getElementById('sf-nodes');
  if (!el) return;

  const timelineButtons = AGS.stages.map((s, i) => {
    const result = MIHM.calculateIHG({ ...s.vars });
    const state = MIHM.getState(result.ihg);
    return `
      <div class="sf-timeline-point ${i === activeIndex ? 'active' : ''}"
        onclick="SFDashboard.selectStage(${i})"
        style="${i === activeIndex ? `border-color:${SF.color(state.color)};` : ''}">
        <div style="font-family:var(--fm);font-size:0.58rem;color:var(--tx3)">${s.id.toUpperCase()}</div>
        <div style="font-family:var(--fm);font-size:1rem;font-weight:600;color:${SF.color(state.color)}">${SF.fmt(s.ihg,3)}</div>
      </div>`;
  }).join('');

  const stage = AGS.stages[activeIndex];
  const result = MIHM.calculateIHG({ ...stage.vars });
  const state = MIHM.getState(result.ihg);
  const patterns = PATTERNS.detect(stage.vars);

  const patternsHtml = patterns.length > 0
    ? patterns.map(p => `<span class="sf-pattern-tag" style="border-color:${SF.color(p.severity)};color:${SF.color(p.severity)}">${p.id}</span>`).join('')
    : `<span style="font-family:var(--fm);font-size:0.62rem;color:var(--tx3)">Sin patrones activos en este estado</span>`;

  el.innerHTML = `
    <div class="sf-panel">
      <div class="sf-panel-label">Nodo AGS · Aguascalientes · 136 días documentados</div>
      <div class="sf-timeline">${timelineButtons}</div>
      <div style="border-top:1px solid var(--bd);padding-top:1.25rem;margin-top:0.5rem">
        <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:1rem;margin-bottom:1rem">
          <div>
            <div style="font-family:var(--fm);font-size:0.6rem;color:var(--tx3)">${stage.date} · ${stage.id.toUpperCase()}</div>
            <div style="font-family:var(--serif);font-size:1.15rem;color:var(--tx-bright);margin-top:0.2rem">${stage.stage_name}</div>
          </div>
          ${SF.badge(state.label, state.color)}
        </div>
        <div class="sf-grid-2" style="margin-bottom:1rem">
          <div>
            ${SF.metricRow('IHG calculado', SF.fmt(result.ihg), '', state.color)}
            ${SF.metricRow('Suma directa', SF.fmt(result.direct_sum), '', 'ok')}
            ${SF.metricRow('Penalización interacción', '−' + result.penalty.toFixed(3), '', 'naranja')}
          </div>
          <div>
            ${SF.metricRow('F_s', stage.vars.F_s.toFixed(3), '', stage.vars.F_s > 0.60 ? 'roja' : 'ok')}
            ${SF.metricRow('C_s', stage.vars.C_s.toFixed(3), '', stage.vars.C_s < 0.40 ? 'roja' : 'ok')}
            ${SF.metricRow('G_f', stage.vars.G_f.toFixed(3), '', stage.vars.G_f > 0.60 ? 'roja' : 'ok')}
          </div>
        </div>
        <div>
          <div style="font-family:var(--fm);font-size:0.58rem;color:var(--tx3);margin-bottom:0.5rem">PATRONES ACTIVOS</div>
          ${patternsHtml}
        </div>
      </div>
    </div>`;
}


/**
 * renderScenarios — Monte Carlo + distribución de futuros
 * Target: #sf-scenarios
 */
function renderScenarios() {
  const el = document.getElementById('sf-scenarios');
  if (!el) return;

  const mc = AGS.monteCarlo;
  const scenarios = [
    { id: 'convergence',         label: 'Convergencia',            p: mc.distribution.convergence,         color: 'ok' },
    { id: 'oscillation',         label: 'Oscilación gestionada',   p: mc.distribution.oscillation,          color: 'amarilla' },
    { id: 'managed_degradation', label: 'Degradación gestionada',  p: mc.distribution.managed_degradation,  color: 'naranja' },
    { id: 'accelerated_collapse',label: 'Colapso acelerado',       p: mc.distribution.accelerated_collapse, color: 'roja' },
  ];

  const bars = scenarios.map(s => `
    <div class="sf-mc-scenario">
      <span style="font-family:var(--fm);font-size:0.62rem;color:var(--tx3);min-width:10rem">${s.label}</span>
      <div class="sf-mc-bar-bg">
        <div class="sf-mc-bar-fill" style="width:${s.p*100}%;background:${SF.color(s.color)}"></div>
      </div>
      <span style="font-family:var(--fm);font-size:0.68rem;font-weight:600;color:${SF.color(s.color)};min-width:3rem;text-align:right">${(s.p*100).toFixed(0)}%</span>
    </div>`).join('');

  el.innerHTML = `
    <div class="sf-panel">
      <div class="sf-panel-label">Monte Carlo · ${mc.iterations.toLocaleString()} iteraciones · seed ${mc.seed}</div>
      <div class="sf-grid-2" style="margin-bottom:1.5rem">
        <div>
          ${SF.metricRow('P(colapso 2030)', (mc.p_collapse_2030 * 100).toFixed(0) + '%', '', 'roja')}
          ${SF.metricRow('P(colapso | A∪B)', (mc.p_collapse_conditional * 100).toFixed(0) + '%', '', 'roja')}
        </div>
        <div>
          ${SF.metricRow('IC 95%', '[' + mc.confidence_interval.map(v => v.toFixed(3)).join(', ') + ']', '', 'amarilla')}
          ${SF.metricRow('Protocolo activo', 'EMERGENCY_DECISION', '', 'ucap')}
        </div>
      </div>
      <div style="font-family:var(--fm);font-size:0.58rem;color:var(--tx3);margin-bottom:0.75rem">
        DISTRIBUCIÓN DE TRAYECTORIAS · estado actual → 2030
      </div>
      <div class="sf-mc-bar-wrap">${bars}</div>
    </div>`;
}


/**
 * renderPatterns — Catálogo de patrones activos
 * Target: #sf-patterns
 */
function renderPatterns(stage) {
  const el = document.getElementById('sf-patterns');
  if (!el) return;

  const active = PATTERNS.detect(stage.vars);
  const inactive = PATTERNS.rules.filter(r => !active.find(a => a.id === r.id));

  const activeCards = active.map(p => `
    <div style="border:1px solid ${SF.color(p.severity)};padding:0.75rem 1rem;background:${
      p.severity === 'roja' ? '#1a0e0e' : p.severity === 'naranja' ? '#140e07' : '#0f0d05'
    }">
      <div style="font-family:var(--fm);font-size:0.58rem;color:${SF.color(p.severity)};
        letter-spacing:0.15em;text-transform:uppercase;margin-bottom:0.25rem">⚡ ACTIVO</div>
      <div style="font-family:var(--fm);font-size:0.72rem;color:var(--tx)">${p.id}</div>
    </div>`).join('');

  const inactiveList = inactive.map(p =>
    `<span style="font-family:var(--fm);font-size:0.62rem;color:var(--tx3);margin-right:1rem">· ${p.id}</span>`
  ).join('');

  el.innerHTML = `
    <div class="sf-panel">
      <div class="sf-panel-label">Patrones · Activación por variables MIHM v3</div>
      ${active.length > 0
        ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:0.75rem;margin-bottom:1rem">${activeCards}</div>`
        : `<div style="font-family:var(--fm);font-size:0.7rem;color:var(--c-ok);margin-bottom:1rem">Sin patrones activos en este estado</div>`
      }
      <div style="border-top:1px solid var(--bd);padding-top:0.75rem;margin-top:0.5rem">
        <div style="font-family:var(--fm);font-size:0.55rem;color:var(--tx3);margin-bottom:0.4rem">INACTIVOS</div>
        ${inactiveList}
      </div>
    </div>`;
}


/**
 * renderAptymok — Observer O(t) / Aptymok Council · Capa 0
 * Target: #sf-aptymok
 */
function renderAptymok() {
  const el = document.getElementById('sf-aptymok');
  if (!el) return;

  const stateRows = OBSERVER.states.map(s => `
    <div class="sf-observer-state">
      <span class="sf-observer-t">${s.t}</span>
      <div>
        <div style="color:var(--ac);font-size:0.68rem">${s.label}</div>
        <div style="color:var(--tx3);font-size:0.62rem;margin-top:0.1rem">${s.signal}</div>
      </div>
    </div>`).join('');

  const councilRows = OBSERVER.councils.map(c => `
    <div style="display:flex;justify-content:space-between;padding:0.4rem 0;border-bottom:1px solid var(--bd)">
      <span style="font-family:var(--fm);font-size:0.65rem;color:var(--tx)">${c.label}</span>
      <span style="font-family:var(--fm);font-size:0.62rem;color:var(--ac-dim)">${c.status}</span>
    </div>`).join('');

  el.innerHTML = `
    <div class="sf-panel" style="border-color:var(--ac-dim)">
      <div class="sf-panel-label" style="color:var(--ac-dim)">
        Capa 0 · Campo Reflexivo · Observer O(t)
      </div>

      <div style="margin-bottom:1.5rem">
        <div style="font-family:var(--fm);font-size:0.6rem;color:var(--tx3);margin-bottom:0.3rem">ECUACIÓN DINÁMICA CON OBSERVADOR</div>
        <div class="sf-phi-eq">S(t+1) = F(S(t), I(t), O(t))</div>
        <div style="font-family:var(--fm);font-size:0.6rem;color:var(--tx3)">
          El observador no es neutral. Su presencia modifica el campo que estudia.
        </div>
      </div>

      <div class="sf-grid-2" style="margin-bottom:1.5rem">
        <div>
          <div style="font-family:var(--fm);font-size:0.58rem;color:var(--tx3);margin-bottom:0.5rem">CAMPO COGNITIVO Φ</div>
          <div class="sf-phi-eq">Φ(x) = Σᵢ αᵢ · Φᵢ(x)</div>
          <div class="sf-phi-eq">P(xₜ₊₁) ∝ exp(β · Φ(xₜ₊₁))</div>
          <div style="font-family:var(--fm);font-size:0.6rem;color:var(--tx3)">
            β alto → atractores conocidos<br>β bajo → exploración estocástica
          </div>
        </div>
        <div>
          <div style="font-family:var(--fm);font-size:0.58rem;color:var(--tx3);margin-bottom:0.5rem">ICR · ÍNDICE CAMPO REFLEXIVO</div>
          <div style="font-family:var(--fm);font-size:1.4rem;font-weight:600;color:var(--tx3)">—</div>
          <div style="font-family:var(--fm);font-size:0.6rem;color:var(--tx3);margin-top:0.4rem">
            INDETERMINADO<br>
            <span style="opacity:0.7">Requiere primera medición con O(t) explícito</span>
          </div>
        </div>
      </div>

      <div style="margin-bottom:1.5rem">
        <div style="font-family:var(--fm);font-size:0.58rem;color:var(--tx3);margin-bottom:0.5rem">ESTADOS O(t) · APTYMOK</div>
        ${stateRows}
      </div>

      <div>
        <div style="font-family:var(--fm);font-size:0.58rem;color:var(--tx3);margin-bottom:0.5rem">CONSEJO APTYMOK · CAPAS ACTIVAS</div>
        ${councilRows}
      </div>
    </div>`;
}


/* ─────────────────────────────────────────────────────────────────
   8. CONTROLADOR PRINCIPAL — SFDashboard
───────────────────────────────────────────────────────────────── */

window.SFDashboard = {
  currentStageIndex: 5, /* AGS-06 por defecto */

  init() {
    SF.injectCSS();
    this.render(this.currentStageIndex);
  },

  selectStage(idx) {
    this.currentStageIndex = idx;
    this.render(idx);
  },

  render(idx) {
    const stage = AGS.stages[idx];
    renderHeadline(stage);
    renderVariables(stage);
    renderNTI(stage);
    renderNodes(idx);
    renderPatterns(stage);
    renderScenarios();
    renderAptymok();
    /* Dispatch evento para integraciones externas */
    document.dispatchEvent(new CustomEvent('sf:stageChange', {
      detail: { stage, idx, ihg: MIHM.calculateIHG({ ...stage.vars }) }
    }));
  },

  /* API pública: calcular IHG para variables externas */
  calculate(vars) {
    return MIHM.calculateIHG(vars);
  },

  /* API pública: detectar patrones */
  detectPatterns(vars) {
    return PATTERNS.detect(vars);
  },

  /* API pública: obtener estado NTI */
  getNTI(ldi, icc, csr, irci, iim) {
    const v = NTI.calculate(ldi, icc, csr, irci, iim);
    return { value: v, gate: NTI.getDecisionGate(v) };
  },

  /* API pública: exportar estado actual como JSON */
  exportState() {
    const stage = AGS.stages[this.currentStageIndex];
    const result = MIHM.calculateIHG({ ...stage.vars });
    const nti_v = NTI.calculate(
      stage.nti_components.LDI, stage.nti_components.ICC,
      stage.nti_components.CSR, stage.nti_components.IRCI, stage.nti_components.IIM
    );
    return {
      timestamp: new Date().toISOString(),
      stage: stage.id,
      mihm_version: '3.0',
      ihg: result.ihg,
      ihg_corrected: MIHM.ntiCorrection(result.ihg, nti_v),
      nti: nti_v,
      state: MIHM.getState(result.ihg),
      variables: stage.vars,
      active_patterns: PATTERNS.detect(stage.vars).map(p => p.id),
      ucap: MIHM.checkUCAP(result.ihg, stage.vars.G_f),
    };
  },
};

/* ─── Auto-inicialización ──────────────────────────────────────── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SFDashboard.init());
} else {
  SFDashboard.init();
}
// Extensión evolutiva
window.IAD_ritmo = 0.84;
window.ETE_campo = 3.2;
