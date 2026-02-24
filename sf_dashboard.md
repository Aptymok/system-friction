---
layout: audit
title: "System Friction Framework v1.1"
version: "1.1"
status: validated
origin: vhpd
date: 2026-02-23
---

# Índice de Gobernanza Homeostática — Nodo Aguascalientes

Estado del sistema: **23 de febrero de 2026, 23:59h**. Shock exógeno: muerte de El Mencho + 252 narcobloqueos en 20 estados.

---

## Estado del Sistema

<div id="dashboard-system" class="sf-loading">Cargando métricas...</div>

---

## Vector de Nodos

<div id="dashboard-nodes" class="sf-loading">Cargando nodos...</div>

---

## Escenarios Post-Fractura (Monte Carlo, seed=42)

<div id="dashboard-scenarios" class="sf-loading">Cargando escenarios...</div>

---

## Intervenciones Prioritarias

<div id="dashboard-interventions" class="sf-loading">Cargando intervenciones...</div>

---

## Acceso Directo al Manuscrito

<div class="sf-downloads">
  <h3>Archivos del Proyecto</h3>
  <a href="assets/data/MIHM_v2_manuscrito_completo.pdf" class="sf-download-link" download>
    <span class="sf-download-link__icon">[PDF]</span>
    <span class="sf-download-link__name">MIHM v2.0 — Manuscrito Completo</span>
    <span class="sf-download-link__meta">APTYMOK // INEGI 2026</span>
  </a>
  <a href="scripts/mihm_v2.py" class="sf-download-link" download>
    <span class="sf-download-link__icon">[PY]</span>
    <span class="sf-download-link__name">mihm_v2.py — Código Python completo</span>
    <span class="sf-download-link__meta">Motor NODEX + Monte Carlo exocáustico</span>
  </a>
  <a href="assets/data/ags_metrics.json" class="sf-download-link" download>
    <span class="sf-download-link__icon">[JSON]</span>
    <span class="sf-download-link__name">ags_metrics.json — Métricas Post-Fractura</span>
    <span class="sf-download-link__meta">Proxies calibrados 23 feb 2026</span>
  </a>
</div>

---

## Arquitectura del Repositorio

| Capa | Directorio | Función | Gate |
|------|-----------|---------|------|
| Axiomática | `/_core/` | Postulado Central, fórmulas | AXIOM |
| Empírica | `/_nodes/ags/` | Evidencia AGS-01 a AGS-06 | H1+H2 |
| Operativa | `/_mihm/` | Dashboard, Catálogo, NTI | H3 |
| Meta | `/_meta/` | manifest.json, ags_metrics.json | VHpD |
| Diseño | `/assets/` | CSS clínico + JS dashboard | UI |
| Automatización | `/scripts/` | mihm_v2.py, validator.py | AUTO |

---

## Postulado Central

$$f = \frac{t}{T} + O$$

Todo diagnóstico en este repositorio deriva de esta fórmula. Ver [`/_core/postulado-central.md`](_core/postulado-central).
