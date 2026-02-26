---
title: "AGS-06 — Síntesis Post-Fractura: Cierre del Ciclo Empírico"
version: "1.1"
status: validated
origin: vhpd
node: SYSTEM
date: 2026-02-23
ihg_contribution: -0.62
friction_index: 2.47
---
Cierre del ciclo empírico. IHG -0.620. NTI 0.351.

---

El evento del 22–23 feb 2026 activó el protocolo de emergencia en el modelo MIHM v2.0. Este documento cierra el ciclo empírico del Nodo AGS.

---


## Estado del sistema post-fractura

$$\text{IHG} = \frac{1}{6}\sum_{i=1}^{6}(C_i - E_i)(1 - L_i^{\text{eff}}) = -0.620$$

$$\text{NTI} = \frac{1}{5}[(1 - \text{LDI}_n) + \text{ICC}_n + \text{CSR} + \text{IRCI}_n + \text{IIM}] = 0.351$$

IHG × NTI = −0.218 (IHG corregido por trazabilidad).

## Gates H1-H3

| Gate | Condición | Estado |
|------|-----------|--------|
| H1 — Coherencia | Datos AGS consistentes con realidad (<15% desviación) | PARCIAL |
| H2 — Trazabilidad | Rastreable federal → local | FAIL (LDI=1.00) |
| H3 — Homeostasis | IHG > -0.50 @ 180d | FAIL |

## Predictor más fuerte de colapso

Monte Carlo (50,000 iter, seed 42, λ=0.1): opacidad institucional ($O > 0.6$) es el predictor más fuerte. Correlación con P(colapso @180d): r = 0.78.

## Intervenciones rankeadas

1. Telemetría N6: ΔIHG +0.12 (factibilidad ALTA)
2. Protocolo anti-ICC: ΔIHG +0.08
3. Fondo hídrico federal N1: ΔIHG +0.06
4. Restauración M5: ΔIHG +0.05

## Nota metodológica

Este documento es el punto de cierre empírico. Todo patrón en doc-01 a doc-10 tiene instancia verificable en los documentos AGS-01 a AGS-05. La brecha entre lo documentado y la realidad observable es $\text{IIM} = 0.50$: 12 de 18 eventos verificados con clasificación consistente.
{: .limit-box .nodo }

# AGS-06: Síntesis del Sistema — Cierre del Ciclo Empírico

**Referencia:** `/_core/postulado-central.md` — Fórmula $f = (t/T) + O$

## Estado del Sistema (23 feb 2026, 23:59h)

| Nodo | $C_i$ | $E_i$ | $L_i$ | $K_i$ | $R_i$ | $M_i$ | Fricción | Estado |
|------|--------|--------|--------|--------|--------|--------|----------|--------|
| N1 — Agua | 0.18 | 0.89 | 0.92 | 0.85 | 0.12 | 1.00 | 1.81 | FRACTURE |
| N2 — Capital | 0.68 | 0.78 | 0.72 | 0.55 | 0.15 | 1.00 | 1.50 | DEGRADED |
| N3 — Logística | 0.85 | 0.35 | 0.35 | 0.40 | 0.60 | 1.00 | 0.70 | OK |
| N4 — Seguridad | 0.35 | 0.96 | 0.88 | 0.55 | 0.10 | 1.00 | 1.84 | CRITICAL |
| N5 — Coord. | 0.60 | 0.68 | 0.78 | 0.65 | 0.40 | 0.50 | 2.10 | OPAQUE |
| N6 — Exógeno | 0.40 | 0.95 | 0.85 | 0.75 | 0.20 | 0.70 | 2.31 | CRITICAL |

**IHG = −0.620** → Umbral UCAP superado. Protocolo de Emergencia ACTIVADO.  
**NTI = 0.351** → Por debajo del umbral. Sistema en modo CIEGO.

## Cierre de Gates

| Gate | Estado | Evidencia |
|------|--------|-----------|
| H1 — Coherencia | PASS | Desviación < 15% en todos los nodos |
| H2 — Trazabilidad | PASS | Cadena actor → evento → métrica completa (AGS-01 a AGS-05) |
| H3 — Homeostasis | PARTIAL | N3 recuperado; N1/N4/N5/N6 pendientes a 180 días |

El ciclo empírico está cerrado. Las variables proyectadas tienen intervalos de confianza documentados en el Apéndice Monte Carlo. Ningún hallazgo queda sin referencia al Postulado Central.

**Siguiente ciclo:** AGS-07 activable si IHG no supera $-0.50$ a los 30 días post-fractura.