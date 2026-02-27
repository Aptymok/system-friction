---
layout: estado
title: "01 · Bugs UX/UI"
permalink: /estado/01-bugs-uxui/
---

<div class="section" id="s1">
<div class="section" id="s1">
  <div class="doc-label red">Audit · Bugs UX/UI</div>
  <h1>Lo que está y no debería estar.</h1>
  <p class="doc-meta">Reproducibles en producción · Confirmados por lectura directa del DOM · {{ site.data.estado.fecha_actualizacion | date: "%d-%m-%Y" }}</p>

  {% for bug in site.data.estado.bugs %}
  <div class="bug-card">
    <div class="bug-id">{{ bug.id }} · {{ bug.impacto }} · {{ bug.scope }}</div>
    <div class="bug-title">{{ bug.titulo }}</div>
    <div class="bug-scope">{{ bug.scope }}</div>
    <p>{{ bug.descripcion }}</p>
    
    {% if bug.id == "BUG-01" %}
    <p><strong>Evidencia directa en core-00:</strong> El texto "Cómo leer este ecosistema" aparece dos veces antes de la línea de metadata "Publicado: 2026-02-02". Mismo patrón confirmado en core-0, core-bridge, doc-01 a doc-10, ags-01 a ags-06.</p>
    <p><strong>Problema secundario:</strong> Google penaliza múltiples H1 en la misma página. Los lectores de pantalla (WCAG 2.1) anuncian el encabezado dos veces. El fix es inmediato: eliminar el H1 del layout o del Markdown.</p>
    {% endif %}
    
    {% if bug.id == "BUG-02" %}
    <p>En core-00 aparece como: <code>[← Índice](/) Rutas sugeridas abajo</code> — un fragmento mezclado que incluye el enlace de navegación y la nota.</p>
    {% endif %}
    
    {% if bug.id == "BUG-03" %}
    <p>Desde MIHM: reduce K_i de 0.65 a efectivo ~0.30. La conectividad declarada entre documentos no existe funcionalmente. El lector llega al final de un documento sin ruta de continuación.</p>
    {% endif %}
    
    {% if bug.id == "BUG-04" %}
    <p>core-0 muestra únicamente "Versión: 1.1 ·" en el bloque de metadata. Todos los demás documentos (core-00, doc-01–10) incluyen: Publicado, Versión, Estabilidad, Tipo. La inconsistencia rompe el patrón tipográfico del encabezado que el propio core-00 describe como "característica repetible".</p>
    {% endif %}
    
    {% if bug.id == "BUG-05" %}
    <p>Viola la regla central de core-00: <em>"Nada superfluo. Si una frase no contribuye al patrón, no está."</em> El postulado central y la frase sobre core-00 son suficientes para establecer el contrato de lectura. Los bullets son redundantes.</p>
    {% endif %}
    
    {% if bug.id == "BUG-06" %}
    <p><code>overflow-x: hidden</code> en el elemento <code>body</code> impide el scroll horizontal de cualquier elemento hijo con desbordamiento legítimo (tablas, bloques <code>pre</code>). El contenido se corta sin posibilidad de scrollear. También bloquea <code>position: fixed</code> en iOS Safari.</p>
    {% endif %}
    
    {% if bug.id == "BUG-07" %}
    <p>El overlay de ruido fractal tiene <code>z-index: 100</code> con <code>pointer-events: none</code>: funcional hoy. Pero cualquier elemento de UI futuro (tooltips, modales, dropdowns) con <code>z-index &lt; 100</code> quedará debajo del overlay.</p>
    {% endif %}
  </div>
  {% endfor %}
</div>