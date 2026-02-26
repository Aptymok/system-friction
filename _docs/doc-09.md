---
title: "Deuda de decisión"
doc_id: "doc-09"
series: "09 · Fundamentos"
summary: "Costo acumulado de posponer claridad."
version: "1.0"
stability: "alta"
first_published: "2026-02-02"
node: "docs"
mihm_variable: "D_d"
mihm_equation: "D_d = decisiones_postergadas acumuladas"
sf_pattern: "deuda-de-decisión"
mihm_note: "La postergación continua transforma deuda en fricción estructural."
patterns:
  - deuda-decisión
  - consenso-superficial
  - costo-diferido
  - zona-gris
---

# Deuda de decisión

## Diferencia con deuda técnica

**Deuda técnica:** costo de código mal escrito que funciona pero es difícil de mantener.

**Deuda de decisión:** costo acumulado de posponer claridad sobre qué problema estamos resolviendo.

La segunda es invisible hasta que paraliza.

## Síntomas observables

* Reuniones que terminan sin definición clara
* Documentos que evitan el tema central
* Consenso superficial que no resiste implementación
* Decisiones "técnicas" que son realmente políticas no resueltas

## Cómo se acumula

La deuda de decisión crece cuando:

* Es más cómodo avanzar sin claridad que enfrentar el desacuerdo
* Hay incentivo a aparentar consenso
* El costo de la ambigüedad es diferido
* Quien paga el costo no es quien evita la decisión

No es mala fe. Es que posponer la claridad suele ser localmente óptimo.

## Diferencia clave con deuda técnica

La deuda técnica se paga refactorizando.

La deuda de decisión se paga enfrentando la pregunta que todos evitan.

Refactorizar es trabajo. Enfrentar desacuerdo latente es político.

Por eso la deuda de decisión es más cara de resolver.

## Cuándo se hace visible

La deuda de decisión suele manifestarse cuando:

* Llega el momento de implementar
* Aparece una crisis que requiere alineación real
* Un nuevo integrante pregunta "¿qué estamos resolviendo exactamente?"
* Dos equipos construyen soluciones incompatibles

En ese punto, el costo de resolverlo es mucho mayor que si se hubiera enfrentado inicialmente.

## Cómo reducir deuda de decisión

No con más documentación. Con preguntas explícitas:

* ¿Qué suposiciones estamos haciendo que no hemos verificado?
* ¿En qué estamos en desacuerdo sin admitirlo?
* ¿Qué pregunta estamos evitando?
* ¿Quién debe decidir esto y cuándo?

Estas preguntas son incómodas. Por eso funcionan.

**Límite de aplicación:** Contextos colaborativos donde múltiples partes deben alinearse.
En decisiones individuales, el patrón no aplica igual.
{: .limit-box }
