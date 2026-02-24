---
title: "AGS-02 — Capacidad Institucional bajo Presión Exógena"
version: "1.1"
status: validated
origin: vhpd
node: N4
date: 2026-02-23
ihg_contribution: -0.201
friction_index: 1.76
---

# AGS-02: Nodo Seguridad Pública (N4)

**Referencia:** `/_core/postulado-central.md` — Fórmula $f = (t/T) + O$

## Vector N4

| Parámetro | Valor | Umbral | Estado |
|-----------|-------|--------|--------|
| $C_4$ | 0.35 | > 0.50 | DEGRADED |
| $E_4$ | 0.96 | < 0.80 | CRITICAL |
| $L_4$ | 0.88 | < 0.70 | DEGRADED |
| $M_4$ | 1.00 | — | OK |

**Fricción N4:** $f = 0.88 + 0.96 = 1.84$ → CRITICAL

## Hipótesis Formalizada

La concentración de conocimiento operativo en 2 comandantes crea un punto único de fallo. ICC = 0.68 (alta concentración).

## Evidencia Textual (VHpD)

Ausencia del Secretario de Seguridad Pública de la Mesa de Coordinación durante el evento del 22–23 feb 2026. Proxy $M_5 = 0.50$.

**Gate H1:** PASS | **Gate H2:** PASS | **Gate H3:** PENDING (180 días)

