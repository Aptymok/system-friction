---
layout: doc
title: "Contexto perdido"
description: "Decaimiento del razonamiento por pérdida de restricciones."
id: doc-07
version: "1.1"
status: validated
math: true
mihm_variables: ['L_i', 'K_i']
prev_doc: doc-06
next_doc: doc-08
---

Decaimiento del razonamiento por pérdida de restricciones.

---

Las decisiones tomadas sin el contexto original que las produjo generan consecuencias no previstas.

---

Un protocolo diseñado para un contexto específico se aplica en contextos diferentes porque el contexto original no está documentado o no es accesible a quien implementa.

## Mecanismo

$$L_i \uparrow \quad\text{cuando}\quad K_i \downarrow$$

La latencia operativa aumenta cuando la conectividad cae porque los nodos no pueden verificar el estado actual de los demás antes de decidir.

## Observado en AGS

N5 (coordinación): el protocolo de Mesa de Coordinación requiere información de N4 en tiempo real. La caída de $K_{N5} = 0.65$ y el retiro de la Secretaría de Seguridad de la Mesa generaron decisiones con información de 18h de antigüedad durante el evento.

$L_{N5} = 0.78$ → latencia efectiva $L^{\text{eff}}_{N5} = \min(0.78 \times (1 + (1-0.50)), 1) = 1.00$
