# ROOT Phase 15-17B Total Observation Contract Patch

## Objetivo

Cerrar el contrato base de AMV para ROOT en tres capas sin crear dashboards nuevos, sin tocar Supabase, sin ejecutar Python y sin importar `services/python`.

## Capas cerradas

1. `ObservationMode`
2. `FieldOperator`
3. `OutputMode`

`ReportRegime` queda definido como etiqueta interpretativa de reporte, no como evidencia.

## Archivos de contrato creados

| Archivo | Funcion |
| --- | --- |
| `src/lib/amv/core/fieldOperatorTypes.ts` | Vocabulario y definiciones de operadores de campo. |
| `src/lib/amv/core/outputModeTypes.ts` | Vocabulario y definiciones de formatos de salida. |
| `src/lib/amv/core/attractorMode.ts` | Regla base del operador atractor. |
| `src/lib/amv/core/ejectorMode.ts` | Regla base del operador eyector. |
| `src/lib/amv/core/stochasticProjectionMode.ts` | Regla sandbox para proyeccion estocastica. |
| `src/lib/amv/core/interventionMode.ts` | Regla de plan sin ejecucion externa. |
| `src/lib/amv/core/regimeTypes.ts` | Regimenes interpretativos de reporte. |
| `src/lib/amv/core/reportTypes.ts` | Contrato de reporte y seguridad. |
| `src/lib/amv/agents/attractorAgent.ts` | Evaluador puro de orientacion de atractor. |
| `src/lib/amv/agents/ejectorAgent.ts` | Evaluador puro de bloqueo por eyector. |
| `src/lib/amv/agents/stochasticProjectionAgent.ts` | Evaluador puro sandbox. |
| `src/lib/amv/agents/interventionAgent.ts` | Evaluador puro de plan de intervencion. |

## Modos observacionales finales

`audit`, `mihm`, `worldspect`, `focus`, `longitudinal`, `comparative`, `counterfactual`, `forensic`, `diagnostic`, `predictive`, `prescriptive`, `retrospective`, `prospective`.

## Operadores finales

`attractor`, `ejector`, `stochastic_projection`, `intervention`, `perturbation`, `regime_shift`, `threshold`, `signal`, `pattern`, `cluster`, `phenomenon`, `debt`, `rce`, `latency`, `coherence`, `dissonance`, `coupling`, `decoupling`, `contamination`, `verification`, `closure`, `memory`, `simulation`.

## Salidas finales

`briefing`, `field_reading`, `audit_report`, `simulation_report`, `intervention_plan`, `risk_register`, `evidence_packet`, `json_export`, `dashboard_state`, `executive_summary`, `policy_memo`, `creative_brief`, `scenario_matrix`, `early_warning`, `decision_record`, `reality_debt_report`, `attractor_map`, `ejector_map`, `phenomenon_card`.

## Regimenes de reporte

`contemplative`, `performative`, `saturated`, `proto_critical`, `dissonant`, `extractive`, `ghost`, `coupling`, `active_ejector`, `emergent_attractor`.

## Reglas preservadas

- `stochastic_projection` siempre sandbox hasta aprobacion.
- `intervention` no ejecuta nada externo.
- `attractor` orienta ruta, no ejecuta.
- `ejector` puede bloquear cierre fuerte.
- Las salidas son formatos, no dashboards.
- Los regimenes de reporte son etiquetas interpretativas, no evidencia por si mismas.
- No se toca DB.
- No se crea UI nueva.
- ROOT sigue consumiendo su spec existente.

## Riesgos

- El contrato amplio aumenta la superficie tipada; specs futuras deben reducir vocabulario por panel para no declarar mas de lo que observan.
- `dashboard_state` puede confundirse con permiso de dashboard; queda documentado como payload de estado, no superficie nueva.
- Los agentes nuevos son evaluadores puros de contrato; no deben conectarse a ejecucion externa sin fase y aprobacion explicita.
