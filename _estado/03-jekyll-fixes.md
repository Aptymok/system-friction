---
layout: estado
title: Jekyll Fixes
permalink: /estado/03-jekyll-fixes/
---

<div class="section" id="s3">
  <div class="doc-label green">Jekyll · Templates y Markdown</div>
  <h1>Correcciones al template y contenido.</h1>
  <p class="doc-meta">Stack: Jekyll + Liquid + Markdown · Tiempo total: ~45 minutos</p>

  <h2>FIX-01 · H1 duplicado — template layout</h2>
  <div class="fix-card">
    <div class="fix-id">FIX-01 · _layouts/default.html o _layouts/doc.html · 5 minutos</div>
  </div>
  <p>Localiza el layout que se aplica a los documentos. Busca la línea que imprime el título y <strong>elimínala</strong>. El Markdown ya genera el H1 con el <code>#</code> inicial.</p>
  <div class="code-wrap"><pre>
<span class="c-comment">&lt;!-- _layouts/doc.html — ANTES --&gt;</span>
<span class="c-del">&lt;h1&gt;{{ page.title }}&lt;/h1&gt;</span>
<span class="c-comment">&lt;!-- ...metadata block... --&gt;</span>
{{ content }}

<span class="c-comment">&lt;!-- _layouts/doc.html — DESPUÉS --&gt;</span>
<span class="c-ins">&lt;!-- metadata block sin h1 --&gt;
{{ content }}
&lt;!-- El primer # del Markdown genera el único H1 --&gt;</span></pre></div>

  <h2>FIX-02 · "Rutas sugeridas abajo" — limpiar cada archivo .md</h2>
  <div class="fix-card">
    <div class="fix-id">FIX-02 · Buscar en todos los .md de _docs/ y nodo-ags/ · 10 minutos con grep</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-comment"># Localizar todas las ocurrencias:</span>
<span class="c-ins">grep -rn "Rutas sugeridas abajo" _docs/ nodo-ags/</span>

<span class="c-comment"># La línea en cada archivo probablemente es:</span>
<span class="c-del">[← Índice](/) 
Rutas sugeridas abajo</span>

<span class="c-comment"># Reemplazar con (o borrar la segunda línea):</span>
<span class="c-ins">[← Índice](/)</span></pre></div>

  <h2>FIX-03 · Rutas sugeridas — datos en front-matter</h2>
  <div class="fix-card">
    <div class="fix-id">FIX-03 · Front-matter de cada doc + _includes/related.html · 30 minutos</div>
  </div>
  <p>Añadir campo <code>related</code> al front-matter de cada documento:</p>
  <div class="code-wrap"><pre>
<span class="c-comment"># doc-01.md — front-matter</span>
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
  - url: /nodo-ags/ags-04/
    num: "AGS-04"
    title: La ficción institucional
    sub: "Métricas que describen un sistema que ya no opera así."
---</span></pre></div>

  <h2>FIX-04 · Metadata completa en core-0</h2>
  <div class="fix-card">
    <div class="fix-id">FIX-04 · _docs/core-0.md · 2 minutos</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-comment"># core-0.md — ANTES:</span>
<span class="c-del">---
title: Desde dónde observa el observador
version: "1.1"
---</span>

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
  - url: /docs/core-bridge/
    num: "bridge"
    title: Sistemas que no pueden permitirse fallar
    sub: "Umbral real vs oficial."
---</span></pre></div>

  <h2>FIX-05 · Homepage — eliminar bullets negativos</h2>
  <div class="fix-card">
    <div class="fix-id">FIX-05 · index.md · 5 minutos</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-comment"># index.md — bloque a reemplazar:</span>
<span class="c-del">* No es un blog
* No emite juicios morales sobre sistemas o actores
* No asume que el lector comparte el mismo contexto institucional
* No se actualiza por consistencia, sino por acumulación de experiencia real</span>

<span class="c-comment"># REEMPLAZAR con una sola línea:</span>
<span class="c-ins">Este repositorio describe patrones. El uso es responsabilidad de quien lee.</span></pre></div>

  <h2>FIX-06 · Changelog — añadir sección de aprendizaje sistémico</h2>
  <div class="fix-card">
    <div class="fix-id">FIX-06 · changelog.md · 15 minutos</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-ins">## [1.1.0] - 2026-02-23

### Añadido
* Nodo AGS-06: "Después del acuerdo" ...

### Aprendizaje sistémico
**Patrón nuevo confirmado por ags-05 → ags-06:**
La estabilidad basada en acuerdo implícito no genera señal detectable
hasta la fractura. Recalibra doc-06 (alertas que nadie revisa) y
doc-09 (deuda de decisión): ambos asumían señal silenciosa previa
al colapso. El caso AGS demuestra que cuando el mecanismo de
señalización reside en una variable no documentada (U_P), no hay
señal previa. Solo post-colapso.

**Variable MIHM nueva:** M_i (coherencia discurso-función) emergió
de observar que la ausencia del Secretario de Seguridad en la Mesa
era indicador más preciso del estado institucional que cualquier
declaración oficial. No estaba en v1.0. Apareció al observar AGS.</span></pre></div>
</div>