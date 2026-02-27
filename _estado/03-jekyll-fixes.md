---
layout: estado
title: "03 Â· Jekyll Fixes"
permalink: /estado/03-jekyll-fixes/
---
<div class="section" id="s3">
  <div class="doc-label green">Jekyll Â· Templates y Markdown</div>
  <h1>Correcciones al template y contenido.</h1>
  <p class="doc-meta">Stack: Jekyll + Liquid + Markdown Â· Tiempo total: ~45 minutos</p>

  <h2>FIX-01 Â· H1 duplicado â€” template layout</h2>
  <div class="fix-card">
    <div class="fix-id">FIX-01 Â· _layouts/default.html o _layouts/doc.html Â· 5 minutos</div>
  </div>
  <p>Localiza el layout que se aplica a los documentos. Busca la lÃ­nea que imprime el tÃ­tulo y <strong>elimÃ­nala</strong>. El Markdown ya genera el H1 con el <code>#</code> inicial.</p>
  <div class="code-wrap"><pre>
<span class="c-comment">&lt;!-- _layouts/doc.html â€” ANTES --&gt;</span>
<span class="c-del">&lt;h1&gt;{{ page.title }}&lt;/h1&gt;</span>
<span class="c-comment">&lt;!-- ...metadata block... --&gt;</span>
{{ content }}

<span class="c-comment">&lt;!-- _layouts/doc.html â€” DESPUÃ‰S --&gt;</span>
<span class="c-ins">&lt;!-- metadata block sin h1 --&gt;
{{ content }}
&lt;!-- El primer # del Markdown genera el Ãºnico H1 --&gt;</span></pre></div>

  <h2>FIX-02 Â· "Rutas sugeridas abajo" â€” limpiar cada archivo .md</h2>
  <div class="fix-card">
    <div class="fix-id">FIX-02 Â· Buscar en todos los .md de _docs/ y nodo-ags/ Â· 10 minutos con grep</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-comment"># Localizar todas las ocurrencias:</span>
<span class="c-ins">grep -rn "Rutas sugeridas abajo" _docs/ nodo-ags/</span>

<span class="c-comment"># La lÃ­nea en cada archivo probablemente es:</span>
<span class="c-del">[â† Ãndice](/) 
Rutas sugeridas abajo</span>

<span class="c-comment"># Reemplazar con (o borrar la segunda lÃ­nea):</span>
<span class="c-ins">[â† Ãndice](/)</span></pre></div>

  <h2>FIX-03 Â· Rutas sugeridas â€” datos en front-matter</h2>
  <div class="fix-card">
    <div class="fix-id">FIX-03 Â· Front-matter de cada doc + _includes/related.html Â· 30 minutos</div>
  </div>
  <p>AÃ±adir campo <code>related</code> al front-matter de cada documento:</p>
  <div class="code-wrap"><pre>
<span class="c-comment"># doc-01.md â€” front-matter</span>
<span class="c-ins">---
title: Decisiones que nadie tomÃ³
published: 2026-02-02
version: "1.0"
stability: alta
type: patrÃ³n
related:
  - url: /docs/doc-09/
    num: "09"
    title: Deuda de decisiÃ³n
    sub: "Costo acumulado de posponer claridad."
  - url: /docs/doc-10/
    num: "10"
    title: Incentivos bien diseÃ±ados que fallan
    sub: "Ley de Goodhart. OptimizaciÃ³n de proxy."
  - url: /nodo-ags/ags-04/
    num: "AGS-04"
    title: La ficciÃ³n institucional
    sub: "MÃ©tricas que describen un sistema que ya no opera asÃ­."
---</span></pre></div>

  <h2>FIX-04 Â· Metadata completa en core-0</h2>
  <div class="fix-card">
    <div class="fix-id">FIX-04 Â· _docs/core-0.md Â· 2 minutos</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-comment"># core-0.md â€” ANTES:</span>
<span class="c-del">---
title: Desde dÃ³nde observa el observador
version: "1.1"
---</span>

<span class="c-ins">---
title: Desde dÃ³nde observa el observador
published: 2026-02-02
version: "1.1"
stability: alta
type: posiciÃ³n de observador
related:
  - url: /docs/core-00/
    num: "core-00"
    title: CÃ³mo leer este ecosistema
    sub: "Tono, progresiÃ³n y lÃ­mites del archivo."
  - url: /docs/core-bridge/
    num: "bridge"
    title: Sistemas que no pueden permitirse fallar
    sub: "Umbral real vs oficial."
---</span></pre></div>

  <h2>FIX-05 Â· Homepage â€” eliminar bullets negativos</h2>
  <div class="fix-card">
    <div class="fix-id">FIX-05 Â· index.md Â· 5 minutos</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-comment"># index.md â€” bloque a reemplazar:</span>
<span class="c-del">* No es un blog
* No emite juicios morales sobre sistemas o actores
* No asume que el lector comparte el mismo contexto institucional
* No se actualiza por consistencia, sino por acumulaciÃ³n de experiencia real</span>

<span class="c-comment"># REEMPLAZAR con una sola lÃ­nea:</span>
<span class="c-ins">Este repositorio describe patrones. El uso es responsabilidad de quien lee.</span></pre></div>

  <h2>FIX-06 Â· Changelog â€” aÃ±adir secciÃ³n de aprendizaje sistÃ©mico</h2>
  <div class="fix-card">
    <div class="fix-id">FIX-06 Â· changelog.md Â· 15 minutos</div>
  </div>
  <div class="code-wrap"><pre>
<span class="c-ins">## [1.1.0] - 2026-02-23

### AÃ±adido
* Nodo AGS-06: "DespuÃ©s del acuerdo" ...

### Aprendizaje sistÃ©mico
**PatrÃ³n nuevo confirmado por ags-05 â†’ ags-06:**
La estabilidad basada en acuerdo implÃ­cito no genera seÃ±al detectable
hasta la fractura. Recalibra doc-06 (alertas que nadie revisa) y
doc-09 (deuda de decisiÃ³n): ambos asumÃ­an seÃ±al silenciosa previa
al colapso. El caso AGS demuestra que cuando el mecanismo de
seÃ±alizaciÃ³n reside en una variable no documentada (U_P), no hay
seÃ±al previa. Solo post-colapso.

**Variable MIHM nueva:** M_i (coherencia discurso-funciÃ³n) emergiÃ³
de observar que la ausencia del Secretario de Seguridad en la Mesa
era indicador mÃ¡s preciso del estado institucional que cualquier
declaraciÃ³n oficial. No estaba en v1.0. ApareciÃ³ al observar AGS.</span></pre></div>
</div>