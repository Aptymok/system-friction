---
layout: default
title: "Dashboard · System Friction"
description: "Archivo de fricción sistémica. Monitoreo de gobernanza y trazabilidad institucional."
---

<div class="alert-band">
  <div class="alert-band__dot"></div>
  <span>SISTEMA EN ESTADO DE FRACTURA — PROTOCOLO EMERGENCY_DECISION ACTIVO</span>
  <span class="muted" style="margin-left:auto">v1.1 · 2026</span>
</div>

<div class="wrap--wide">
  <div class="dash-grid" style="margin-top:1.5rem">
    <div class="dash-cell">
      <div class="dash-cell__label">IHG — Índice de Gobernanza Homeostática</div>
      <div id="sf-headline" data-sf="true"><span class="sf-loading">—</span></div>
      <div class="dash-cell__thr">UCAP: −0.500 · Protocolo activo cuando IHG < UCAP</div>
    </div>
    <div class="dash-cell">
      <div class="dash-cell__label">NTI — Nodo de Trazabilidad Institucional</div>
      <div id="sf-nti" data-sf="true"><span class="sf-loading">—</span></div>
      <div class="dash-cell__thr">UCAP NTI: 0.400 · Por debajo: BLIND MODE</div>
    </div>
    <div class="dash-cell">
      <div class="dash-cell__label">Vista de Trazabilidad</div>
      <div class="toggle-row">
        <label class="sf-toggle">
          <input type="checkbox" id="nti-toggle">
          <span class="sf-toggle-track"></span>
          <span class="sf-toggle-thumb"></span>
        </label>
        <span class="toggle-lbl" id="nti-status">MODO ESTÁNDAR</span>
      </div>
      <div class="dash-cell__sub">Inyecta incertidumbre institucional en el cálculo de IHG.</div>
    </div>
   <div class="dash-cell dash-cell--2">
      <div class="dash-cell__label">Tendencia IHG (180d) — Proyección Monte Carlo</div>
      <div id="sf-spark" data-sf="true"></div>
      <div class="dash-cell__sub">Sombreado indica intervalo de fractura.</div>
    </div> 
    <div class="dash-cell">
      <div class="dash-cell__label">P(Fractura Sistémica) · t+4y</div>
      <div class="dash-cell__value c-cr" id="sf-prob">71%</div>
      <div class="dash-cell__sub">Basado en deriva de latencia efectiva.</div>
    </div>
  </div>

  <div class="section-rule">dimensiones del sistema (agregado)</div>
  <div id="sf-dims" class="dims-panel open"></div>

  <div class="section-rule">escenarios proyectados (50k iteraciones)<span>Monte Carlo · seed 42 · λ=0.1</span></div>
    <div class="sc-grid">
      <div class="sc-cell">
        <div class="sc-cell__id">ESC-01</div>
        <div class="sc-cell__label">Opacidad sostenida</div>
        <div class="sc-cell__prob c-cr">73%</div>
        <div class="sc-cell__ihg">IHG: -0.68</div>
      </div>
      <div class="sc-cell">
        <div class="sc-cell__id">ESC-02</div>
        <div class="sc-cell__label">Intervención temprana</div>
        <div class="sc-cell__prob c-ok">34%</div>
        <div class="sc-cell__ihg">IHG: -0.28</div>
      </div>
      <div class="sc-cell">
        <div class="sc-cell__id">ESC-03</div>
        <div class="sc-cell__label">Shock exógeno +48h</div>
        <div class="sc-cell__prob c-cr">89%</div>
        <div class="sc-cell__ihg">IHG: -0.82</div>
      </div>
      <div class="sc-cell">
        <div class="sc-cell__id">ESC-04</div>
        <div class="sc-cell__label">Restauración NTI</div>
        <div class="sc-cell__prob c-ok">28%</div>
        <div class="sc-cell__ihg">IHG: -0.21</div>
      </div>
  </div>

  <div class="section-rule">nodos críticos — estado actual</div>
  <div class="nodes-wrap">
    <table class="nodes-tbl">
      <thead>
        <tr>
          <th>Nodo</th>
          <th>C</th>
          <th>E</th>
          <th>L</th>
          <th>K</th>
          <th>R</th>
          <th>M</th>
          <th>f</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody id="sf-nodes"></tbody>
    </table>
  </div>
|
  <div class="dl-list">
    <a class="dl-item" href="{{ site.baseurl }}/assets/data/ags_metrics.json">
      <span class="dl-item__type">JSON</span>
      <span>ags_metrics.json</span>
      <span class="dl-item__meta">métricas AGS v1.1</span>
    </a>
    <a class="dl-item" href="{{ site.baseurl }}/assets/data/docs.json">
      <span class="dl-item__type">JSON</span>
      <span>docs.json</span>
      <span class="dl-item__meta">catálogo de documentos</span>
    </a>
    <a class="dl-item" href="{{ site.baseurl }}/assets/data/patterns.json">
      <span class="dl-item__type">JSON</span>
      <span>patterns.json</span>
      <span class="dl-item__meta">mapa patrones → MIHM</span>
    </a>
    <a class="dl-item" href="{{ site.baseurl }}/scripts/mihm_v2.py">
      <span class="dl-item__type">PY</span>
      <span>mihm_v2.py</span>
      <span class="dl-item__meta">motor Python</span>
    </a>
    <a class="dl-item" href="{{ site.baseurl }}/assets/data/MIHM_v2_manuscrito_completo.pdf">
      <span class="dl-item__type">PDF</span>
      <span>Manuscrito completo</span>
      <span class="dl-item__meta">MIHM v2.0 · CC BY 4.0</span>
    </a>
  </div>
</div>