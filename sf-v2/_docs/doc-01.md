---
layout: doc
title: "Decisiones que nadie tomó"
description: "Cristalización por acumulación. Zonas grises operativas."
id: doc-01
version: "1.1"
status: validated
math: true
mihm_variables: ['O', 'L_i']
prev_doc: core-bridge
next_doc: doc-02
---

Cristalización por acumulación. Zonas grises operativas.

---

Zonas de decisión sin propietario claro acumulan estados no auditados.

---

El proceso funciona: cada actor transfiere el caso al siguiente nodo. Nadie viola el protocolo. Al final, el estado del caso no refleja decisión alguna, solo la suma de transferencias.

## Mecanismo

La acumulación ocurre porque el costo de decidir supera el costo de transferir. Cuando ese umbral es sistémico, la zona gris se vuelve el estado operativo normal.

$$O \uparrow \quad\Rightarrow\quad f = \frac{t}{T} + O \uparrow$$

## Observado en AGS

Nodos N5 (coordinación) y N4 (seguridad): decisiones de activación de protocolo pendientes 6h sin propietario institucional identificado. $L_{N5} = 0.78$, $O_{N5} = 0.68$, $f_{N5} = 2.10$.

## Patrones relacionados

Véase doc-07 (contexto perdido) para el mecanismo de decaimiento posterior a la zona gris.
