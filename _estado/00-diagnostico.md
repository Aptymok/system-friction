---
layout: estado
title: Diagnóstico del Sistema
permalink: /estado/00-diagnostico/
---

<div class="section active" id="s0">
  <div class="doc-label">NODEX 50 ticks · sistema auditado</div>
  <h1>La fricción existe<br>dentro del sistema<br>que la describe.</h1>
  <p class="doc-meta">Vector de estado: systemfriction.org · v1.1 · {{ site.data.estado.fecha_actualizacion | date: "%d %B %Y" }}</p>

  <p>System Friction describe con precisión la distancia entre umbral oficial y umbral real en sistemas institucionales. El sitio tiene esa misma distancia en su capa de implementación: el diseño declara "nada superfluo, clínico hasta el límite", pero el DOM tiene títulos duplicados, texto de navegación impreso como contenido, y secciones prometidas que no existen.</p>
  <p>Eso no es una falla fatal. Es la prueba de que el marco funciona: el observador también está dentro del sistema que observa. Pero antes de postular la integración MIHM, el sistema debe cerrar esa brecha.</p>

  <div class="ihg-banner">
    <div class="ihg-stat">
      <div class="ihg-val {% if site.data.estado.ihg_sistema < -0.5 %}critical{% endif %}">
        {{ site.data.estado.ihg_sistema }}
      </div>
      <div class="ihg-label">IHG sistema</div>
    </div>
    <div class="ihg-stat">
      <div class="ihg-val {% if site.data.estado.nti_sistema < 0.5 %}critical{% endif %}">
        {{ site.data.estado.nti_sistema }}
      </div>
      <div class="ihg-label">NTI · bajo umbral estructural (0.50)</div>
    </div>
    <div class="ihg-stat">
      <div class="ihg-val">{{ site.data.estado.bugs_confirmados }}</div>
      <div class="ihg-label">Bugs confirmados</div>
    </div>
    <div class="ihg-stat">
      <div class="ihg-val">{{ site.data.estado.documentos_faltantes }}</div>
      <div class="ihg-label">Documentos faltantes</div>
    </div>
  </div>

  <h2>Vector de estado · capas del sistema</h2>
  <div style="overflow-x:auto">
  <table class="sf-table">
    <thead><tr>
      <th>Capa</th><th>E_i</th><th>C_i</th><th>L_i</th><th>K_i</th><th>R_i</th><th>Diagnóstico</th>
    </tr></thead>
    <tbody>
      <tr>
        <td>Core meta<br><span class="mono dim">core-0 · core-00 · bridge · about</span></td>
        <td class="amber mono">0.68</td><td class="mono">0.82</td>
        <td class="red mono">0.55</td><td class="mono">0.75</td><td class="mono">0.40</td>
        <td>Duplicidad funcional. L_i elevada. H1 × 2 en cada página.</td>
      </tr>
      <tr>
        <td>Serie patrones<br><span class="mono dim">doc-01 — doc-10</span></td>
        <td class="green mono">0.45</td><td class="mono">0.90</td>
        <td class="green mono">0.30</td><td class="mono">0.65</td><td class="mono">0.85</td>
        <td>Alta coherencia interna. K_i baja: rutas sugeridas vacías.</td>
      </tr>
      <tr>
        <td>Nodo Aguascalientes<br><span class="mono dim">ags-01 — ags-06</span></td>
        <td class="red mono">0.92</td><td class="mono">0.78</td>
        <td class="green mono">0.42</td><td class="mono">0.88</td><td class="mono">0.70</td>
        <td>Nodo más maduro. Bajo estrés activo post-fractura.</td>
      </tr>
      <tr>
        <td>Changelog + Licencia<br><span class="mono dim">/changelog · /licencia</span></td>
        <td class="green mono">0.35</td><td class="mono">0.95</td>
        <td class="green mono">0.20</td><td class="mono">0.50</td><td class="mono">0.60</td>
        <td>Changelog: log de versiones, no de aprendizaje sistémico.</td>
      </tr>
    </tbody>
  </table>
  </div>

  <div class="rule"></div>

  <h2>Bugs confirmados en producción</h2>
  <ul>
    {% for bug in site.data.estado.bugs %}
    <li><strong>{{ bug.id }} · {{ bug.impacto }}</strong> — {{ bug.titulo }}. {{ bug.descripcion }}</li>
    {% endfor %}
  </ul>

  <div class="limit-box amber">
    <span class="lb-label">Diagnóstico NODEX</span>
    <p>System Friction no debe ser un blog de patrones ni un repositorio académico. Debe ser la <strong>interfaz canónica de referencia para validaciones MIHM</strong>: los documentos de la Serie como metodología, los Nodos como instancias empíricas, el motor MIHM como la capa que los conecta con datos verificables en tiempo real. El sitio no explica el MIHM. Es la interfaz a través de la cual el MIHM se hace legible para actores que no pueden leer código Python.</p>
    <p>Eso requiere primero estabilizar el sistema. Los 7 bugs activos son la fricción que impide la integración.</p>
  </div>
</div>