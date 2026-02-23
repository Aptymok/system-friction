---
layout: default
title: "System Friction"
---

<div class="hero">
  <p>
    Los sistemas no fallan por ausencia de intención.<br>
    Fallan porque <strong>nadie nombra lo que todos observan.</strong>
  </p>
  <p>
    Este repositorio no prescribe soluciones.<br>
    Describe patrones. El uso es responsabilidad de quien lee.
  </p>
  <ul class="meta-list">
    <li>No es un blog</li>
    <li>No emite juicios morales sobre sistemas o actores</li>
    <li>No asume que el lector comparte el mismo contexto institucional</li>
    <li>No se actualiza por consistencia, sino por acumulación de experiencia real</li>
  </ul>
  <a class="cta" href="{{ site.baseurl }}/docs/core-00/">Leer desde el principio →</a>
  <span class="cta-note">La lectura de core-00 antes del resto modifica lo que se encuentra después.<br>No es obligatorio. Sí es irreversible.</span>
</div>

<p class="index-section">System Friction · núcleo operativo</p>
<p class="index-section-sub">Condición estructural activa · v1.0</p>

<div class="doc-grid">
  <a class="doc-item" href="{{ site.baseurl }}/docs/core-00/">
    <div class="doc-num">core-00 · META</div>
    <div>
      <div class="doc-title">Cómo leer este ecosistema</div>
      <div class="doc-sub">Documento metodológico. Tono, progresión y límites del archivo.</div>
    </div>
  </a>
  <a class="doc-item" href="{{ site.baseurl }}/docs/core-0/">
    <div class="doc-num">core-0 · POSICIÓN</div>
    <div>
      <div class="doc-title">Desde dónde observa el observador</div>
      <div class="doc-sub">Condición de percepción, no autobiografía. Umbral antes del primer caso.</div>
    </div>
  </a>
  <a class="doc-item" href="{{ site.baseurl }}/docs/core-bridge/">
    <div class="doc-num">core-bridge · PUENTE</div>
    <div>
      <div class="doc-title">Sistemas que no pueden permitirse fallar</div>
      <div class="doc-sub">Umbral real vs oficial. La distancia donde opera el operador.</div>
    </div>
  </a>
</div>

<p class="index-section">Serie de patrones</p>
<p class="index-section-sub">01 – 10 · configuraciones estructurales no jerárquicas · v1.0</p>

<div class="doc-grid">
{% assign sorted_docs = site.docs | sort: "doc_id" %}
{% for doc in sorted_docs %}
  {% unless doc.doc_id contains "core" or doc.doc_id contains "licencia" %}
  <a class="doc-item" href="{{ doc.url }}">
    <div class="doc-num">{{ doc.doc_id }}</div>
    <div>
      <div class="doc-title">{{ doc.title }}</div>
      <div class="doc-sub">{{ doc.summary }}</div>
    </div>
  </a>
  {% endunless %}
{% endfor %}
</div>

<p class="index-section">Serie aplicada · Nodo Aguascalientes</p>
<p class="index-section-sub">AGS01 – AGS05 · implementación territorial</p>

<div class="doc-grid">
  <a class="doc-item" href="{{ site.baseurl }}/nodo-ags/">
    <div class="doc-num">NODO AGS · ENTRADA</div>
    <div>
      <div class="doc-title">Aguascalientes como sistema observable</div>
      <div class="doc-sub">Aplicación del marco a un caso geográfico con datos verificables.</div>
    </div>
  </a>
</div>
