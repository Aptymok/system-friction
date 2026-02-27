---
layout: estado
title: Estado del Sistema · System Friction
permalink: /estado/
---

<!-- ======================================================
     SECCIÓN 00 · DIAGNÓSTICO
====================================================== -->
<div class="section active" id="s0">
  <div class="doc-label">NODEX 50 ticks · sistema auditado</div>
  <h1>La fricción existe<br>dentro del sistema<br>que la describe.</h1>
  <p class="doc-meta">Vector de estado: systemfriction.org · v1.1 · 23-02-2026</p>

  <p>System Friction describe con precisión la distancia entre umbral oficial y umbral real en sistemas institucionales. El sitio tiene esa misma distancia en su capa de implementación: el diseño declara "nada superfluo, clínico hasta el límite", pero el DOM tiene títulos duplicados, texto de navegación impreso como contenido, y secciones prometidas que no existen.</p>
  <p>Eso no es una falla fatal. Es la prueba de que el marco funciona: el observador también está dentro del sistema que observa. Pero antes de postular la integración MIHM, el sistema debe cerrar esa brecha.</p>

  <div class="ihg-banner">
    <div class="ihg-stat">
      <div class="ihg-val critical">−0.31</div>
      <div class="ihg-label">IHG sistema</div>
    </div>
    <div class="ihg-stat">
      <div class="ihg-val">0.47</div>
      <div class="ihg-label">NTI · bajo umbral estructural (0.50)</div>
    </div>
    <div class="ihg-stat">
      <div class="ihg-val">7</div>
      <div class="ihg-label">Bugs confirmados</div>
    </div>
    <div class="ihg-stat">
      <div class="ihg-val">6</div>
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
    <li><strong>BUG-01 · CRÍTICO</strong> — H1 duplicado en cada página. Template Jekyll imprime <code>{{ page.title }}</code> y el markdown repite <code># Título</code>. Dos <code>&lt;h1&gt;</code> en el DOM.</li>
    <li><strong>BUG-02 · MODERADO</strong> — Texto "<code>Rutas sugeridas abajo</code>" impreso como párrafo visible. Nota de navegación interna que no está marcada como comentario.</li>
    <li><strong>BUG-03 · MODERADO</strong> — Sección "Rutas sugeridas" presente pero sin enlaces. <code>.related-grid</code> renderiza vacío en todos los documentos.</li>
    <li><strong>BUG-04 · MENOR</strong> — <code>core-0</code> sin campos Publicado / Estabilidad / Tipo. Rompe la consistencia tipográfica del encabezado.</li>
    <li><strong>BUG-05 · MODERADO</strong> — Homepage: tres bullets negativos ("No es un blog…") violan core-00 ("nada superfluo"). Aumentan E_i cognitivo antes del primer documento.</li>
    <li><strong>BUG-06 · MENOR</strong> — <code>overflow-x: hidden</code> en body oculta scroll horizontal de tablas y bloques <code>pre</code> en mobile. Cortar contenido sin escape.</li>
    <li><strong>BUG-07 · ESTRUCTURAL</strong> — <code>body::before</code> (ruido fractal) tiene <code>z-index: 100</code> con <code>pointer-events: none</code>: correcto, pero puede interferir con tooltips o dropdowns futuros que necesiten <code>z-index &gt; 100</code>. Mover a <code>z-index: 1</code>.</li>
  </ul>

  <div class="rule"></div>

  <h2>Función óptima del sitio</h2>

  <div class="limit-box amber">
    <span class="lb-label">Diagnóstico NODEX</span>
    <p>System Friction no debe ser un blog de patrones ni un repositorio académico. Debe ser la <strong>interfaz canónica de referencia para validaciones MIHM</strong>: los documentos de la Serie como metodología, los Nodos como instancias empíricas, el motor MIHM como la capa que los conecta con datos verificables en tiempo real. El sitio no explica el MIHM. Es la interfaz a través de la cual el MIHM se hace legible para actores que no pueden leer código Python.</p>
    <p>Eso requiere primero estabilizar el sistema. Los 7 bugs activos son la fricción que impide la integración.</p>
  </div>
</div>

<!-- ======================================================
     SECCIÓN 01 · BUGS UX/UI
====================================================== -->
<div class="section" id="s1">
  <div class="doc-label red">Audit · Bugs UX/UI</div>
  <h1>Lo que está y no debería estar.</h1>
  <p class="doc-meta">Reproducibles en producción · Confirmados por lectura directa del DOM · 23-02-2026</p>

  <div class="bug-card">
    <div class="bug-id">BUG-01 · CRÍTICO · Toda la Serie + Core + Nodos</div>
    <div class="bug-title">H1 duplicado en cada documento</div>
    <div class="bug-scope">Páginas afectadas: todas. Impacto: accesibilidad, SEO, coherencia visual.</div>
    <p>Cada página del sitio muestra el título dos veces consecutivas. El layout de Jekyll renderiza <code>{{ page.title }}</code> como <code>&lt;h1&gt;</code>; luego el contenido Markdown comienza con <code># Mismo título</code>, generando un segundo <code>&lt;h1&gt;</code> idéntico.</p>
    <p><strong>Evidencia directa en core-00:</strong> El texto "Cómo leer este ecosistema" aparece dos veces antes de la línea de metadata "Publicado: 2026-02-02". Mismo patrón confirmado en core-0, core-bridge, doc-01 a doc-10, ags-01 a ags-06.</p>
    <p><strong>Problema secundario:</strong> Google penaliza múltiples H1 en la misma página. Los lectores de pantalla (WCAG 2.1) anuncian el encabezado dos veces. El fix es inmediato: eliminar el H1 del layout o del Markdown.</p>
  </div>

  <div class="bug-card">
    <div class="bug-id">BUG-02 · MODERADO · Toda la Serie + Nodos</div>
    <div class="bug-title">Texto "Rutas sugeridas abajo" impreso como contenido</div>
    <div class="bug-scope">Confirmado en: core-00, doc-01, ags-06 y presumiblemente todos los documentos.</div>
    <p>El texto literal <em>"Rutas sugeridas abajo"</em> aparece como párrafo visible entre el cuerpo del documento y la sección <code>## Rutas sugeridas</code>. Es una nota de navegación interna que no fue marcada como comentario HTML antes de publicar.</p>
    <p>En core-00 aparece como: <code>[← Índice](/) Rutas sugeridas abajo</code> — un fragmento mezclado que incluye el enlace de navegación y la nota.</p>
  </div>

  <div class="bug-card">
    <div class="bug-id">BUG-03 · MODERADO · Toda la Serie</div>
    <div class="bug-title">Sección "Rutas sugeridas" prometida pero vacía</div>
    <div class="bug-scope">Todos los documentos doc-01 a doc-10 y documentos core.</div>
    <p>Cada documento termina con <code>## Rutas sugeridas</code> y el subtítulo "Sugerencias basadas en patrones compartidos y patrones relacionados. No implican secuencia ni orden recomendado." — pero el <code>.related-grid</code> no contiene ningún enlace.</p>
    <p>Desde MIHM: reduce K_i de 0.65 a efectivo ~0.30. La conectividad declarada entre documentos no existe funcionalmente. El lector llega al final de un documento sin ruta de continuación.</p>
  </div>

  <div class="bug-card">
    <div class="bug-id">BUG-04 · MENOR · core-0</div>
    <div class="bug-title">Metadata incompleta en core-0 vs el resto del ecosistema</div>
    <div class="bug-scope">Solo /docs/core-0/</div>
    <p>core-0 muestra únicamente "Versión: 1.1 ·" en el bloque de metadata. Todos los demás documentos (core-00, doc-01–10) incluyen: Publicado, Versión, Estabilidad, Tipo. La inconsistencia rompe el patrón tipográfico del encabezado que el propio core-00 describe como "característica repetible".</p>
  </div>

  <div class="bug-card">
    <div class="bug-id">BUG-05 · MODERADO · Homepage /</div>
    <div class="bug-title">Overspecification defensiva en el índice principal</div>
    <div class="bug-scope">index.md — impacto: E_i cognitivo del lector nuevo.</div>
    <p>Los cuatro bullets de la homepage ("No es un blog / No emite juicios morales / No asume que el lector…/ No se actualiza por consistencia") forman un bloque negativo que activa resistencia antes de que el lector haya visto un solo patrón.</p>
    <p>Viola la regla central de core-00: <em>"Nada superfluo. Si una frase no contribuye al patrón, no está."</em> El postulado central y la frase sobre core-00 son suficientes para establecer el contrato de lectura. Los bullets son redundantes y, funcionalmente, están describiendo lo que el sistema <em>no</em> hace en lugar de lo que hace.</p>
  </div>

  <div class="bug-card">
    <div class="bug-id">BUG-06 · MENOR · Mobile (&lt;375px)</div>
    <div class="bug-title">overflow-x: hidden en body oculta tablas y código</div>
    <div class="bug-scope">CSS global · body { overflow-x: hidden }</div>
    <p><code>overflow-x: hidden</code> en el elemento <code>body</code> impide el scroll horizontal de cualquier elemento hijo con desbordamiento legítimo (tablas, bloques <code>pre</code>). El contenido se corta sin posibilidad de scrollear. <code>overflow: hidden</code> en body también bloquea <code>position: fixed</code> en iOS Safari.</p>
    <p>El fix es mover el recorte al contenedor específico usando <code>overflow-x: clip</code> en body (no crea contexto de scroll) y <code>overflow-x: auto</code> en tablas y pre.</p>
  </div>

  <div class="bug-card">
    <div class="bug-id">BUG-07 · MENOR · CSS global</div>
    <div class="bug-title">z-index: 100 en body::before puede generar conflictos futuros</div>
    <div class="bug-scope">body::before { z-index: 100 }</div>
    <p>El overlay de ruido fractal tiene <code>z-index: 100</code> con <code>pointer-events: none</code>: funcional hoy. Pero cualquier elemento de UI futuro (tooltips, modales, dropdowns) con <code>z-index &lt; 100</code> quedará debajo del overlay. La convención estándar para overlays decorativos es <code>z-index: 0</code> o <code>1</code>, dejando el espacio alto para elementos interactivos.</p>
  </div>
</div>

<!-- ======================================================
     SECCIÓN 02 · CSS PATCHES
====================================================== -->
<div class="section" id="s2">
  <div class="doc-label green">CSS patches · Aplicar en orden</div>
  <h1>Correcciones al stylesheet existente.</h1>
  <p class="doc-meta">Aplicar sobre el CSS actual · Sin romper nada existente · Tiempo estimado: 15 minutos</p>

  <h2>PATCH-01 · overflow-x + z-index (BUG-06 + BUG-07)</h2>
  <div class="fix-card">
    <div class="fix-id">PATCH-01 · Buscar y reemplazar en el CSS global</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-comment">/* ── ANTES ─────────────────────────────── */</span>
<span class="c-del">body {
  overflow-x: hidden;
}</span>

<span class="c-del">body::before {
  ...
  z-index: 100;
  opacity: 0.4;
}</span>

<span class="c-comment">/* ── DESPUÉS ────────────────────────────── */</span>
<span class="c-ins">body {
  overflow-x: clip;
}</span>

<span class="c-ins">body::before {
  ...
  z-index: 1;
  opacity: 0.4;
}</span>

<span class="c-comment">/* ── AÑADIR al bloque de tablas/pre ─────── */</span>
<span class="c-ins">.sf-table-wrap,
pre,
.code-block,
code {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}</span></pre></div>

  <h2>PATCH-02 · Eliminar el H1 del layout (BUG-01)</h2>
  <div class="fix-card">
    <div class="fix-id">PATCH-02 · Solo si el layout usa un h1 para el título — NO es cambio CSS sino de template</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-comment">/* Opción de emergencia */</span>
<span class="c-ins">.doc-container > h1:first-of-type + h1,
.nodo-entry > h1:first-of-type + h1 {
  display: none;
}</span></pre></div>

  <h2>PATCH-03 · Rutas sugeridas condicionales (BUG-03)</h2>
  <div class="fix-card">
    <div class="fix-id">PATCH-03 · CSS para .related vacío</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-ins">.related:not(:has(.related-item)) {
  display: none;
}

.related-empty {
  display: none;
}</span></pre></div>

  <h2>PATCH-04 · Texto "Rutas sugeridas abajo" (BUG-02)</h2>
  <div class="fix-card">
    <div class="fix-id">PATCH-04 · Supresión CSS de emergencia</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-ins">.related-nav-hint {
  display: none;
}

.related ~ .related-nav-hint,
h2#rutas-sugeridas + p.hint {
  display: none;
}</span></pre></div>

  <h2>PATCH-05 · Variables nuevas para el módulo MIHM</h2>
  <div class="fix-card">
    <div class="fix-id">PATCH-05 · Añadir al bloque :root</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-ins">:root {
  --ihg-critical: #c86e6e;
  --ihg-risk:     #c8a96e;
  --ihg-stable:   #6ec88a;
  --ihg-optimal:  #6e9ac8;
  --mapeo-bg:     #0f0d05;
  --mapeo-border: #4a3a10;
}</span></pre></div>

  <h2>PATCH-06 · Componente .mapeo-box</h2>
  <div class="fix-card">
    <div class="fix-id">PATCH-06 · Añadir al final del CSS</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-ins">.mapeo-box {
  border: 1px solid var(--mapeo-border, #4a3a10);
  background: var(--mapeo-bg, #0f0d05);
  padding: 1.4rem 1.5rem;
  margin: 2.5rem 0;
  font-family: var(--mono);
}

.mapeo-box-label {
  font-size: 0.56rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 1rem;
  display: block;
}

.mapeo-box table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.68rem;
}
.mapeo-box th {
  text-align: left;
  color: var(--accent-dim);
  font-size: 0.58rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.3rem 0.8rem 0.5rem;
  border-bottom: 1px solid var(--border);
}
.mapeo-box td {
  padding: 0.45rem 0.8rem;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  line-height: 1.5;
}
.mapeo-box tr:last-child td { border-bottom: none; }
.mapeo-box code {
  color: var(--accent);
  font-size: 0.68rem;
  background: none;
}</span></pre></div>
</div>

<!-- ======================================================
     SECCIÓN 03 · JEKYLL FIXES
====================================================== -->
<div class="section" id="s3">
  <div class="doc-label green">Jekyll · Templates y Markdown</div>
  <h1>Correcciones al template y contenido.</h1>
  <p class="doc-meta">Stack: Jekyll + Liquid + Markdown · Tiempo total: ~45 minutos</p>

  <h2>FIX-01 · H1 duplicado — template layout</h2>
  <div class="fix-card">
    <div class="fix-id">FIX-01 · _layouts/default.html o _layouts/doc.html</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-comment">&lt;!-- _layouts/doc.html — ANTES --&gt;</span>
<span class="c-del">&lt;h1&gt;{{ page.title }}&lt;/h1&gt;</span>

<span class="c-comment">&lt;!-- _layouts/doc.html — DESPUÉS --&gt;</span>
<span class="c-ins">{{ content }}</span></pre></div>

  <h2>FIX-02 · "Rutas sugeridas abajo" — limpiar cada archivo .md</h2>
  <div class="fix-card">
    <div class="fix-id">FIX-02 · Buscar en todos los .md</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-comment"># Buscar:</span>
<span class="c-ins">grep -rn "Rutas sugeridas abajo" _docs/ nodo-ags/</span>

<span class="c-comment"># Reemplazar con:</span>
<span class="c-ins">[← Índice](/)</span></pre></div>

  <h2>FIX-03 · Rutas sugeridas — datos en front-matter</h2>
  <div class="fix-card">
    <div class="fix-id">FIX-03 · Front-matter de cada doc</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-ins">---
title: Decisiones que nadie tomó
published: 2026-02-02
version: "1.0"
stability: alta
type: patrón
related:
  - url: /docs/doc-09/
    num: "09"
    title: Deuda de decisión
    sub: "Costo acumulado de posponer claridad."
  - url: /docs/doc-10/
    num: "10"
    title: Incentivos bien diseñados que fallan
    sub: "Ley de Goodhart. Optimización de proxy."
---</span></pre></div>

  <h2>FIX-04 · Metadata completa en core-0</h2>
  <div class="fix-card">
    <div class="fix-id">FIX-04 · _docs/core-0.md</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-ins">---
title: Desde dónde observa el observador
published: 2026-02-02
version: "1.1"
stability: alta
type: posición de observador
related:
  - url: /docs/core-00/
    num: "core-00"
    title: Cómo leer este ecosistema
    sub: "Tono, progresión y límites del archivo."
---</span></pre></div>

  <h2>FIX-05 · Homepage — eliminar bullets negativos</h2>
  <div class="fix-card">
    <div class="fix-id">FIX-05 · index.md</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-comment"># REEMPLAZAR los 4 bullets con:</span>
<span class="c-ins">Este repositorio describe patrones. El uso es responsabilidad de quien lee.</span></pre></div>
</div>

<!-- ======================================================
     SECCIÓN 04 · ARQUITECTURA
====================================================== -->
<div class="section" id="s4">
  <div class="doc-label blue">Arquitectura · Propuesta v2.0</div>
  <h1>De repositorio<br>a consola de observación.</h1>
  <p class="doc-meta">Propuesta estructural · Implementable sin cambio de stack · Fases 0→3</p>

  <p>El sitio ya tiene la estructura correcta en su parte conceptual: Serie (patrones abstractos), Nodos (instanciación empírica), Core (metodología). Le falta una tercera capa que conecte ambas con datos verificables en tiempo real.</p>

  <div class="rule"></div>

  <h2>Documentos existentes — mantener</h2>
  <div class="doc-grid">
    <div class="doc-item">
      <div class="doc-num">core-0 · core-00 · core-bridge</div>
      <div class="doc-title">Capa metodológica</div>
      <div class="doc-sub">Mantener como están. Corregir solo los bugs de duplicidad y metadata. Son el umbral de lectura correcto.</div>
    </div>
    <div class="doc-item">
      <div class="doc-num">doc-01 — doc-10</div>
      <div class="doc-title">Serie de patrones</div>
      <div class="doc-sub">Completar rutas sugeridas. Añadir caja .mapeo-box a cada documento vinculando el patrón con su variable MIHM.</div>
    </div>
    <div class="doc-item">
      <div class="doc-num">nodo-ags · ags-01—06</div>
      <div class="doc-title">Nodo Aguascalientes</div>
      <div class="doc-sub">Vincular explícitamente con MIHM. Base del template para futuros nodos. El único caso con ags-06 validado.</div>
    </div>
  </div>

  <div class="rule"></div>

  <h2>Documentos nuevos — prioridad 1</h2>
  <div class="doc-grid">
    <div class="doc-item new">
      <div class="doc-num">nuevo · /mihm/</div>
      <div class="doc-title">MIHM · Panel de estado</div>
      <div class="doc-sub">Panel central: IHG y NTI actuales de todos los nodos activos, escenarios Monte Carlo, enlaces a código Python.</div>
    </div>
    <div class="doc-item new">
      <div class="doc-num">nuevo · /docs/core-patrones/</div>
      <div class="doc-title">Catálogo de patrones SF ↔ MIHM</div>
      <div class="doc-sub">Mapeo explícito: cada patrón de System Friction con su variable MIHM, ecuación, condiciones de aparición y de refutación.</div>
    </div>
    <div class="doc-item new">
      <div class="doc-num">nuevo · /docs/core-nti/</div>
      <div class="doc-title">NTI · El sistema se auto-audita</div>
      <div class="doc-sub">Descripción técnica del NTI como instrumento de observación del propio ecosistema.</div>
    </div>
  </div>

  <div class="rule"></div>

  <h2>Cajas .mapeo-box — ejemplo en doc-01</h2>

  <div class="mapeo-box">
    <span class="mapeo-label">Mapeo MIHM · doc-01</span>
    <div style="overflow-x:auto">
    <table style="width:100%">
      <thead><tr>
        <th>Elemento del patrón</th>
        <th>Variable MIHM</th>
        <th>Proxy / Ecuación</th>
      </tr></thead>
      <tbody>
        <tr><td>Decisión cristalizada por acumulación</td><td><code>L_i</code> latencia</td><td>LDI = t_decisión_real / t_protocolo</td></tr>
        <tr><td>Zona gris operativa aceptada</td><td><code>E_i</code> carga</td><td>E_zona = ambigüedad_activa / capacidad</td></tr>
        <tr><td>Optimización de coherencia aparente</td><td><code>M_i</code> coherencia</td><td>M = 1 − |declarado − observable| / declarado</td></tr>
      </tbody>
    </table>
    </div>
  </div>
</div>

<!-- ======================================================
     SECCIÓN 05 · TEMPLATES MIHM
====================================================== -->
<div class="section" id="s5">
  <div class="doc-label">Templates · Listos para Jekyll</div>
  <h1>Archivos listos para copiar al repositorio.</h1>
  <p class="doc-meta">Markdown + Liquid · Coherentes con el diseño existente · Sin dependencias nuevas</p>

  <h2>Template /mihm/index.md</h2>
  <div class="code-wrap"><pre>
<span class="c-head">---
layout: mihm
title: MIHM · Motor de validación
---</span>

<span class="c-key">&lt;div class="mihm-panel"&gt;</span>

&lt;h1&gt;Estado observado del ecosistema.&lt;/h1&gt;
&lt;p class="doc-meta"&gt;Actualización activa · v2.0&lt;/p&gt;

&lt;div class="mihm-nodos-grid"&gt;
  &lt;div class="mihm-nodo-card"&gt;
    &lt;div class="mihm-nodo-id"&gt;Nodo AGS · Aguascalientes&lt;/div&gt;
    &lt;div class="mihm-ihg-value critical"&gt;IHG −0.62&lt;/div&gt;
    &lt;div class="mihm-nti-value"&gt;NTI 0.351 · UCAP activo&lt;/div&gt;
    &lt;a href="/nodo-ags/" class="mihm-nodo-link"&gt;Ver nodo →&lt;/a&gt;
  &lt;/div&gt;
&lt;/div&gt;

&lt;/div&gt;</pre></div>
</div>

<!-- ======================================================
     SECCIÓN 06 · ROADMAP
====================================================== -->
<div class="section" id="s6">
  <div class="doc-label">Roadmap · 90 días</div>
  <h1>Estabilizar antes de postular.</h1>
  <p class="doc-meta">Fecha base: 23 feb 2026 · Revisión: 23 may 2026</p>

  <h2>Fase 0 · Hoy (1–2 horas)</h2>
  <div class="priority-item">
    <div class="p-num">P0</div>
    <div class="p-content">
      <h3>FIX-01 · H1 duplicado</h3>
      <p>Eliminar la línea <code>{{ page.title }}</code> del layout.</p>
    </div>
  </div>
  <div class="priority-item">
    <div class="p-num">P0</div>
    <div class="p-content">
      <h3>FIX-02 · Texto "Rutas sugeridas abajo"</h3>
      <p>Borrar en cada archivo .md.</p>
    </div>
  </div>
  <div class="priority-item">
    <div class="p-num">P0</div>
    <div class="p-content">
      <h3>FIX-05 · Homepage bullets negativos</h3>
      <p>Reemplazar 4 bullets con una línea.</p>
    </div>
  </div>

  <h2>Fase 1 · Semana 1</h2>
  <div class="priority-item">
    <div class="p-num">P1</div>
    <div class="p-content">
      <h3>FIX-01 CSS · overflow-x: clip + z-index: 1</h3>
      <p>Patch-01 del CSS.</p>
    </div>
  </div>
  <div class="priority-item">
    <div class="p-num">P1</div>
    <div class="p-content">
      <h3>FIX-03 · Rutas sugeridas con datos reales</h3>
      <p>Añadir front-matter <code>related</code> a los 10 documentos.</p>
    </div>
  </div>

  <div class="rule"></div>

  <h2>NTI del ecosistema: antes y después</h2>
  <table class="sf-table">
    <thead><tr><th>Componente</th><th>NTI actual</th><th>NTI post-fixes</th></tr></thead>
    <tbody>
      <tr><td>LDI_norm</td><td class="red mono">0.45</td><td class="green mono">0.85</td></tr>
      <tr><td>ICC_norm</td><td class="mono">0.80</td><td class="mono">0.80</td></tr>
      <tr><td>CSR</td><td class="red mono">0.30</td><td class="green mono">0.70</td></tr>
      <tr><td>IRCI_norm</td><td class="mono">0.90</td><td class="mono">0.90</td></tr>
      <tr><td>IIM</td><td class="amber mono">0.60</td><td class="green mono">0.82</td></tr>
      <tr style="background:var(--surface)"><td><strong>NTI total</strong></td><td class="red mono"><strong>0.47</strong></td><td class="green mono"><strong>0.81</strong></td></tr>
    </tbody>
  </table>
</div>