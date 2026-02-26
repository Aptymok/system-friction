---
layout: default
title: "MIHM v2.0 — Motor Cuantitativo"
description: "Multinodal Homeostatic Integration Model. IHG, NTI, Monte Carlo."
permalink: /mihm/
math: true
---

<div class="wrap">

<div class="doc-hdr">
  <div class="doc-hdr__kicker">MIHM v2.0 · Multinodal Homeostatic Integration Model</div>
  <h1>Motor Cuantitativo</h1>
  <div class="doc-hdr__meta">
    <span>v1.1</span>
    <span>validated</span>
    <span class="mono c-cr">IHG −0.620</span>
    <span class="mono c-cr">NTI 0.351</span>
    <span class="badge badge--emergency">EMERGENCY_DECISION</span>
  </div>
</div>

## Fórmulas base

$$f = \frac{t}{T} + O$$

$$\text{IHG} = \frac{1}{N}\sum_{i=1}^{N}(C_i - E_i)(1 - L_i^{\text{eff}})$$

$$L_i^{\text{eff}} = \min\!\left(L_i \cdot (1 + (1 - M_i)),\; 1\right)$$

$$\text{NTI} = \frac{1}{5}\left[(1-\text{LDI}_n) + \text{ICC}_n + \text{CSR} + \text{IRCI}_n + \text{IIM}\right]$$

---

## Estado del sistema

<div id="sf-headline" data-sf="true"><span class="sf-loading">—</span></div>

---

## NTI — Nodo de Trazabilidad Institucional

<div id="sf-nti" data-sf="true"><span class="sf-loading">—</span></div>

---

## Tabla de nodos

<div id="sf-nodes" data-sf="true"><span class="sf-loading">—</span></div>

---

## Escenarios

<div id="sf-scenarios" data-sf="true"><span class="sf-loading">—</span></div>

---

## Catálogo de variables

| Símbolo | Nombre | Dominio | Umbral crítico |
|---------|--------|---------|----------------|
| $C_i$ | Capacidad adaptativa | $[0,1]$ | $< 0.30$ → FRACTURE |
| $E_i$ | Carga entrópica | $[0,1]$ | $> 0.80$ → CRITICAL |
| $L_i$ | Latencia operativa | $[0,1]$ | $> 0.85$ → DEGRADED |
| $K_i$ | Conectividad funcional | $[0,1]$ | — |
| $R_i$ | Redistribución | $[0,1]$ | — |
| $M_i$ | Coherencia institucional | $[0,1]$ | $< 0.50$ → OPAQUE |
| $O$ | Opacidad sistémica | $[0,1]$ | $O \to 1$ → divergencia |
| $f$ | Fricción nodo | $[0,\infty)$ | $> 1.0$ → fuera de umbral |
| IHG | Índice gobernanza homeostática | $(-\infty, 1)$ | $< -0.50$ → EMERGENCY |
| NTI | Nodo trazabilidad institucional | $[0,1]$ | $< 0.40$ → BLIND MODE |

---

## Descargas

<div class="dl-list">
  <a class="dl-item" href="/assets/data/ags_metrics.json">
    <span class="dl-item__type">JSON</span>
    <span>ags_metrics.json</span>
    <span class="dl-item__meta">métricas completas</span>
  </a>
  <a class="dl-item" href="/assets/data/patterns.json">
    <span class="dl-item__type">JSON</span>
    <span>patterns.json</span>
    <span class="dl-item__meta">patrones → MIHM</span>
  </a>
  <a class="dl-item" href="/scripts/mihm_v2.py">
    <span class="dl-item__type">PY</span>
    <span>mihm_v2.py</span>
    <span class="dl-item__meta">motor Python</span>
  </a>
  <a class="dl-item" href="/assets/MIHM_v2_manuscrito_completo.pdf">
    <span class="dl-item__type">PDF</span>
    <span>Manuscrito completo</span>
    <span class="dl-item__meta">MIHM v2.0 · CC BY 4.0</span>
  </a>
</div>

<div class="doc-nav-foot">
  <a href="/">← inicio</a>
  <a href="/nodo-ags/">Nodo AGS</a>
  <a href="/#lab">Lab</a>
  <a href="/#audit">Audit</a>
</div>

</div>
