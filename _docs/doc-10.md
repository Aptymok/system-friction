---
layout: doc
title: "Incentivos bien diseñados que fallan"
description: "Ley de Goodhart. Optimización de proxy."
id: doc-10
version: "1.1"
status: validated
math: true
mihm_variables: ['C_i', 'E_i', 'O']
prev_doc: doc-09
next_doc: /nodo-ags/
---

Ley de Goodhart. Optimización de proxy.

---

Cuando una métrica se convierte en objetivo, deja de ser una métrica útil.

---

El sistema optimiza la métrica, no el fenómeno que la métrica medía. La métrica reporta éxito. El fenómeno se degrada.

## Ley de Goodhart

$$\text{Si } M \text{ es proxy de } P \text{ y se convierte en objetivo:} \quad M \uparrow, P \downarrow$$

## Variables afectadas

$C_i$ (capacidad adaptativa): se redistribuye hacia optimizar la métrica. $E_i$ (carga entrópica): aumenta porque el sistema real genera más trabajo que el sistema métrico reporta. $O$ (opacidad): aumenta porque la distancia entre métrica y realidad genera capas de justificación.

## Observado en AGS

N4 (seguridad): meta de reducción de incidentes → reclasificación de incidentes como "eventos no reportables". CSR = 0.00 pero IIM = 0.50 (12 de 18 eventos verificados con clasificación inconsistente con campo).

## Conexión con MIHM

Este patrón es el predictor más fuerte de colapso en la simulación Monte Carlo. Los sistemas con $O > 0.6$ y $E_i > 0.8$ simultáneos tienen probabilidad de fractura $> 0.7$ a 180 días.
