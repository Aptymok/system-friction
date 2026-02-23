---
layout: default
title: "MIHM · Motor de validación"
permalink: /mihm/
version: "1.1"
stability: "alta"
---

<main>
  <div class="doc-container">
    <div class="doc-label">MIHM · Integración operativa</div>
    <h1>Motor de validación<br>System Friction ↔ evidencia</h1>
    <p>Fase 2 en curso: panel operativo con snapshots versionados por nodo y lectura pública del estado del sistema.</p>

    <div class="mihm-grid">
      <div class="mihm-card">
        <h3>IHG agregado</h3>
        <div id="mihm-ihg" class="mihm-value critical">—</div>
      </div>
      <div class="mihm-card">
        <h3>NTI (integridad de señal)</h3>
        <div id="mihm-nti" class="mihm-value">—</div>
      </div>
      <div class="mihm-card">
        <h3>Snapshot actualizado</h3>
        <div id="mihm-updated" class="mihm-value" style="font-size:0.86rem;">—</div>
      </div>
    </div>

    <h2>Nodos activos</h2>
    <div class="sf-table-wrap">
      <table class="sf-table">
        <thead>
          <tr>
            <th>Nodo</th>
            <th>IHG</th>
            <th>NTI</th>
            <th>Estado</th>
            <th>Ciclo</th>
            <th>Notas</th>
          </tr>
        </thead>
        <tbody id="mihm-nodes-table">
          <tr><td colspan="6">Cargando snapshot…</td></tr>
        </tbody>
      </table>
    </div>

    <div class="doc-grid mt-4">
      <a href="{{ site.baseurl }}/mihm/catalogo/" class="doc-item new">
        <div class="doc-num">MIHM · 01</div>
        <div class="doc-title">Catálogo SF ↔ MIHM</div>
        <div class="doc-sub">Variables, ecuaciones y condiciones de falsación por patrón.</div>
        <span class="doc-arrow">→</span>
      </a>
      <a href="{{ site.baseurl }}/mihm/nti/" class="doc-item new">
        <div class="doc-num">MIHM · 02</div>
        <div class="doc-title">NTI · Auto-auditoría</div>
        <div class="doc-sub">Integridad de la señal institucional y puntos de ruptura por nodo.</div>
        <span class="doc-arrow">→</span>
      </a>
      <a href="{{ site.baseurl }}/roadmap/" class="doc-item new">
        <div class="doc-num">MIHM · 03</div>
        <div class="doc-title">Roadmap de integración</div>
        <div class="doc-sub">Fases 0→3 para completar la convergencia del stack editorial y métrico.</div>
        <span class="doc-arrow">→</span>
      </a>
    </div>
  </div>
</main>

<script
  src="{{ site.baseurl }}/assets/js/mihm-panel.js"
  data-mihm-state="{{ site.baseurl }}/meta/mihm_state.json"
  data-mihm-equations="{{ site.baseurl }}/meta/mihm_equations.json">
</script>
