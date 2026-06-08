# AMV Scope Contract

## Objetivo

AMV no es un dashboard ni un chat por instrumento. AMV es un runtime comun que recibe un `scope`, construye contexto, aplica politica de decision y devuelve una respuesta visible comprimida.

El contrato base queda dividido en tres capas:

1. `ObservationMode`: como observa AMV.
2. `FieldOperator`: que operador de campo aplica a la lectura.
3. `OutputMode`: en que formato sale la lectura.

Los `ReportRegime` son etiquetas interpretativas para reportes. No son evidencia por si mismos.

## Contrato minimo

Cada instrumento debe declarar:

- `id`
- `name`
- `ontologicalQuestion`
- `observedObject`
- `scope`
- `observationModes`
- `fieldOperators`
- `outputModes`
- `reportRegimes`
- `observableObjects`
- `focusVariables`
- `evidenceTrust`
- `archiveLayers`
- `sources`
- `tables`
- `metrics`
- `requiredAgents`
- `allowedActions`
- `prohibitedActions`
- `panels`
- `risk`
- `minimumEvidence`
- `amvBriefing`
- `responsePolicy`

Los tipos fuente viven en:

```txt
src/lib/amv/core/instrumentTypes.ts
src/lib/amv/core/dashboardSpecTypes.ts
src/lib/amv/core/observationModes.ts
src/lib/amv/core/fieldOperatorTypes.ts
src/lib/amv/core/outputModeTypes.ts
src/lib/amv/core/regimeTypes.ts
src/lib/amv/core/reportTypes.ts
```

## Registro

Los scopes runtime se registran en:

```txt
src/lib/amv/registry/scopeRegistry.ts
```

Los instrumentos se registran en:

```txt
src/lib/amv/registry/instrumentRegistry.ts
```

Los dashboards declarativos se registran en:

```txt
src/lib/amv/registry/dashboardRegistry.ts
```

ROOT es el primer instrumento registrado:

```txt
src/lib/amv/scopes/root/rootDashboardSpec.ts
```

## Regla de separacion

Un scope responde por contexto y decision.

Un instrumento declara que observa, que operadores admite, que salidas puede emitir, que evidencia exige y que acciones permite o prohibe.

Un dashboard spec declara paneles y layout renderizable existente.

Un componente visual solo renderiza la spec. No inventa instrumentos, metricas, acciones, fuentes, operadores ni salidas.

## Modos observacionales

AMV reconoce:

`audit`, `mihm`, `worldspect`, `focus`, `longitudinal`, `comparative`, `counterfactual`, `forensic`, `diagnostic`, `predictive`, `prescriptive`, `retrospective`, `prospective`.

## Operadores de campo

AMV reconoce:

`attractor`, `ejector`, `stochastic_projection`, `intervention`, `perturbation`, `regime_shift`, `threshold`, `signal`, `pattern`, `cluster`, `phenomenon`, `debt`, `rce`, `latency`, `coherence`, `dissonance`, `coupling`, `decoupling`, `contamination`, `verification`, `closure`, `memory`, `simulation`.

Reglas fuertes:

- `stochastic_projection` siempre queda sandbox hasta aprobacion.
- `intervention` no ejecuta nada externo.
- `attractor` orienta ruta, no ejecuta.
- `ejector` puede bloquear cierre fuerte.

## Salidas

AMV reconoce:

`briefing`, `field_reading`, `audit_report`, `simulation_report`, `intervention_plan`, `risk_register`, `evidence_packet`, `json_export`, `dashboard_state`, `executive_summary`, `policy_memo`, `creative_brief`, `scenario_matrix`, `early_warning`, `decision_record`, `reality_debt_report`, `attractor_map`, `ejector_map`, `phenomenon_card`.

Las salidas son formatos, no dashboards.

## Politica

AMV mantiene estas restricciones:

- no crear otro AMV
- no crear otro chat por scope
- no escribir en Supabase desde el contrato
- no ejecutar acciones reales
- no mostrar mas de una ruta dominante
- no tratar inferencia como evidencia
- no tratar decision aceptada como accion ejecutada
- no promover evidencia unknown
- no usar simulacion o sandbox para regimen
- no tratar `ReportRegime` como evidencia

## Render

Los componentes genericos existentes son:

```txt
src/observatory/components/amv/ScopedDashboardShell.tsx
src/observatory/components/amv/AmvPanelRenderer.tsx
```

Este patch no crea dashboards nuevos. Solo amplia el contrato que las specs pueden declarar.
