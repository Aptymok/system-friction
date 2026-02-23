---
layout: default
title: "Catálogo SF ↔ MIHM"
permalink: /mihm/catalogo/
version: "1.1"
stability: "alta"
---

<main>
  <div class="doc-container">
    <div class="doc-label">MIHM · Catálogo</div>
    <h1>Mapeo explícito<br>de patrones a variables</h1>
    <p class="doc-meta">Versión de ecuaciones: <span id="mihm-equations-version">cargando…</span></p>

    <div class="sf-table-wrap">
      <table class="sf-table">
        <thead><tr><th>Patrón SF</th><th>Variable MIHM</th><th>Ecuación</th><th>Condición de refutación</th></tr></thead>
        <tbody id="mihm-equations-table">
          <tr><td colspan="4">Cargando catálogo…</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</main>

<script
  src="{{ site.baseurl }}/assets/js/mihm-panel.js"
  data-mihm-equations="{{ site.baseurl }}/meta/mihm_equations.json">
</script>
