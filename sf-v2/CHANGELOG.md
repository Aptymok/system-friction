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
