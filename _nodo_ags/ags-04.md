---
layout: node
title: "AGS-04 — Sistema Logístico"
description: "Corredor industrial. Resiliencia bajo shock."
id: ags-04
version: "1.1"
status: validated
origin: vhpd
math: true
friction_index: 0.7
node_status: OK
---

Corredor industrial. Resiliencia bajo shock.

---

El sistema logístico (Nissan, corredor industrial) mantuvo operación durante el evento del 22–23 feb 2026. Único nodo con $f < 1.0$.

---

## Vector N3

$C_{N3} = 0.85$, $E_{N3} = 0.35$, $L_{N3} = 0.35$, $R_{N3} = 0.60$, $f = 0.70$ (OK)

## Mecanismo

doc-08 (personas en alta incertidumbre): la resiliencia de N3 no proviene del protocolo formal. Proviene de la activación de relaciones informales entre operadores logísticos con contrapartes en N2.

El protocolo formal requería autorización de N5 (coordinación). N5 estaba en OPAQUE. El operador de N3 activó una cadena alternativa sin pasar por N5.

## Advertencia

Esta resiliencia es invisible en las métricas formales. Si el operador clave cambia, la resiliencia desaparece. El sistema formal no la captura ni la protege.
