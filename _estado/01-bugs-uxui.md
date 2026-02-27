---
layout: estado
title: "01 Â· Bugs UX/UI"
permalink: /estado/01-bugs-uxui/
---

<div class="section" id="s1">
<div class="section" id="s1">
  <div class="doc-label red">Audit Â· Bugs UX/UI</div>
  <h1>Lo que estÃ¡ y no deberÃ­a estar.</h1>
  <p class="doc-meta">Reproducibles en producciÃ³n Â· Confirmados por lectura directa del DOM Â· {{ site.data.estado.fecha_actualizacion | date: "%d-%m-%Y" }}</p>

  {% for bug in site.data.estado.bugs %}
  <div class="bug-card">
    <div class="bug-id">{{ bug.id }} Â· {{ bug.impacto }} Â· {{ bug.scope }}</div>
    <div class="bug-title">{{ bug.titulo }}</div>
    <div class="bug-scope">{{ bug.scope }}</div>
    <p>{{ bug.descripcion }}</p>
    
    {% if bug.id == "BUG-01" %}
    <p><strong>Evidencia directa en core-00:</strong> El texto "CÃ³mo leer este ecosistema" aparece dos veces antes de la lÃ­nea de metadata "Publicado: 2026-02-02". Mismo patrÃ³n confirmado en core-0, core-bridge, doc-01 a doc-10, ags-01 a ags-06.</p>
    <p><strong>Problema secundario:</strong> Google penaliza mÃºltiples H1 en la misma pÃ¡gina. Los lectores de pantalla (WCAG 2.1) anuncian el encabezado dos veces. El fix es inmediato: eliminar el H1 del layout o del Markdown.</p>
    {% endif %}
    
    {% if bug.id == "BUG-02" %}
    <p>En core-00 aparece como: <code>[â† Ãndice](/) Rutas sugeridas abajo</code> â€” un fragmento mezclado que incluye el enlace de navegaciÃ³n y la nota.</p>
    {% endif %}
    
    {% if bug.id == "BUG-03" %}
    <p>Desde MIHM: reduce K_i de 0.65 a efectivo ~0.30. La conectividad declarada entre documentos no existe funcionalmente. El lector llega al final de un documento sin ruta de continuaciÃ³n.</p>
    {% endif %}
    
    {% if bug.id == "BUG-04" %}
    <p>core-0 muestra Ãºnicamente "VersiÃ³n: 1.1 Â·" en el bloque de metadata. Todos los demÃ¡s documentos (core-00, doc-01â€“10) incluyen: Publicado, VersiÃ³n, Estabilidad, Tipo. La inconsistencia rompe el patrÃ³n tipogrÃ¡fico del encabezado que el propio core-00 describe como "caracterÃ­stica repetible".</p>
    {% endif %}
    
    {% if bug.id == "BUG-05" %}
    <p>Viola la regla central de core-00: <em>"Nada superfluo. Si una frase no contribuye al patrÃ³n, no estÃ¡."</em> El postulado central y la frase sobre core-00 son suficientes para establecer el contrato de lectura. Los bullets son redundantes.</p>
    {% endif %}
    
    {% if bug.id == "BUG-06" %}
    <p><code>overflow-x: hidden</code> en el elemento <code>body</code> impide el scroll horizontal de cualquier elemento hijo con desbordamiento legÃ­timo (tablas, bloques <code>pre</code>). El contenido se corta sin posibilidad de scrollear. TambiÃ©n bloquea <code>position: fixed</code> en iOS Safari.</p>
    {% endif %}
    
    {% if bug.id == "BUG-07" %}
    <p>El overlay de ruido fractal tiene <code>z-index: 100</code> con <code>pointer-events: none</code>: funcional hoy. Pero cualquier elemento de UI futuro (tooltips, modales, dropdowns) con <code>z-index &lt; 100</code> quedarÃ¡ debajo del overlay.</p>
    {% endif %}
  </div>
  {% endfor %}
</div>