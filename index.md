---
layout: default
title: "System Friction"
description: "Observatorio de fricción sistémica. MIHM v2.0. Validación empírica activa."
permalink: /
---

<div class="wrap--wide">

<section class="hero">
  <div class="hero__kicker">Observatorio de fricción sistémica · v1.1</div>
  <div class="hero__formula">f = (t/T) + O</div>
  <div class="hero__tagline">Los sistemas no fallan por ausencia de intención.</div>
  <div class="hero__meta">
    <span>Validación empírica: 23 feb 2026</span>
    <span>Nodo AGS</span>
    <span>MIHM v2.0</span>
    <span>50,000 iteraciones Monte Carlo</span>
  </div>
</section>

</div>

<div class="alert-band">
  <div class="alert-band__dot"></div>
  <span>EMERGENCY_DECISION ACTIVO</span>
  <span>IHG −0.620 &lt; UCAP −0.500</span>
  <span>NTI 0.351 · BLIND MODE</span>
  <span>P(colapso 2030) 71%</span>
  <span class="muted">Shock: muerte actor hegemónico + 252 narcobloqueos · 22–23 feb 2026</span>
</div>

<div class="wrap--wide">

<!-- ── Dashboard principal ────────────────────────────────────────────── -->
<div class="dash-grid" style="margin-top:1.5rem">

  <!-- IHG Gauge -->
  <div class="dash-cell">
    <div class="dash-cell__label">IHG — Índice de Gobernanza Homeostática</div>
    <div id="sf-headline" data-sf="true"><span class="sf-loading">—</span></div>
    <div class="dash-cell__thr">UCAP: −0.500 · Protocolo activo cuando IHG &lt; UCAP</div>
  </div>

  <!-- NTI -->
  <div class="dash-cell">
    <div class="dash-cell__label">NTI — Nodo de Trazabilidad Institucional</div>
    <div id="sf-nti" data-sf="true"><span class="sf-loading">—</span></div>
    <div class="dash-cell__thr">UCAP NTI: 0.400 · Por debajo: BLIND MODE</div>
  </div>

  <!-- Toggle NTI -->
  <div class="dash-cell">
    <div class="dash-cell__label">Toggle NTI</div>
    <div class="toggle-row">
      <label class="sf-toggle">
        <input type="checkbox" id="nti-toggle" checked>
        <div class="sf-toggle-track"></div>
        <div class="sf-toggle-thumb"></div>
      </label>
      <span class="toggle-lbl">NTI activo</span>
      <span class="toggle-note">(desactivar: IHG sin trazabilidad)</span>
    </div>
    <div id="sf-toggle-ihg" data-sf="true"><span class="sf-loading">—</span></div>
    <div class="dash-cell__thr">ON: IHG auditado × NTI · OFF: proxy crudo</div>
  </div>

  <!-- Sparkline histórico -->
  <div class="dash-cell dash-cell--2">
    <div class="dash-cell__label">Evolución IHG — jun 2025 → 23 feb 2026</div>
    <div id="sf-sparkline" data-sf="true"><span class="sf-loading">—</span></div>
    <div class="dash-cell__thr">Línea punteada = UCAP (−0.500) · Punto rojo = post-fractura</div>
  </div>

  <!-- Scenarios -->
  <div class="dash-cell dash-cell--wide">
    <div class="dash-cell__label">Escenarios · Monte Carlo · 50,000 iteraciones · seed 42</div>
    <div id="sf-scenarios" data-sf="true"><span class="sf-loading">—</span></div>
    <div class="dash-cell__thr">Probabilidades a 180 días. Proceso de Poisson λ = 0.10</div>
  </div>

  <!-- Dims -->
  <div class="dash-cell dash-cell--wide">
    <div class="dash-cell__label">Dimensiones C/E/L/K/R/M</div>
    <button class="drill-btn" id="sf-dims-btn">
      <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5 L5 6.5 L8 3.5" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>
      <span>desmembrar dimensiones</span>
    </button>
    <div class="dims-panel" id="sf-dims" data-sf="true"></div>
    <div class="dash-cell__thr" style="margin-top:.5rem">Promedio por dimensión a través de 6 nodos</div>
  </div>

</div>

<!-- ── Tabla de nodos ─────────────────────────────────────────────────── -->
<div class="section-rule">vector de nodos · N1–N6</div>
<div id="sf-nodes" data-sf="true"><span class="sf-loading">—</span></div>

<!-- ── Intervenciones rankeadas ──────────────────────────────────────── -->
<div class="section-rule">intervenciones rankeadas · ΔIHG</div>
<div id="sf-interventions" data-sf="true"><span class="sf-loading">—</span></div>

<!-- ── Docs ──────────────────────────────────────────────────────────── -->
<div id="sf-docs" data-sf="true"><span class="sf-loading">—</span></div>

<!-- ── Lab Mode ──────────────────────────────────────────────────────── -->
<div id="lab">
  <div class="section-rule">lab · monte carlo interactivo</div>
  <div style="font-family:var(--fm);font-size:.62rem;color:var(--tx3);margin-bottom:.8rem">
    Recalcula escenarios ajustando parámetros. Proceso de Poisson exocáustico.
    Moderado por voluntad: sin auto-actualización.
  </div>
  <div id="sf-lab"></div>
</div>

<!-- ── Audit ─────────────────────────────────────────────────────────── -->
<div id="audit">
  <div class="section-rule">audit · cadena de trazabilidad</div>
  <div style="font-family:var(--fm);font-size:.62rem;color:var(--tx3);margin-bottom:.8rem">
    El modelo aplicado al propio sistema.
    Cada patrón documentado → variable MIHM → nodo → contribución IHG.
  </div>
  <div id="sf-audit" data-sf="true"><span class="sf-loading">—</span></div>
</div>

<!-- ── Descargas ──────────────────────────────────────────────────────── -->
<div class="section-rule">datos y código</div>
<div class="dl-list">
  <a class="dl-item" href="{{ '/assets/data/ags_metrics.json' | relative_url }}"> 
    <span class="dl-item__type">JSON</span>
    <span>ags_metrics.json</span>
    <span class="dl-item__meta">métricas AGS v1.1</span>
  </a>
  <a class="dl-item" href="{{ '/assets/data/docs.json' | relative_url }}">an class="dl-item__type">JSON</span>
    <span>docs.json</span>
    <span class="dl-item__meta">catálogo de documentos</span>
  </a>
  <a class="dl-item" href="{{ '/assets/data/patterns.json' | relative_url }}">
    <span class="dl-item__type">JSON</span>
    <span>patterns.json</span>
    <span class="dl-item__meta">mapa patrones → MIHM</span>
  </a>
  <a class="dl-item" href="{{ '/scripts/mihm_v2.py/' | relative_url }}">
    <span class="dl-item__type">PY</span>
    <span>mihm_v2.py</span>
    <span class="dl-item__meta">motor MIHM v2.0</span>
  </a>
  <a class="dl-item" href="{{ '/assets/MIHM_v2_manuscrito_completo.pdf' | relative_url }}">
    <span class="dl-item__type">PDF</span>
    <span>MIHM v2.0 — Manuscrito completo</span>
    <span class="dl-item__meta">CC BY 4.0</span>
  </a>
</div>

</div>