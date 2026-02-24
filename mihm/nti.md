---
layout: default
title: "NTI — Nodo de Trazabilidad Institucional"
description: "El NTI condiciona el IHG a la integridad real de los datos. Cuando NTI < 0.40: modo ciego."
permalink: /mihm/nti/
nav: mihm
---

# NTI

El NTI condiciona el IHG a la integridad real de la información disponible.  
No es una corrección. Es un diagnóstico de ceguera institucional.

---

$$\text{NTI} = \frac{1}{5}\left[(1-\text{LDI}_n) + \text{ICC}_n + \text{CSR} + \text{IRCI}_n + \text{IIM}\right]$$

---

<div id="sf-nti" data-sf-load="true">—</div>

---

## La contradicción resuelta

NTI bajo no invalida el diagnóstico. Lo precisa.

El sistema está en peor estado del que los datos formales indican, porque los datos formales son parciales.  
IIM = 0.50 significa: 12 eventos reportados, 18 verificados. La diferencia no desaparece al no ser contada.

El IHG corregido ($-0.218$) no representa el estado real. Representa el **rango de intervención disponible con los datos actuales**.

---

## Protocolo de recuperación NTI

Objetivo a 30 días: NTI ≥ 0.60 (modo operativo estándar).

| Acción | ΔNTI | Responsable | Patrón asociado |
|--------|------|-------------|-----------------|
| Distribución de conocimiento operativo | +0.08 | Sec. Seguridad | [doc-07](/docs/doc-07/) |
| Verificación sistemática de reportes | +0.06 | Mesa de Coordinación | [doc-06](/docs/doc-06/) |
| Reducción latencia federal → estatal a < 2h | +0.05 | Gobierno estatal | [doc-01](/docs/doc-01/) |
| Cumplimiento meta reducción de incidentes | +0.10 | SSPC | [doc-03](/docs/doc-03/) |

---

[Dashboard →](/mihm/) · [Catálogo →](/mihm/catalogo/) · [Patrones →](/mihm/patrones/)
