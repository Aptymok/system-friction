# AMV Evidence Layer

## Objetivo

Crear una capa comun de evidencia y archivo para que AMV, ROOT y scopes futuros distingan evidencia fuerte, lectura operativa, inferencia, sandbox y auditoria.

## Evidence Trust

| Trust | Regla |
| --- | --- |
| `verified` | Puede sostener decision fuerte. |
| `declared` | Puede sostener lectura operativa si tiene operador y timestamp. |
| `inferred` | No se muestra salvo que cambie ruta, riesgo o cierre. |
| `simulated` | No alimenta regimen. |
| `sandbox` | No alimenta regimen. |
| `audit` | No gobierna experiencia principal. |
| `unknown` | No se promueve. |

La politica vive en:

```txt
src/lib/amv/core/evidenceTypes.ts
src/lib/amv/core/evidencePolicy.ts
src/lib/amv/agents/evidenceAgent.ts
```

## Relacion con operadores, salidas y regimenes

- `FieldOperator` describe como se lee o controla una condicion de campo.
- `OutputMode` describe el formato de salida.
- `ReportRegime` describe una etiqueta interpretativa.

Ninguno de esos tres elementos es evidencia por si mismo. Todos deben apoyarse en `EvidenceTrust` y linaje visible.

## Archivo y capas

La politica de archivo vive en `src/lib/amv/core/archiveLayerPolicy.ts`.

| Capa | Funcion | Puede alimentar regimen |
| --- | --- | --- |
| `sfi_archive` | Corpus, documentos fundacionales, patrones historicos y memoria no activa. | No |
| `living_observatory` | Senales activas, evidencia vigente, WSV, MIHM y mutaciones abiertas. | Si |
| `attractor` | Elementos con peso direccional suficiente. | Si, solo con `verified` |
| `sandbox` | Pruebas, simulaciones, fixtures y datos sin origen suficiente. | No |
| `technical_audit` | Logs, trazabilidad y linaje tecnico secundario. | No |

## Agente de evidencia

`evaluateAmvEvidence` devuelve:

- `support`
- `visible`
- `canFeedRegime`
- `canSupportAttractor`
- `warnings`

Esto permite que cada scope evalua evidencia sin inventar reglas locales.

## Reglas de visibilidad

`inferred` queda oculto por defecto. Solo se vuelve visible si cambia ruta, riesgo o cierre.

`declared` necesita operador y timestamp para sostener lectura operativa.

`simulated`, `sandbox`, `audit` y `unknown` pueden existir, pero no gobiernan la experiencia principal.

`stochastic_projection` y `simulation` deben mantenerse sandbox hasta aprobacion humana explicita.
