---
layout: audit
title: "MIHM Hub — Dashboard Integrado"
version: "1.1"
status: validated
origin: vhpd
date: 2026-02-23
---

# MIHM Hub — Dashboard de Gobernanza Homeostática

El dashboard consume exclusivamente `assets/data/ags_metrics.json` generado por `scripts/mihm_v2.py`. Ningún dato es estático.

---

## Estado del Sistema

<div class="sf-alert sf-alert--emergency">
  <strong>PROTOCOLO DE EMERGENCIA ACTIVO</strong> — IHG = −0.620. NTI = 0.351. Umbral UCAP superado en ambas métricas maestras. (23 feb 2026)
</div>

<div id="dashboard-system" class="sf-loading">Cargando métricas del sistema...</div>

---

## Vector de Estado por Nodo

<div id="dashboard-nodes" class="sf-loading">Cargando tabla de nodos...</div>

---

## Componentes NTI

$$\text{NTI} = \frac{1}{5}\left[(1 - \text{LDI}_n) + \text{ICC}_n + \text{CSR} + \text{IRCI}_n + \text{IIM}\right] = 0.351$$

<div id="dashboard-nti" class="sf-loading">Cargando componentes NTI...</div>

---

## Escenarios Monte Carlo (50,000 iteraciones, seed=42)

Simulación exocáustica. Proceso de Poisson ($\lambda = 0.1$) para oleadas de violencia.

<div id="dashboard-scenarios" class="sf-loading">Cargando escenarios...</div>

---

## Intervenciones Rankeadas por Impacto en IHG

<div id="dashboard-interventions" class="sf-loading">Cargando intervenciones...</div>

---

## Descarga de Recursos

<div class="sf-downloads">
  <h3>Documentos y Código</h3>
  <a href="/assets/data/MIHM_v2_manuscrito_completo.pdf" class="sf-download-link" download>
    <span class="sf-download-link__icon">[PDF]</span>
    <span class="sf-download-link__name">MIHM v2.0 — Manuscrito Completo</span>
    <span class="sf-download-link__meta">23 feb 2026 // LaTeX</span>
  </a>
  <a href="/scripts/mihm_v2.py" class="sf-download-link" download>
    <span class="sf-download-link__icon">[PY]</span>
    <span class="sf-download-link__name">mihm_v2.py — Motor NODEX + Monte Carlo</span>
    <span class="sf-download-link__meta">Python 3.10+ // numpy</span>
  </a>
  <a href="/assets/data/ags_metrics.json" class="sf-download-link" download>
    <span class="sf-download-link__icon">[JSON]</span>
    <span class="sf-download-link__name">ags_metrics.json — Métricas Post-Fractura</span>
    <span class="sf-download-link__meta">Schema: ags-metrics-v1.1</span>
  </a>
  <a href="/scripts/validator.py" class="sf-download-link" download>
    <span class="sf-download-link__icon">[PY]</span>
    <span class="sf-download-link__name">validator.py — Validador VHpD</span>
    <span class="sf-download-link__meta">Vigilancia Humana por Diseño</span>
  </a>
</div>

---

[Catálogo →](/mihm/catalogo/) · [Dashboard →](/mihm/) · [Hub Nodo AGS →](/mihm/hub/) · [NTI →](/mihm/nti/) · [Patrones →](/mihm/patrones/)