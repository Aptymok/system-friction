---
layout: doc
title: "AGS-06 · Síntesis del Sistema — Cierre del Ciclo Empírico"
description: "Cierre del ciclo empírico. IHG -0.620. NTI 0.351."
doc_id: "ags-06"
series: "ags-06 · Nodo Aguascalientes"
version: "1.1"
status: validated
origin: vhpd
node: SYSTEM
date: 2026-02-23
ihg_contribution: -0.62
friction_index: 2.47
type: "métrica"
---

# AGS-06: Síntesis del Sistema — Cierre del Ciclo Empírico

**Referencia:** `/_core/postulado-central.md` — Fórmula $f = (t/T) + O$

## Estado del sistema post-fractura (23 feb 2026, 23:59h)

### Fórmulas base

$$\text{IHG} = \frac{1}{6}\sum_{i=1}^{6}(C_i - E_i)(1 - L_i^{\text{eff}}) = -0.620$$

$$\text{NTI} = \frac{1}{5}[(1 - \text{LDI}_n) + \text{ICC}_n + \text{CSR} + \text{IRCI}_n + \text{IIM}] = 0.351$$

$$\text{IHG} \times \text{NTI} = -0.218 \quad \text{(IHG corregido por trazabilidad)}$$

### Estado por nodo

| Nodo | $C_i$ | $E_i$ | $L_i$ | $K_i$ | $R_i$ | $M_i$ | Fricción | Estado |
|------|-------|-------|-------|-------|-------|-------|----------|--------|
| N1 — Agua | 0.18 | 0.89 | 0.92 | 0.85 | 0.12 | 1.00 | 1.81 | FRACTURE |
| N2 — Capital | 0.68 | 0.78 | 0.72 | 0.55 | 0.15 | 1.00 | 1.50 | DEGRADED |
| N3 — Logística | 0.85 | 0.35 | 0.35 | 0.40 | 0.60 | 1.00 | 0.70 | OK |
| N4 — Seguridad | 0.35 | 0.96 | 0.88 | 0.55 | 0.10 | 1.00 | 1.84 | CRITICAL |
| N5 — Coordinación | 0.60 | 0.68 | 0.78 | 0.65 | 0.40 | 0.50 | 2.10 | OPAQUE |
| N6 — Exógeno | 0.40 | 0.95 | 0.85 | 0.75 | 0.20 | 0.70 | 2.31 | CRITICAL |

## Gates de validación H1–H3

| Gate | Condición | Estado | Evidencia |
|------|-----------|--------|-----------|
| H1 — Coherencia | Datos AGS consistentes con realidad (<15% desviación) | PASS | Desviación < 15% en todos los nodos |
| H2 — Trazabilidad | Rastreable federal → local | PASS | Cadena actor → evento → métrica completa (AGS-01 a AGS-05) |
| H3 — Homeostasis | IHG > -0.50 @ 180d | PARTIAL | N3 recuperado; N1/N4/N5/N6 pendientes a 180 días |

## Análisis predictivo

### Predictor más fuerte de colapso

Monte Carlo (50,000 iteraciones, seed 42, λ=0.1): la **opacidad institucional** ($O > 0.6$) es el predictor más fuerte. Correlación con P(colapso @180d): **r = 0.78**.

### Intervenciones rankeadas por impacto

| Intervención | ΔIHG esperado | Factibilidad |
|--------------|---------------|--------------|
| Telemetría N6 (monitoreo exógeno) | +0.12 | ALTA |
| Protocolo anti-ICC (distribuir conocimiento) | +0.08 | ALTA |
| Fondo hídrico federal N1 | +0.06 | MEDIA |
| Restauración de trazabilidad M5 | +0.05 | MEDIA |

## Nota metodológica

Este documento es el punto de cierre empírico del ciclo AGS. Todo patrón en `core-01` a `core-10` tiene instancia verificable en los documentos AGS-01 a AGS-05. La brecha entre lo documentado y la realidad observable es:

$$\text{IIM} = 0.50 \quad \text{(12 de 18 eventos verificados con clasificación consistente)}$$

El ciclo empírico está cerrado. Las variables proyectadas tienen intervalos de confianza documentados en el Apéndice Monte Carlo. Ningún hallazgo queda sin referencia al Postulado Central.

**Siguiente ciclo:** AGS-07 activable si IHG no supera $-0.50$ a los 30 días post-fractura.

---

[← Volver al índice del nodo](/nodo-ags/) · [Versión narrativa →](/nodo-ags/ags-06-narrativa/)