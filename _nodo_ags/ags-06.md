---
layout: node
title: "AGS-06 — Síntesis del Sistema"
description: "Cierre del ciclo empírico. IHG -0.620. NTI 0.351."
id: ags-06
version: "1.1"
status: validated
origin: vhpd
math: true
friction_index: 2.31
node_status: CRITICAL
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
