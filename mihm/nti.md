---
layout: default
title: "NTI · Auto-auditoría"
permalink: /mihm/nti/
version: "1.1"
stability: "alta"
---

<main>
  <div class="doc-container">
    <div class="doc-label">MIHM · NTI</div>
    <h1>El sistema se auto-audita</h1>
    <p>Fase 2: cada ciclo publica snapshot de integridad de señal por nodo para comparar narrativa institucional vs estado operativo.</p>

    <div class="limit-box" style="border-left-color: var(--accent);">
      <span class="lb-label">criterio mínimo</span>
      NTI debe mantener trazabilidad de fuente, latencia de actualización y método de cálculo por nodo.
    </div>

    <div class="sf-table-wrap">
      <table class="sf-table">
        <thead>
          <tr><th>Nodo</th><th>NTI</th><th>Estado</th><th>Ciclo</th><th>Nota operativa</th></tr>
        </thead>
        <tbody id="mihm-nodes-table">
          <tr><td colspan="5">Cargando snapshot…</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</main>

<script
  src="{{ site.baseurl }}/assets/js/mihm-panel.js"
  data-mihm-state="{{ site.baseurl }}/meta/mihm_state.json">
</script>
