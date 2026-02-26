---
layout: default
title: "Dashboard · System Friction"
description: "Archivo de fricción sistémica. Monitoreo de gobernanza y trazabilidad institucional."
<<<<<<< HEAD
=======
permalink: /dashboard/
>>>>>>> 4282b3e146dad83e33d8b8782314368300182522
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
<<<<<<< HEAD
      <div class="dash-cell__thr">UCAP: −0.500 · Protocolo activo cuando IHG < UCAP</div>
=======
      <div class="dash-cell__thr">UCAP: −0.500 · Protocolo activo cuando IHG &lt; UCAP</div>
>>>>>>> 4282b3e146dad83e33d8b8782314368300182522
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

  <div class="section-rule">escenarios proyectados (50k iteraciones)</div>
  <div id="sf-scenarios"></div>

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

  <div class="section-rule">intervenciones sugeridas (reducción de fricción)</div>
  <div id="sf-interv" class="interv-list"></div>

  <div class="section-rule">datos y código</div>
  <div class="dl-list">
<<<<<<< HEAD
    <a class="dl-item" href="{{ site.baseurl }}/assets/data/ags_metrics.json">
=======
    <a class="dl-item" href="{{ '/assets/data/ags_metrics.json' | relative_url }}">
>>>>>>> 4282b3e146dad83e33d8b8782314368300182522
      <span class="dl-item__type">JSON</span>
      <span>ags_metrics.json</span>
      <span class="dl-item__meta">métricas AGS v1.1</span>
    </a>
<<<<<<< HEAD
    <a class="dl-item" href="{{ site.baseurl }}/assets/data/docs.json">
=======
    <a class="dl-item" href="{{ '/assets/data/docs.json' | relative_url }}">
>>>>>>> 4282b3e146dad83e33d8b8782314368300182522
      <span class="dl-item__type">JSON</span>
      <span>docs.json</span>
      <span class="dl-item__meta">catálogo de documentos</span>
    </a>
<<<<<<< HEAD
    <a class="dl-item" href="{{ site.baseurl }}/assets/data/patterns.json">
=======
    <a class="dl-item" href="{{ '/assets/data/patterns.json' | relative_url }}">
>>>>>>> 4282b3e146dad83e33d8b8782314368300182522
      <span class="dl-item__type">JSON</span>
      <span>patterns.json</span>
      <span class="dl-item__meta">mapa patrones → MIHM</span>
    </a>
<<<<<<< HEAD
    <a class="dl-item" href="{{ site.baseurl }}/scripts/mihm_v2.py">
=======
    <a class="dl-item" href="{{ '/scripts/mihm_v2.py' | relative_url }}">
>>>>>>> 4282b3e146dad83e33d8b8782314368300182522
      <span class="dl-item__type">PY</span>
      <span>mihm_v2.py</span>
      <span class="dl-item__meta">motor Python</span>
    </a>
<<<<<<< HEAD
    <a class="dl-item" href="{{ site.baseurl }}/assets/data/MIHM_v2_manuscrito_completo.pdf">
=======
    <a class="dl-item" href="{{ '/assets/MIHM_v2_manuscrito_completo.pdf' | relative_url }}">
>>>>>>> 4282b3e146dad83e33d8b8782314368300182522
      <span class="dl-item__type">PDF</span>
      <span>Manuscrito completo</span>
      <span class="dl-item__meta">MIHM v2.0 · CC BY 4.0</span>
    </a>
  </div>

  <div class="doc-nav-foot">
<<<<<<< HEAD
    <a href="{{ site.baseurl }}/">← inicio</a>
    <a href="{{ site.baseurl }}/nodo-ags/">Nodo AGS</a>
    <a href="{{ site.baseurl }}/laboratorio/">Laboratorio</a>
    <a href="{{ site.baseurl }}/mihm/">MIHM</a>
    <a href="{{ site.baseurl }}/_audit/">Audit</a>
  </div>
</div>
=======
    <a href="{{ '/' | relative_url }}">← inicio</a>
    <a href="{{ '/nodo-ags/' | relative_url }}">Nodo AGS</a>
    <a href="{{ '/#lab' | relative_url }}">Lab</a>
    <a href="{{ '/#audit' | relative_url }}">Audit</a>
  </div>
</div>

<script src="{{ '/assets/js/dashboard.js' | relative_url }}"></script>
>>>>>>> 4282b3e146dad83e33d8b8782314368300182522
