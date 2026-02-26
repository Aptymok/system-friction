---
layout: audit
title: "NTI — Nodo de Trazabilidad Institucional"
version: "1.1"
status: validated
origin: vhpd
date: 2026-02-23
---

# NTI — Nodo de Trazabilidad Institucional

El NTI es la capa de auditoría del MIHM v2.0. Condiciona el IHG a la integridad real de los datos disponibles. Cuando NTI < UCAP (0.40), el sistema opera en modo ciego.

---

## Fórmula

$$\text{NTI} = \frac{1}{5}\left[(1 - \text{LDI}_n) + \text{ICC}_n + \text{CSR} + \text{IRCI}_n + \text{IIM}\right]$$

## Estado Post-Fractura (23 feb 2026)

<div id="dashboard-nti" class="sf-loading">Cargando componentes NTI...</div>

**NTI = 0.351** — Umbral UCAP no alcanzado (0.400). El sistema opera con datos degradados.

La consecuencia directa: el IHG observado (−0.620) debe interpretarse con el IHG corregido por NTI (−0.218). La corrección **no mejora el diagnóstico**: revela que el sistema tiene menos información confiable de la que necesita para intervenir correctamente.

---

## La Contradicción Resuelta del NTI

El NTI bajo (0.351) no invalida el diagnóstico. Lo precisa: el sistema está en peor estado de lo que los datos formales indican, porque los datos formales son parciales (IIM = 0.50: 12 reportados vs 18 verificados). La corrección $\text{IHG} \times \text{NTI} = -0.218$ refleja el **rango de intervención disponible con datos actuales**, no el estado real.

---

## Protocolo de Recuperación NTI

| Acción | ΔNTI esperado | Responsable |
|--------|--------------|-------------|
| Protocolo anti-ICC (distribución conocimiento) | +0.08 | Secretaría Seg. Pública |
| Restauración IIM (verificación de reportes) | +0.06 | Mesa de Coordinación |
| Reducción LDI (respuesta < 2h) | +0.05 | Gobierno estatal |
| Mejora CSR (meta reducción incidentes) | +0.10 | SSPC |

**NTI objetivo a 30 días:** 0.60 (modo operativo estándar).

---

[Catálogo →](/mihm/catalogo/) · [Dashboard →](/mihm/) · [Hub Nodo AGS →](/mihm/hub/) · [NTI →](/mihm/nti/) · [Patrones →](/mihm/patrones/)