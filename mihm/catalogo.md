---
layout: default
title: "Catálogo — Variables y Fórmulas"
description: "Definición completa de variables MIHM con ejemplos concretos del Nodo Aguascalientes."
permalink: /mihm/catalogo/
nav: mihm
---

# Catálogo de Variables y Fórmulas

Cada variable definida con: dominio, umbral crítico, ejemplo concreto del Nodo AGS.

---

## Fórmula base

$$f = \frac{t}{T} + O$$

Toda fricción en el sistema es una instancia de esta fórmula. Ejemplo AGS:

| Nodo | t (observado) | T (normativo) | O | f |
|------|--------------|---------------|---|---|
| N5 — Coordinación | 6h | 1h | 0.68 | **6.68** |
| N4 — Seguridad | 0.88 | 1.0 | 0.96 | **1.84** |
| N3 — Logística | 0.35 | 1.0 | 0.35 | **0.70** |

---

## Variables de nodo

| Variable | Símbolo | Dominio | Umbral crítico | Ejemplo AGS |
|----------|---------|---------|----------------|-------------|
| Capacidad adaptativa | $C_i$ | $[0,1]$ | $< 0.30$ → FRACTURE | N1: 0.18 (sobreexplotación acuífero) |
| Carga entrópica | $E_i$ | $[0,1]$ | $> 0.80$ → CRITICAL | N4: 0.96 (252 bloqueos activos) |
| Latencia operativa | $L_i$ | $[0,1]$ | $> 0.85$ → DEGRADED | N1: 0.92 (infraestructura sin margen) |
| Conectividad funcional | $K_i$ | $[0,1]$ | — | N6: 0.75 (red perturbada) |
| Redistribución | $R_i$ | $[0,1]$ | — | N1: 0.12 (mínima capacidad de transferencia) |
| Módulo de coherencia | $M_i$ | $[0,1]$ | $< 0.50$ → OPAQUE | N5: 0.50 (Sec. Seg. ausente en Mesa) |

---

## IHG — Índice de Gobernanza Homeostática

$$\text{IHG} = \frac{1}{N}\sum_{i=1}^{N}(C_i - E_i)(1 - L_i^{\text{eff}})$$

La latencia efectiva integra la degradación de coherencia institucional:

$$L_i^{\text{eff}} = \min\!\left(L_i \cdot \left(1 + (1 - M_i)\right),\; 1\right)$$

**AGS post-fractura:** IHG = −0.620. Umbral UCAP: −0.500. Protocolo de emergencia activado.

---

## NTI — Nodo de Trazabilidad Institucional

$$\text{NTI} = \frac{1}{5}\left[(1-\text{LDI}_n) + \text{ICC}_n + \text{CSR} + \text{IRCI}_n + \text{IIM}\right]$$

| Componente | Descripción | AGS post-fractura |
|------------|-------------|-------------------|
| $1-\text{LDI}_n$ | Latencia de decisión federal→local (invertida) | 0.000 (6h vs 1h normativo) |
| $\text{ICC}_n$ | Concentración de conocimiento operativo | 0.320 (2 comandantes) |
| $\text{CSR}$ | Cumplimiento meta reducción de incidentes | 0.000 (0% de meta 50%) |
| $\text{IRCI}_n$ | Resiliencia capital institucional (acuífero) | 0.935 |
| $\text{IIM}$ | Integridad de métricas reportadas | 0.500 (12/18 verificados) |

**NTI = 0.351** → Sistema en modo ciego. IHG corregido: $-0.620 \times 0.351 = -0.218$.

---

## Función de utilidad del pacto implícito

$$U_P = B_C - C_C - f_{\text{corredor}}$$

Cuando $U_P \rightarrow 0$: el sistema revela su estado entrópico real en $< 24h$.  
AGS: $U_P$ colapsó el 22 feb 2026 tras la muerte del actor hegemónico del corredor.

---

## Patrones → Variables

Cada patrón de la serie doc-01 a doc-10 produce variaciones en al menos una variable MIHM.

<div id="sf-pattern-bridge" data-sf-load="true">—</div>

---

[Dashboard →](/mihm/) · [NTI →](/mihm/nti/) · [Patrones →](/mihm/patrones/)
