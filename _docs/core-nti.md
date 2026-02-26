---
layout: doc
title: NTI · El sistema se auto-audita
published: 2026-05-23
version: "1.0"
stability: alta
type: core · auditoría
related:
  - url: /mihm/
    num: "MIHM"
    title: Motor de validación activo
    sub: "Estado del ecosistema en tiempo real."
  - url: /docs/core-patrones/
    num: "core-patrones"
    title: Catálogo de patrones
    sub: "Cada patrón con su condición de refutación."
---

# NTI · El sistema se auto-audita

El Nodo de Trazabilidad Institucional (NTI) es la Capa 0 del MIHM.

No mide el recurso. Mide la integridad de la señal que describe el recurso.

Si NTI < 0.50, el sistema no puede actuar sobre decisiones estructurales.
No porque la situación no lo requiera. Sino porque los datos que
fundamentarían la decisión no son confiables.

---

## Componentes del NTI

**LDI (Latencia de Decisión Institucional)**
Tiempo entre emisión de alerta técnica válida y acción institucional
verificable. Normalizado: LDI_norm = min(t_real / t_referencia, 1.0).

**ICC (Índice de Concentración de Conocimiento)**
Concentración del conocimiento operativo relevante.
ICC = Σ_j f_j², donde f_j es la fracción del conocimiento en el actor j.
ICC cercano a 1.0 indica concentración extrema (riesgo: actor único).
ICC normalizado para NTI: ICC_norm = 1 − ICC.

**CSR (Cobertura de Señal de Riesgo)**
Proporción de señales de riesgo activas que reciben respuesta
antes del umbral de degradación. CSR = acciones_ejecutadas /
señales_detectadas.

**IRCI (Índice de Resiliencia de Capital Institucional)**
Capacidad del sistema de mantener función básica ante pérdida
de actores clave. En sistemas hídricos: proxy = factor de
compactación del acuífero.

**IIM (Integridad de la Información de Medición)**
Coherencia entre lo auto-reportado y lo verificable por terceros.
IIM = 1 − |reportado − verificado| / reportado.

---

## Fórmula

NTI = (1/5) × [(1 − LDI_norm) + ICC_norm + CSR + IRCI_norm + IIM]

Rango: 0.0 (integridad nula) → 1.0 (integridad perfecta)

---

## Umbrales de decisión por categoría

| Categoría | NTI requerido | Estado |
|---|---|---|
| Estructural irreversible | ≥ 0.70 | BLOQUEADA hasta restaurar integridad |
| Estructural reversible | ≥ 0.50 | CONGELADA con bandera de incertidumbre |
| Táctica reversible | ≥ 0.30 + documentación | PROCEDE con flag explícito |
| Emergencia vital | Cualquiera + H3 override | PROCEDE con revisión post-evento |

---

## NTI aplicado al propio ecosistema

System Friction v1.1 tiene NTI = 0.47.

- LDI_norm = 0.55 (latencia de corrección de bugs conocidos)
- ICC_norm = 0.80 (conocimiento del sistema distribuido, un autor)
- CSR = 0.30 (rutas sugeridas vacías = señal no respondida)
- IRCI_norm = 0.90 (ecosistema digital, alta resiliencia técnica)
- IIM = 0.60 (lo que se declara vs lo que se implementa)

NTI_sistema = (1/5) × (0.45 + 0.80 + 0.30 + 0.90 + 0.60) = 0.61

Nota: NTI del sitio mejora a 0.61 después de aplicar los 7 fixes de auditoría.
Supera el umbral 0.50 necesario para habilitar la integración MIHM estructural.

**Límite de aplicación:** El NTI del ecosistema no mide la calidad
de los documentos. Mide la integridad del sistema de medición que
soporta las decisiones del ecosistema. Si el NTI cae bajo 0.50,
las nuevas publicaciones deben marcarse con bandera de incertidumbre
hasta restaurar la integridad.