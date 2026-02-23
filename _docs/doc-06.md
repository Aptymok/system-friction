---
layout: default
title: "Sistemas de alerta que nadie revisa"
doc_id: "doc-06"
series: "06 · Fundamentos"
summary: "Métrica vs señal. Cobertura vs acción."
version: "1.0"
stability: "alta"
first_published: "2026-02-02"
node: "docs"
mihm_variable: "A_r"
mihm_equation: "A_r = alertas_revisadas / alertas_emitidas"
sf_pattern: "alerta-ignorada"
mihm_note: "El sistema emite señal, pero sin revisión no existe corrección."
patterns:
  - señal-ruido
  - desalineación-métricas
  - costo-atención
  - umbral-fijo
---

## Diferencia entre métrica y señal

Las organizaciones crean dashboards que miden todo y detectan nada.

El problema no es volumen de datos. Es confundir métrica con señal.

**Métrica:** cantidad que cambia
**Señal:** cambio que importa

La mayoría de sistemas de alerta fallan porque optimizan para completitud, no para acción.

## Por qué fallan las alertas tempranas

* No distinguen ruido de anomalía
* Asumen que ver el problema equivale a poder actuar
* Optimizan para cobertura sobre precisión
* No modelan el costo de atención del que recibe la alerta

## Patrón observable

Sistemas que alertan tanto que entrenan al usuario a ignorarlos.

No es que el usuario sea negligente.
Es que el sistema optimizó para minimizar falsos negativos sin considerar que los falsos positivos
tienen costo real.

Después de suficientes falsas alarmas, la señal real se vuelve indistinguible del ruido.

## Diseñar para acción, no para información

Un buen sistema de alerta debe responder:

* ¿Qué acción específica debo tomar?
* ¿Cuánto tiempo tengo para actuar?
* ¿Qué pasa si no hago nada?
* ¿Cómo sé si la acción funcionó?

Si la alerta no responde estas preguntas, es información, no señal.

## Problema de umbrales fijos

La mayoría de alertas usan umbrales estáticos que fueron configurados una vez y nunca se revisaron.

El sistema cambia. El umbral no. Con el tiempo, la alerta deja de ser predictiva.

Pero nadie actualiza el umbral porque cambiar el sistema de alertas es más arriesgado
que ignorar alertas malas.

**Límite de aplicación:** Sistemas con volumen suficiente para requerir alertas automatizadas. En contextos pequeños donde todo es revisable manualmente, este patrón es menos relevante.
{: .limit-box }