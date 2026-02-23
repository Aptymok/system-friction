---
title: "Contexto perdido"
doc_id: "doc-07"
series: "07 · Fundamentos"
summary: "Decaimiento del razonamiento por pérdida de restricciones."
version: "1.0"
stability: "alta"
first_published: "2026-02-02"
node: "docs"
patterns:
  - decaimiento-contexto
  - decisión-emergente
  - rotación-conocimiento
  - deuda-documental
---

## Por qué las decisiones envejecen

Las decisiones documentadas pierden validez cuando el contexto que las justificó ya no se puede reconstruir.

No porque la lógica cambie. Porque las restricciones que hacían esa decisión óptima desaparecieron sin registro.

## Casos observables

* Workarounds que sobreviven al problema original
* Requisitos que respondían a un stakeholder que ya no existe
* Arquitecturas diseñadas para limitaciones técnicas superadas
* Políticas creadas por crisis que nadie recuerda

## Tasa de decaimiento

La velocidad a la que una decisión pierde validez depende de:

* Qué tan explícitas quedaron las restricciones
* Qué tan estable es el entorno operativo
* Cuántas personas conocían el contexto original
* Qué tan costoso es reconstruir el razonamiento

Variable crítica: tasa de rotación de personas que tomaron la decisión original.

## Qué documentar además de la decisión

Para que una decisión envejezca mejor:

* Restricciones específicas que la hicieron necesaria
* Alternativas consideradas y por qué se descartaron
* Qué tendría que cambiar para invalidar la decisión
* Fecha y condiciones en que se tomó

No como narrativa. Como metadata operativa.

## Señales de que el contexto ya no aplica

* Nadie puede explicar por qué algo es así
* La justificación oficial no coincide con el uso real
* Cumplir la política requiere excepciones constantes
* Los nuevos integrantes preguntan "¿por qué hacemos esto?"

Estas no son quejas. Son señales de que el contexto cambió más rápido que la documentación.

**Límite de aplicación:** Organizaciones con historia suficiente para acumular decisiones heredadas.
En contextos muy nuevos o con alta rotación intencional, el problema es diferente.
{: .limit-box }
