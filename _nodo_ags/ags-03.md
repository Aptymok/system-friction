---
layout: node
title: "AGS-03 — Infraestructura Hídrica"
description: "Acuífero Calera. Sobreexplotación estructural."
id: ags-03
version: "1.1"
status: validated
origin: vhpd
math: true
friction_index: 1.81
node_status: FRACTURE
---

Acuífero Calera. Sobreexplotación estructural.

---

El acuífero Calera opera al 148% de su capacidad de recarga sostenible. Tres ciclos anuales consecutivos de sobreexplotación sin declaración formal de emergencia.

---

## Vector N1

$C_{N1} = 0.18$, $E_{N1} = 0.89$, $L_{N1} = 0.92$, $R_{N1} = 0.12$, $f = 1.81$ (FRACTURE)

## Mecanismo doc-09

Deuda de decisión acumulada: 3 años de postergación de declaración de emergencia hídrica. Cada año: el costo político de declarar > costo percibido de no declarar.

$$L^{\text{eff}}_{N1} = \min(0.92 \times (1 + (1 - 1.00)), 1) = 0.92$$

## Estado estructural

$R_{N1} = 0.12$: el nodo no tiene capacidad de redistribución. Si el evento de 22 feb 2026 hubiera incluido un corte de suministro, el nodo no habría tenido margen de contingencia.
