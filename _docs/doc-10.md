---
title: "Incentivos bien diseñados que fallan"
doc_id: "doc-10"
series: "10 · Fundamentos"
summary: "Ley de Goodhart. Optimización de proxy."
version: "1.0"
stability: "alta"
first_published: "2026-02-02"
node: "docs"
patterns:
  - proxy-objetivo
  - ley-goodhart
  - desalineación-métricas
  - optimización-local
---

## Casos donde el sistema funciona perfectamente

Para producir lo opuesto a lo deseado:

* Métricas de velocidad que incentivan deuda técnica
* Bonos por cierre que incentivan deals insostenibles
* KPIs individuales que destruyen coordinación
* Objetivos de calidad que incentivan rechazar trabajo difícil

## El problema no es diseño

Los incentivos están bien diseñados. El problema es que miden proxies, no objetivos.

Cuando el proxy se convierte en objetivo, el sistema optimiza para el proxy.

Esto no es irracionalidad. Es respuesta racional a incentivos mal alineados.

## Señal de falla

Cuando alcanzar la métrica es más fácil que lograr el resultado que la métrica supuestamente mide.

Ejemplos:

* Cerrar tickets sin resolver problemas
* Cumplir tiempos de respuesta sin mejorar servicio
* Completar features sin generar valor
* Pasar auditorías sin reducir riesgo

## Por qué persiste el problema

Cambiar el sistema de incentivos es más riesgoso que vivir con incentivos rotos.

Razones:

* El sistema actual ya está optimizado (para el proxy)
* Cambiar incentivos altera expectativas
* No está claro qué métrica nueva usar
* El costo del cambio es inmediato, el beneficio es diferido

## Formulación técnica

Cuando una métrica se convierte en objetivo, deja de ser una buena métrica.

No porque la gente haga trampa. Porque optimizar para la métrica es diferente de optimizar para el objetivo.
Y cuando hay desalineación, el sistema optimiza para lo que se mide, no para lo que importa.

## Cómo mitigar (no resolver)

* Usar múltiples métricas que sean difíciles de optimizar simultáneamente
* Cambiar las métricas antes de que la gente las optimice completamente
* Hacer que quien mide sea quien enfrenta las consecuencias
* Medir resultados finales, no intermedios

Ninguna solución es perfecta. Todas generan nuevos problemas.

**Límite de aplicación:** Sistemas con incentivos explícitos y métricas cuantificables. En contextos sin métricas formales, el problema se manifiesta de otras formas.
{: .limit-box }
