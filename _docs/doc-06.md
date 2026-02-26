---
layout: doc
title: "Sistemas de alerta que nadie revisa"
description: "Métrica vs señal. Cobertura vs acción."
id: doc-06
version: "1.1"
status: validated
math: true
mihm_variables: ['E_i', 'M_i']
prev_doc: doc-05
next_doc: doc-07
---

Métrica vs señal. Cobertura vs acción.

---

El sistema puede tener cobertura total de alertas y cero capacidad de respuesta.

---

La alerta que no activa respuesta es ruido. El sistema que genera ruido suficiente desensibiliza a los operadores. Después de suficiente tiempo, la alerta real es indistinguible.

## Mecanismo

$$E_i \uparrow \quad\text{cuando la tasa de alertas} \gg \text{tasa de respuesta}$$

La carga entrópica $E_i$ no mide el número de eventos. Mide la proporción de eventos no procesados sobre el total.

## Observado en AGS

N4 (seguridad): 252 alertas de bloqueo activo el 22 feb 2026. Protocolo de respuesta activado en 3 nodos de 252. $E_{N4} = 0.96$ (CRITICAL). $E_{N6} = 0.95$ (CRITICAL).

## Implicación

El sistema de alerta cumple su función formal (genera alertas). No cumple su función real (activar respuesta). La métrica oficial reporta cobertura del 100%.
