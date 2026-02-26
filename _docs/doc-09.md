---
layout: doc
title: "Deuda de decisión"
description: "Costo acumulado de posponer claridad."
id: doc-09
version: "1.1"
status: validated
math: true
mihm_variables: ['L_i', 'E_i']
prev_doc: doc-08
next_doc: doc-10
---

Costo acumulado de posponer claridad.

---

Cada decisión postpuesta acumula un costo que eventualmente es cobrado por el sistema.

---

La deuda de decisión no aparece en los estados financieros ni en los reportes de gestión. Aparece cuando el sistema enfrenta un shock y no tiene capacidad de respuesta porque gastó esa capacidad en mantener el estado inestable anterior.

## Mecanismo

$$L_i \uparrow + E_i \uparrow \quad\Rightarrow\quad f \uparrow\uparrow$$

La latencia y la carga entrópica se amplifican mutuamente. Un sistema con alta deuda de decisión no puede procesar la información del shock porque ya está procesando la deuda anterior.

## Observado en AGS

N1 (agua): $C_{N1} = 0.18$, $L_{N1} = 0.92$. El acuífero Calera lleva 3 ciclos anuales de sobreexplotación sin resolución formal. Cada año se pospone la declaración de emergencia hídrica. Al momento del shock, el nodo no tenía capacidad de redistribución ($R_{N1} = 0.12$). $f_{N1} = 1.81$ (FRACTURE).

## Conexión

Véase doc-10 (Ley de Goodhart) para el mecanismo que produce la deuda.
