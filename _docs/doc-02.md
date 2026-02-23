---
title: "Costo real de adoptable"
doc_id: "doc-02"
series: "02 · Fundamentos"
summary: "Por qué soluciones superiores no se implementan."
version: "1.1"
stability: "alta"
first_published: "2026-02-02"
node: "docs"
patterns:
  - fricción-política
  - costo-de-adopción
  - distancia-diseño-consecuencia
  - asimetría-exposición
---

## Variables invisibles en adopción

Una solución técnicamente superior puede perder frente a una mediocre por razones que no aparecen
en el análisis de costo-beneficio:

* **Deuda de aprendizaje:** cuánto tiene que cambiar la gente para usarla
* **Superficie de fricción:** cuántos puntos de contacto con sistemas existentes
* **Visibilidad del fracaso:** qué tan obvio es cuando algo sale mal
* **Reversibilidad:** qué tan caro es volver atrás

El diseño institucional real no pregunta "¿funciona?". Pregunta "¿quién se expone si esto falla?".

## Caso observable

Un sistema de reportes que requiere tres clics adicionales puede morir aunque genere mejor información,
porque esos tres clics distribuyen responsabilidad de forma incómoda.

No es resistencia irracional. Es cálculo implícito de riesgo político y operativo.

## Variable crítica

La distancia entre quien diseña y quien enfrenta las consecuencias del diseño.

Cuando esa distancia es alta, las decisiones optimizan para elegancia técnica.
Cuando es baja, optimizan para navegabilidad política.

Ninguna de las dos es incorrecta. Son funciones de objetivo distintas.

## Costo de integración vs valor intrínseco

Una solución puede ser objetivamente mejor y aún así perder porque:

* Requiere cambios en demasiados lugares a la vez
* Expone deficiencias que nadie quiere documentar
* Transfiere poder entre áreas de forma visible
* Hace explícito lo que funcionaba implícitamente

Adoptabilidad es fricción sistémica medida en unidades de exposición política.

**Límite de aplicación:** Organizaciones con sistemas legacy y alta interdependencia.
En contextos greenfield estas variables pesan menos.

**Riesgo de mala aplicación:** Usado para justificar inercia sin análisis de costos reales de no cambiar.
