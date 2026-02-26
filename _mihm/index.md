---
layout: mihm
title: MIHM · Motor de validación
description: Estado observado del ecosistema. IHG activo por nodo.
---

{%- comment -%}
  Layout: mihm — usar el CSS del PATCH-07
  Página central de integración entre SF y el motor NODEX
{%- endcomment -%}

<div class="mihm-panel">

<div class="nodo-label">MIHM · Motor de validación activo</div>

<h1>Estado observado del ecosistema.</h1>

<p class="doc-meta">
  Actualización activa · Datos verificables · Monte Carlo seed 42
  · v2.0 · {{ site.time | date: "%d %b %Y" }}
</p>

El MIHM no describe fricción. La cuantifica en tiempo real sobre nodos
observables. Este panel es el estado actual del ecosistema System
Friction y sus nodos activos.

---

## Estado actual del ecosistema

<div class="mihm-nodos-grid">

  <div class="mihm-nodo-card">
    <div class="mihm-nodo-id">Nodo AGS · Aguascalientes</div>
    <div class="mihm-ihg-value critical">IHG −0.62</div>
    <div class="mihm-nti-value">NTI 0.351 · UCAP activo</div>
    <div class="mihm-nodo-status">
      Post-fractura pacto no escrito · 22 feb 2026 ·
      Desregulación sistémica crítica
    </div>
    <a href="/nodo-ags/" class="mihm-nodo-link">Ver nodo →</a>
  </div>

  <div class="mihm-nodo-card inactive">
    <div class="mihm-nodo-id">Próximo nodo</div>
    <div class="mihm-ihg-value pending">—</div>
    <div class="mihm-nodo-status">En definición · sin datos calibrados</div>
  </div>

</div>

---

## Documentación del motor

<div class="nodo-grid">
  <div class="nodo-section-divider">
    Metodología <span>v2.0</span>
  </div>

  <a href="/docs/core-patrones/" class="nodo-doc">
    <div class="nodo-doc-title">Catálogo de patrones</div>
    <div class="nodo-doc-sub">
      Mapeo SF ↔ MIHM · Variables, ecuaciones, condiciones de refutación.
    </div>
    <span class="nodo-arrow">→</span>
  </a>

  <a href="/docs/core-nti/" class="nodo-doc">
    <div class="nodo-doc-title">NTI · Auto-auditoría del ecosistema</div>
    <div class="nodo-doc-sub">
      LDI · ICC · CSR · IRCI · IIM · El sistema observándose a sí mismo.
    </div>
    <span class="nodo-arrow">→</span>
  </a>

  <a href="/docs/bridge-codigo/" class="nodo-doc">
    <div class="nodo-doc-title">NODEX · Implementación Python</div>
    <div class="nodo-doc-sub">
      Cómo el código es implementación directa del marco.
      CC BY 4.0 · reproducible · seed 42.
    </div>
    <span class="nodo-arrow">→</span>
  </a>

  <div class="nodo-section-divider">
    Validaciones activas <span>en producción</span>
  </div>

  <a href="/nodo-ags/ags-06/" class="nodo-doc">
    <div class="nodo-doc-title">AGS-06 · Después del acuerdo</div>
    <div class="nodo-doc-sub">
      Validación empírica 22-23 feb 2026 · Post-fractura del pacto.
      Primera instancia verificada de colapso de U_P.
    </div>
    <span class="nodo-arrow">→</span>
  </a>

  <div class="nodo-note">
    Código completo disponible en
    <a href="https://github.com/Aptymok/system-friction">
      github.com/Aptymok/system-friction
    </a>
    · branch main · seed 42 · reproducible · CC BY 4.0
  </div>
</div>

</div>

[Catálogo →](/mihm/catalogo/) · [Dashboard →](/mihm/) · [Hub Nodo AGS →](/mihm/hub/) · [NTI →](/mihm/nti/) · [Patrones →](/mihm/patrones/)