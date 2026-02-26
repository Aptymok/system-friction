---
layout: doc
title: "PUENTE — Sistemas que no pueden permitirse fallar"
description: "Umbral real vs oficial. La distancia donde opera el operador."
id: core-bridge
version: "1.1"
status: validated
math: true
prev_doc: /docs/core-0/
next_doc: /docs/doc-01/
---

Umbral real vs oficial. La distancia donde opera el operador.

---

Algunos sistemas tienen un umbral declarado y un umbral real. La distancia entre ambos es el espacio donde opera la fricción sin ser nombrada.

Un tiempo de respuesta normativo de 1 hora con un observado de 6 horas no es un error. Es la condición estable del sistema.

---

## La fórmula como diagnóstico

$$f = \frac{t}{T} + O$$

Cuando $t = T$: sistema en umbral normativo. Cuando $t \gg T$: el sistema opera en su umbral real. Cuando $O \to 1$: la opacidad amplifica cualquier latencia.

## Conexión con el Nodo AGS

El evento del 22–23 feb 2026:

| Nodo | f | Estado |
|------|---|--------|
| N5 — Coordinación | 2.10 | OPAQUE |
| N4 — Seguridad | 1.84 | CRITICAL |
| N3 — Logística | 0.70 | OK |

N3 mantuvo $f < 1.0$ porque no dependía de coordinación inter-institucional.
