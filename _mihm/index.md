---
layout: doc
title: "MIHM v2.0 — Motor Cuantitativo"
description: "Multinodal Homeostatic Integration Model. Fórmulas, variables, umbrales."
permalink: /mihm/
math: true
---

<div class="doc-hdr">
  <div class="doc-hdr__kicker">MIHM v2.0 · Multinodal Homeostatic Integration Model</div>
  <h1>Motor Cuantitativo</h1>
  <div class="doc-hdr__meta">
    <span>v2.0</span>
    <span>validated</span>
    <span class="mono">seed 42 · Monte Carlo 50k</span>
  </div>
</div>

## Fórmulas base

$$f = \frac{t}{T} + O$$

$$\text{IHG} = \frac{1}{N}\sum_{i=1}^{N}(C_i - E_i)(1 - L_i^{\text{eff}})$$

$$L_i^{\text{eff}} = \min\!\left(L_i \cdot (1 + (1 - M_i)),\; 1\right)$$

$$\text{NTI} = \frac{1}{5}\left[(1-\text{LDI}_n) + \text{ICC}_n + \text{CSR} + \text{IRCI}_n + \text{IIM}\right]$$

---

## Variables del sistema

| Símbolo | Nombre | Dominio | Umbral crítico | Proxy observable |
|---------|--------|---------|----------------|-------------------|
| $C_i$ | Capacidad adaptativa | $[0,1]$ | $< 0.30$ → FRACTURE | Recursos disponibles / demanda |
| $E_i$ | Carga entrópica | $[0,1]$ | $> 0.80$ → CRITICAL | 1 − (eficiencia × capacidad) |
| $L_i$ | Latencia operativa | $[0,1]$ | $> 0.85$ → DEGRADED | t_respuesta / t_normativo |
| $K_i$ | Conectividad funcional | $[0,1]$ | — | Nodos conectados / total |
| $R_i$ | Redistribución | $[0,1]$ | — | Capacidad de reasignación |
| $M_i$ | Coherencia institucional | $[0,1]$ | $< 0.50$ → OPAQUE | 1 − |declarado−observable|/declarado |
| $O$ | Opacidad sistémica | $[0,1]$ | $O \to 1$ divergencia | Puntos ciegos / total procesos |
| $f$ | Fricción nodo | $[0,\infty)$ | $> 1.0$ fuera umbral | (t/T) + O |

---

## Componentes del NTI en detalle

| Componente | Fórmula | Descripción |
|------------|---------|-------------|
| **LDI_norm** | min(t_real / t_referencia, 1.0) | Latencia de decisión institucional |
| **ICC_norm** | 1 − Σ_j f_j² | Desconcentración de conocimiento |
| **CSR** | acciones_ejecutadas / señales_detectadas | Cobertura de señales de riesgo |
| **IRCI_norm** | función_base / función_tras_pérdida | Resiliencia de capital institucional |
| **IIM** | 1 − |reportado−verificado|/reportado | Integridad de información medida |

---

## Aplicación en nodos activos

El estado actual del sistema (IHG, NTI, proyecciones) se encuentra en el **[Dashboard principal →](/)**

Para ver la aplicación empírica completa del MIHM en un caso geográfico:
- **[Nodo Aguascalientes](/nodo-ags/)** · Validación post-fractura 2026

Para el catálogo de patrones mapeados a variables MIHM:
- **[core-patrones.md](/docs/core-patrones/)** · En preparación

---

## Descargas

<div class="dl-list">
  <a class="dl-item" href="/assets/data/ags_metrics.json">
    <span class="dl-item__type">JSON</span>
    <span>ags_metrics.json</span>
    <span class="dl-item__meta">métricas completas nodo AGS</span>
  </a>
  <a class="dl-item" href="/assets/data/patterns.json">
    <span class="dl-item__type">JSON</span>
    <span>patterns.json</span>
    <span class="dl-item__meta">patrones ↔ MIHM</span>
  </a>
  <a class="dl-item" href="/scripts/mihm_v2.py">
    <span class="dl-item__type">PY</span>
    <span>mihm_v2.py</span>
    <span class="dl-item__meta">motor Python · seed 42</span>
  </a>
  <a class="dl-item" href="/assets/MIHM_v2_manuscrito_completo.pdf">
    <span class="dl-item__type">PDF</span>
    <span>Manuscrito completo</span>
    <span class="dl-item__meta">MIHM v2.0 · CC BY 4.0</span>
  </a>
</div>

---

## Navegación del ecosistema

<div class="doc-nav-foot">
  <a href="/">← Dashboard (estado actual)</a>
  <a href="/docs/">Archivo de patrones</a>
  <a href="/nodo-ags/">Nodo AGS</a>
  <a href="/estado/">Estado del sistema</a>
</div>