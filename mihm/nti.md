---
layout: default
title: "NTI · Auto-auditoría"
permalink: /mihm/nti/
---

<main>
  <div class="doc-container">
    <div class="doc-label">MIHM · NTI</div>
    <h1>El sistema se auto-audita</h1>
<<<<<<< HEAD
    <p>Fase 2: cada ciclo publica snapshot de integridad de señal por nodo para comparar narrativa institucional vs estado operativo.</p>
=======
    <p>NTI evalúa divergencia entre narrativa institucional y señal operativa observable. Es una métrica de integridad del canal, no del recurso físico.</p>
>>>>>>> main

    <div class="limit-box" style="border-left-color: var(--accent);">
      <span class="lb-label">criterio mínimo</span>
      NTI debe mantener trazabilidad de fuente, latencia de actualización y método de cálculo por nodo.
    </div>

<<<<<<< HEAD
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
=======
    <ul>
      <li>Fuente declarada por indicador y fecha de extracción.</li>
      <li>Regla de cómputo reproducible y auditable.</li>
      <li>Umbrales de alerta explícitos (estable, tensión, crítico).</li>
    </ul>
  </div>
</main>
>>>>>>> main
