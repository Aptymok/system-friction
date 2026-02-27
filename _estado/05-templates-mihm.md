---
layout: estado
title: "05 Â· Templates"
permalink: /estado/05-templates-mihm/
---

<div class="section" id="s5">
  <div class="doc-label">Templates Â· Listos para Jekyll</div>
  <h1>Archivos listos para copiar al repositorio.</h1>
  <p class="doc-meta">Markdown + Liquid Â· Coherentes con el diseÃ±o existente Â· Sin dependencias nuevas</p>

  <h2>Template 1 Â· /mihm/index.md</h2>
  <div class="code-wrap"><pre>
<span class="c-head">---
layout: mihm
title: MIHM Â· Motor de validaciÃ³n
description: Estado observado del ecosistema. IHG activo por nodo.
---</span>

<span class="c-comment">{%- comment -%}
  Layout: mihm â€” usar el CSS del PATCH-07
  PÃ¡gina central de integraciÃ³n entre SF y el motor NODEX
{%- endcomment -%}</span>

<span class="c-key">&lt;div class="mihm-panel"&gt;</span>

<span class="c-val">&lt;div class="nodo-label"&gt;MIHM Â· Motor de validaciÃ³n activo&lt;/div&gt;

&lt;h1&gt;Estado observado del ecosistema.&lt;/h1&gt;</span>

&lt;p class="doc-meta"&gt;
  ActualizaciÃ³n activa Â· Datos verificables Â· Monte Carlo seed 42
  Â· v2.0 Â· {{ site.time | date: "%d %b %Y" }}
&lt;/p&gt;

El MIHM no describe fricciÃ³n. La cuantifica en tiempo real sobre nodos
observables. Este panel es el estado actual del ecosistema System
Friction y sus nodos activos.

---

## Estado actual del ecosistema

&lt;div class="mihm-nodos-grid"&gt;

  &lt;div class="mihm-nodo-card"&gt;
    &lt;div class="mihm-nodo-id"&gt;Nodo AGS Â· Aguascalientes&lt;/div&gt;
    &lt;div class="mihm-ihg-value critical"&gt;IHG âˆ’0.62&lt;/div&gt;
    &lt;div class="mihm-nti-value"&gt;NTI 0.351 Â· UCAP activo&lt;/div&gt;
    &lt;div class="mihm-nodo-status"&gt;
      Post-fractura pacto no escrito Â· 22 feb 2026 Â·
      DesregulaciÃ³n sistÃ©mica crÃ­tica
    &lt;/div&gt;
    &lt;a href="/nodo-ags/" class="mihm-nodo-link"&gt;Ver nodo â†’&lt;/a&gt;
  &lt;/div&gt;

  &lt;div class="mihm-nodo-card inactive"&gt;
    &lt;div class="mihm-nodo-id"&gt;PrÃ³ximo nodo&lt;/div&gt;
    &lt;div class="mihm-ihg-value pending"&gt;â€”&lt;/div&gt;
    &lt;div class="mihm-nodo-status"&gt;En definiciÃ³n Â· sin datos calibrados&lt;/div&gt;
  &lt;/div&gt;

&lt;/div&gt;

---

## DocumentaciÃ³n del motor

&lt;div class="nodo-grid"&gt;
  &lt;div class="nodo-section-divider"&gt;
    MetodologÃ­a &lt;span&gt;v2.0&lt;/span&gt;
  &lt;/div&gt;

  &lt;a href="/docs/core-patrones/" class="nodo-doc"&gt;
    &lt;div class="nodo-doc-title"&gt;CatÃ¡logo de patrones&lt;/div&gt;
    &lt;div class="nodo-doc-sub"&gt;
      Mapeo SF â†” MIHM Â· Variables, ecuaciones, condiciones de refutaciÃ³n.
    &lt;/div&gt;
    &lt;span class="nodo-arrow"&gt;â†’&lt;/span&gt;
  &lt;/a&gt;

  &lt;a href="/docs/core-nti/" class="nodo-doc"&gt;
    &lt;div class="nodo-doc-title"&gt;NTI Â· Auto-auditorÃ­a del ecosistema&lt;/div&gt;
    &lt;div class="nodo-doc-sub"&gt;
      LDI Â· ICC Â· CSR Â· IRCI Â· IIM Â· El sistema observÃ¡ndose a sÃ­ mismo.
    &lt;/div&gt;
    &lt;span class="nodo-arrow"&gt;â†’&lt;/span&gt;
  &lt;/a&gt;

  &lt;a href="/docs/bridge-codigo/" class="nodo-doc"&gt;
    &lt;div class="nodo-doc-title"&gt;NODEX Â· ImplementaciÃ³n Python&lt;/div&gt;
    &lt;div class="nodo-doc-sub"&gt;
      CÃ³mo el cÃ³digo es implementaciÃ³n directa del marco.
      CC BY 4.0 Â· reproducible Â· seed 42.
    &lt;/div&gt;
    &lt;span class="nodo-arrow"&gt;â†’&lt;/span&gt;
  &lt;/a&gt;

  &lt;div class="nodo-section-divider"&gt;
    Validaciones activas &lt;span&gt;en producciÃ³n&lt;/span&gt;
  &lt;/div&gt;

  &lt;a href="/nodo-ags/ags-06/" class="nodo-doc"&gt;
    &lt;div class="nodo-doc-title"&gt;AGS-06 Â· DespuÃ©s del acuerdo&lt;/div&gt;
    &lt;div class="nodo-doc-sub"&gt;
      ValidaciÃ³n empÃ­rica 22-23 feb 2026 Â· Post-fractura del pacto.
      Primera instancia verificada de colapso de U_P.
    &lt;/div&gt;
    &lt;span class="nodo-arrow"&gt;â†’&lt;/span&gt;
  &lt;/a&gt;

  &lt;div class="nodo-note"&gt;
    CÃ³digo completo disponible en
    &lt;a href="https://github.com/Aptymok/system-friction"&gt;
      github.com/Aptymok/system-friction
    &lt;/a&gt;
    Â· branch main Â· seed 42 Â· reproducible Â· CC BY 4.0
  &lt;/div&gt;
&lt;/div&gt;

&lt;/div&gt;</pre></div>
</div>