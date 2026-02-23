---
layout: default
title: "Archivo de fricción sistémica"
version: "1.1"
stability: "alta"
---

<main>
  <div class="doc-container">

    <div class="doc-label">Punto de entrada</div>
    <h1>System Friction<br>Archivo de fricción sistémica.</h1>

    <div class="limit-box" style="margin-top: 0; border-left-color: var(--accent);">
      <strong>Postulado Central:</strong><br>
      Los sistemas complejos no colapsan por ausencia de información, sino por el costo estructural que implica permitir que la información circule sin distorsión.
    </div>

    <p>Este ecosistema audita la distancia entre el estado real de un sistema crítico y la narrativa institucional que lo administra. Mapeamos la brecha donde la entropía se acumula bajo indicadores oficiales estables.</p>

    <div class="rule"></div>

    <ul class="intro-list">
      <li><strong>No es un manifiesto:</strong> Es una arquitectura de observación.</li>
      <li><strong>No emite juicios:</strong> Describe patrones. El uso es responsabilidad de quien lee.</li>
      <li><strong>No es un blog:</strong> No se actualiza por opinión, sino por acumulación de evidencia.</li>
    </ul>

    <div class="enter-block">
      <a href="{{ site.baseurl }}/docs/core-00/" class="enter-link">Leer desde el principio →</a>
      <span class="enter-note">La lectura de <strong>core-00</strong> modifica lo que se encuentra después.<br>No es obligatorio. Sí es irreversible.</span>
    </div>

    <div class="doc-label mt-5">System Friction · Núcleo Operativo</div>
    <div class="index-count">Expansión acumulativa activa · v1.1</div>

    <div class="doc-grid">

      <a href="{{ site.baseurl }}/docs/core-00/" class="doc-item">
        <div class="doc-num">core-00 · META</div>
        <div class="doc-title">Cómo leer este ecosistema</div>
        <div class="doc-sub">Documento metodológico. Tono, progresión y límites del archivo.</div>
        <span class="doc-arrow">→</span>
      </a>

      <a href="{{ site.baseurl }}/docs/core-0/" class="doc-item" style="border-left: 1px dashed var(--border); opacity: 0.6;">
        <div class="doc-num">core-0 · POSICIÓN</div>
        <div class="doc-title">Desde dónde observa el observador</div>
        <div class="doc-sub">Condición de percepción. Sin número. No se actualiza.</div>
        <span class="doc-arrow">→</span>
      </a>

      <a href="{{ site.baseurl }}/docs/core-bridge/" class="doc-item">
        <div class="doc-num">core-bridge · PUENTE</div>
        <div class="doc-title">Sistemas que no pueden permitirse fallar</div>
        <div class="doc-sub">Umbral real vs oficial. La distancia donde opera el operador.</div>
        <span class="doc-arrow">→</span>
      </a>

    </div>

    <div class="doc-grid mt-4">
      <div class="section-divider">Serie de patrones
        <span>01 – 10 · configuraciones estructurales no jerárquicas</span>
      </div>

      {% assign docs = "01,02,03,04,05,06,07,08,09,10" | split: "," %}
      {% for d in docs %}
      <a href="{{ site.baseurl }}/docs/doc-{{ d }}/" class="doc-item">
        <div class="doc-num">doc-{{ d }}</div>
        <div class="doc-title">
          {% if d == "01" %}Decisiones que nadie tomó{% endif %}
          {% if d == "02" %}Costo real de adoptable{% endif %}
          {% if d == "03" %}Compliance como narrativa{% endif %}
          {% if d == "04" %}Dinero como estructura temporal{% endif %}
          {% if d == "05" %}Escritura sin intención visible{% endif %}
          {% if d == "06" %}Sistemas de alerta que nadie revisa{% endif %}
          {% if d == "07" %}Contexto perdido{% endif %}
          {% if d == "08" %}Personas en alta incertidumbre{% endif %}
          {% if d == "09" %}Deuda de decisión{% endif %}
          {% if d == "10" %}Incentivos bien diseñados que fallan{% endif %}
        </div>
        <span class="doc-arrow">→</span>
      </a>
      {% endfor %}


      <div class="section-divider">Integración MIHM
        <span>panel · catálogo · nti · roadmap</span>
      </div>

      <a href="{{ site.baseurl }}/mihm/" class="doc-item new" style="grid-column: 1 / -1;">
        <div class="doc-num">MIHM · HUB</div>
        <div class="doc-title">Motor de validación y trazabilidad SF ↔ MIHM</div>
        <div class="doc-sub">Puente operativo entre el archivo narrativo y las variables cuantificables del sistema.</div>
        <span class="doc-arrow">→</span>
      </a>
      <div class="section-divider nodo">
        Serie aplicada · Nodo Aguascalientes
        <span>AGS01 – AGS06 · Implementación territorial</span>
      </div>

      <a href="{{ site.baseurl }}/nodo-ags/" class="doc-item nodo" style="grid-column: 1 / -1;">
        <div class="doc-num">NODO AGS · ENTRADA</div>
        <div class="doc-title">Aguascalientes como sistema observable</div>
        <div class="doc-sub">Aplicación del marco a un caso geográfico. Validación empírica post-evento 2026.</div>
        <span class="doc-arrow">→</span>
      </a>

    </div>
  </div>
</main>
