---
title: "Trazabilidad (Changelog)"
permalink: /changelog/
---

<main>
  <div class="doc-container">
    
    <h1>Registro de Trazabilidad</h1>

    <p>El ecosistema de <em>System Friction</em> crece por acumulación, no por corrección de consistencia. Este documento registra la evolución estructural y epistemológica del marco.</p>

    <div class="rule"></div>

    <div class="doc-label">Estado Actual</div>
    <h2>v1.1 — 2026-02-23</h2>
    
    <div class="limit-box">
      <strong>Hito de Validación:</strong> Ruptura del equilibrio implícito en el Nodo Aguascalientes (22/02/2026). El sistema transita de la proyección teórica a la observación de entropía revelada.
    </div>

    <ul>
      <li><strong>Transición Ontológica:</strong> Oficialización del modelo de "expansión acumulativa". Abandono definitivo de la denominación "conjunto cerrado".</li>
      <li><strong>Integración del Marco MIHM:</strong> Incorporación de la Capa 0 de auditoría NTI y los umbrales de irreversibilidad geomecánica (IRCI).</li>
      <li><strong>Despliegue de Meta-Infraestructura:</strong> Creación de los nodos <code>/about/</code> y <code>/licencia/</code> bajo contenedores estandarizados de 640px.</li>
      <li><strong>Estandarización Visual:</strong> Implementación de la clase <code>.limit-box</code> vía Kramdown para advertencias institucionales en todos los archivos <code>.md</code>.</li>
      <li><strong>Neutralización Estética:</strong> Eliminación de alertas rojas en la serie aplicada para restaurar la neutralidad clínica del observador.</li>
      <li><strong>Cierre del Nodo AGS:</strong> Adición del documento <code>ags-06</code> como registro post-acto del colapso del pacto no escrito.</li>
    </ul>

    <div class="rule"></div>

    <h2>Jekyll Migration — 2026-02</h2>
    <p>Transición de arquitectura estática a dinámica para permitir la modularización de componentes.</p>
    <ul>
      <li>Implementación de Front Matter tipado.</li>
      <li>Estandarización de Permalinks (eliminación de extensión .html).</li>
      <li>Creación de <code>_includes/doc-meta.html</code> para la gestión de versiones por documento.</li>
      <li>Generación automatizada de <code>docs.json</code> para auditoría de archivos.</li>
    </ul>

    <div class="rule"></div>

    <h2>v1.0 — 2026-02-02</h2>
    <p>Publicación inicial del ecosistema fundacional.</p>
    <ul>
      <li>10 documentos de serie principal (Axiomas estructurales).</li>
      <li>3 documentos core (Metodología, Posición y Puente).</li>
      <li>Nodo Aguascalientes: 5 documentos iniciales (Diagnóstico de umbrales).</li>
    </ul>

    <p class="mt-4" style="font-size: 0.85em; color: var(--text-dim);"><em>Nota: Las versiones de los documentos individuales (v1.0) se mantienen en su estado original para preservar la fidelidad histórica de la observación, a menos que su estructura haya sido alterada para la integración en v1.1.</em></p>

  </div>
</main>

# CHANGELOG · System Friction Framework

## v1.1 — 2026-02-25

### Arquitectura

- Reset estructural completo. v1.0 archivado en git history.
- Eliminado: `audit/` (redundante con `_audit/`), `meta/` (movido a `assets/data/`), `about.md`, `licencia.md`, `roadmap.md`, `mihm.md` raíz, `sf_dashboard.md`.
- Creado: `assets/data/` como capa de datos centralizada. `assets/js/dashboard.js` como motor único. `_nodo_ags/` consolidado. `_docs/` con 13 documentos (3 core + 10 patrones).
- Colecciones Jekyll: `docs`, `nodo_ags`, `mihm`.

### Dashboard

- `dashboard.js` implementado: IHG gauge SVG, NTI bars, sparkline histórico, escenarios Monte Carlo, dimensiones C/E/L/K/R/M, tabla de nodos, intervenciones rankeadas.
- Toggle NTI: recalcula IHG sin trazabilidad vs IHG auditado.
- Lab Mode: Monte Carlo client-side con parámetros ajustables (seed, λ, n, Δ).
- Audit tab: cadena de trazabilidad patrón → variable → nodo → ΔIHG.

### Datos

- `ags_metrics.json` v1.1: estructura completa con historial, escenarios, intervenciones.
- `docs.json` v1.1: catálogo de documentos con tipo y friction contribution.
- `patterns.json` v1.1: mapa patrones → variables MIHM.

### Tono y voz

La versión 1.0 contenía redundancias narrativas: repetición de definiciones entre documentos, adjetivos sin función diagnóstica, secciones de "contexto" que retrasaban la señal.

v1.1 elimina toda oración que no sea extraíble sin contexto adicional. El principio operativo: cada párrafo es una unidad funcional independiente.

Este cambio no es estético. Es estructural. El texto que no puede sostenerse solo genera dependencias entre secciones. Las dependencias generan fricción cognitiva. La fricción cognitiva reduce la tasa de extracción de información útil.

La voz permanece impersonal. El sistema observable es el tema. El observador no aparece excepto donde su posición altera lo observado.

---

## v1.0 — 2025-Q4

- Jekyll + GitHub Pages inicial.
- `_docs/`: serie core + doc-01 a doc-10.
- `_nodo_ags/`: AGS-01 a AGS-06.
- `assets/css/style.css`: diseño clínico base.
- `meta/`: JSON parciales sin estructura completa.
- Dashboard: no implementado. Métricas solo en README.
- Deploy: systemfriction.org via CNAME.
