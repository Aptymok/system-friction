---
title: "AGS-05 — Trazabilidad Federal–Local y Latencia de Decisión"
version: "1.1"
status: validated
origin: vhpd
node: N5
date: 2026-02-23
ihg_contribution: -0.156
friction_index: 2.1
---

# AGS-05: Cadena de Mando — Trazabilidad (N5)

**Referencia:** `/_core/postulado-central.md` — Fórmula $f = (t/T) + O$

## Hipótesis Formalizada

La latencia de decisión institucional (LDI) entre el nivel federal y el nodo local supera el umbral normativo en condiciones de shock exógeno.

$$f_{N5} = \frac{t_{\text{respuesta}}}{T_{\text{normativo}}} + O_{\text{opacidad}} = \frac{6h}{1h} + 0.68 = 6.68$$

## Vector N5

| Parámetro | Valor | Estado |
|-----------|-------|--------|
| $C_5$ | 0.60 | MODERATE |
| $E_5$ | 0.68 | ELEVATED |
| $L_5$ | 0.78 | DEGRADED |
| $M_5$ | 0.50 | OPAQUE |

**LDI$_n$ = 1.00** — Máximo observado (peor escenario).

## Predicciones Validadas

| Predicción | Estado |
|------------|--------|
| Tiempo de respuesta federal > 4h | VALIDADA: 6h |
| Comunicación oficial fragmentada | VALIDADA |
| Opacidad $O > 0.60$ | VALIDADA: 0.68 |

**Gate H1:** PASS | **Gate H2:** PASS | **Gate H3:** PENDING

