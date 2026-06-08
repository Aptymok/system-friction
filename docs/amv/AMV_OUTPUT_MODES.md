# AMV Output Modes

## Objetivo

Definir formatos de salida reutilizables para AMV. Un `OutputMode` no es dashboard, no crea UI y no escribe datos.

El vocabulario fuente vive en `src/lib/amv/core/outputModeTypes.ts`.

## Salidas

`briefing`, `field_reading`, `audit_report`, `simulation_report`, `intervention_plan`, `risk_register`, `evidence_packet`, `json_export`, `dashboard_state`, `executive_summary`, `policy_memo`, `creative_brief`, `scenario_matrix`, `early_warning`, `decision_record`, `reality_debt_report`, `attractor_map`, `ejector_map`, `phenomenon_card`.

## Reglas

- `dashboard_state` es payload de estado renderizable existente, no dashboard nuevo.
- `simulation_report` permanece sandbox si nace de simulacion o proyeccion.
- `intervention_plan` no ejecuta intervenciones.
- `evidence_packet` agrupa evidencia visible; no fabrica evidencia ausente.
- `json_export` describe serializacion; no escribe archivos ni bases por si mismo.

## Uso por spec

Los instrumentos y paneles pueden declarar `outputModes`:

```ts
outputModes: ['field_reading', 'decision_record', 'risk_register']
```

La capa visual decide como renderizar una salida existente. El contrato no autoriza nuevas superficies.
