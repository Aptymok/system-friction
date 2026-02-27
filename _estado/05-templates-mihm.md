---
layout: estado
title: "05 · Templates"
permalink: /estado/05-templates-mihm/
---

<div class="section" id="s5">
  <div class="doc-label">Templates · Listos para Jekyll</div>
  <h1>Archivos listos para copiar al repositorio.</h1>
  <p class="doc-meta">Markdown + Liquid · Coherentes con el diseño existente · Sin dependencias nuevas</p>

  <h2>Template 1 · /mihm/index.md</h2>
  <div class="code-wrap"><pre>
<span class="c-head">---
layout: mihm
title: MIHM · Motor de validación
description: Estado observado del ecosistema. IHG activo por nodo.
---</span>

<span class="c-comment">{%- comment -%}
  Layout: mihm — usar el CSS del PATCH-07
  Página central de integración entre SF y el motor NODEX
{%- endcomment -%}</span>

<span class="c-key">&lt;div class="mihm-panel"&gt;</span>

<span class="c-val">&lt;div class="nodo-label"&gt;MIHM · Motor de validación activo&lt;/div&gt;

&lt;h1&gt;Estado observado del ecosistema.&lt;/h1&gt;</span>

&lt;p class="doc-meta"&gt;
  Actualización activa · Datos verificables · Monte Carlo seed 42
  · v2.0 · {{ site.time | date: "%d %b %Y" }}
&lt;/p&gt;

El MIHM no describe fricción. La cuantifica en tiempo real sobre nodos
observables. Este panel es el estado actual del ecosistema System
Friction y sus nodos activos.

---

## Estado actual del ecosistema

&lt;div class="mihm-nodos-grid"&gt;

  &lt;div class="mihm-nodo-card"&gt;
    &lt;div class="mihm-nodo-id"&gt;Nodo AGS · Aguascalientes&lt;/div&gt;
    &lt;div class="mihm-ihg-value critical"&gt;IHG −0.62&lt;/div&gt;
    &lt;div class="mihm-nti-value"&gt;NTI 0.351 · UCAP activo&lt;/div&gt;
    &lt;div class="mihm-nodo-status"&gt;
      Post-fractura pacto no escrito · 22 feb 2026 ·
      Desregulación sistémica crítica
    &lt;/div&gt;
    &lt;a href="/nodo-ags/" class="mihm-nodo-link"&gt;Ver nodo →&lt;/a&gt;
  &lt;/div&gt;

  &lt;div class="mihm-nodo-card inactive"&gt;
    &lt;div class="mihm-nodo-id"&gt;Próximo nodo&lt;/div&gt;
    &lt;div class="mihm-ihg-value pending"&gt;—&lt;/div&gt;
    &lt;div class="mihm-nodo-status"&gt;En definición · sin datos calibrados&lt;/div&gt;
  &lt;/div&gt;

&lt;/div&gt;

---

## Documentación del motor

&lt;div class="nodo-grid"&gt;
  &lt;div class="nodo-section-divider"&gt;
    Metodología &lt;span&gt;v2.0&lt;/span&gt;
  &lt;/div&gt;

  &lt;a href="/docs/core-patrones/" class="nodo-doc"&gt;
    &lt;div class="nodo-doc-title"&gt;Catálogo de patrones&lt;/div&gt;
    &lt;div class="nodo-doc-sub"&gt;
      Mapeo SF ↔ MIHM · Variables, ecuaciones, condiciones de refutación.
    &lt;/div&gt;
    &lt;span class="nodo-arrow"&gt;→&lt;/span&gt;
  &lt;/a&gt;

  &lt;a href="/docs/core-nti/" class="nodo-doc"&gt;
    &lt;div class="nodo-doc-title"&gt;NTI · Auto-auditoría del ecosistema&lt;/div&gt;
    &lt;div class="nodo-doc-sub"&gt;
      LDI · ICC · CSR · IRCI · IIM · El sistema observándose a sí mismo.
    &lt;/div&gt;
    &lt;span class="nodo-arrow"&gt;→&lt;/span&gt;
  &lt;/a&gt;

  &lt;a href="/docs/bridge-codigo/" class="nodo-doc"&gt;
    &lt;div class="nodo-doc-title"&gt;NODEX · Implementación Python&lt;/div&gt;
    &lt;div class="nodo-doc-sub"&gt;
      Cómo el código es implementación directa del marco.
      CC BY 4.0 · reproducible · seed 42.
    &lt;/div&gt;
    &lt;span class="nodo-arrow"&gt;→&lt;/span&gt;
  &lt;/a&gt;

  &lt;div class="nodo-section-divider"&gt;
    Validaciones activas &lt;span&gt;en producción&lt;/span&gt;
  &lt;/div&gt;

  &lt;a href="/nodo-ags/ags-06/" class="nodo-doc"&gt;
    &lt;div class="nodo-doc-title"&gt;AGS-06 · Después del acuerdo&lt;/div&gt;
    &lt;div class="nodo-doc-sub"&gt;
      Validación empírica 22-23 feb 2026 · Post-fractura del pacto.
      Primera instancia verificada de colapso de U_P.
    &lt;/div&gt;
    &lt;span class="nodo-arrow"&gt;→&lt;/span&gt;
  &lt;/a&gt;

  &lt;div class="nodo-note"&gt;
    Código completo disponible en
    &lt;a href="https://github.com/Aptymok/system-friction"&gt;
      github.com/Aptymok/system-friction
    &lt;/a&gt;
    · branch main · seed 42 · reproducible · CC BY 4.0
  &lt;/div&gt;
&lt;/div&gt;

&lt;/div&gt;</pre></div>
</div>