# OBSERVATORY DASHBOARD SPEC

Fecha: 2026-05-21  
Fase: FASE 5B - Observatory Dashboard read-only scaffold

## Objetivo

Definir el dashboard independiente `apps/observatory` como consola read-only del Observatorio SFI sin reemplazar `/terminal`.

FASE 5B no implementa UI productiva ni conecta datos reales.

## Principio

La UI no calcula verdad. La UI observa.

El dashboard consume contratos canonicos desde API/contracts. No calcula `FieldState`, no accede a DB y no reemplaza `SfiFieldShell`.

## Vistas declaradas

### FieldStateView

Muestra el estado canonico del campo.

Consume:

- `FieldStateDTO`

No calcula:

- regimen;
- metricas;
- degradacion;
- capacidad operacional.

### NodeRegistryView

Muestra nodos disponibles o registrados.

Consume:

- `NodeStateDTO[]`

No crea ni edita nodos en FASE 5B.

### EventStreamView

Muestra bitacoras/eventos.

Consume:

- `LogEntryDTO[]`

Debe mostrar clase epistemica/confianza cuando esten presentes.

### SourceHealthView

Muestra salud de fuentes.

Consume:

- `SourceHealthDTO[]`

No interpreta salud como verdad del campo.

### RiskResilienceView

Muestra riesgos y resiliencia operacional.

Consume en fase futura:

- risk register;
- runbook status;
- SourceHealth;
- incident state.

FASE 5B solo declara shape de vista.

### AgentProposalsView

Muestra propuestas del agente.

Reglas:

- propuestas no son decisiones;
- inferencias deben mostrar confidence;
- simulaciones deben estar marcadas como `simulated`;
- no ejecuta acciones.

## Boundary rules

`apps/observatory` puede importar:

- `packages/api-contracts`
- futuros clientes read-only de `services/api`
- `packages/ui` cuando exista UI compartida

`apps/observatory` no puede importar:

- `packages/db`
- `packages/mihm-core`
- `packages/campo-ob`
- `packages/security`
- `services/*` directamente

## No objetivos FASE 5B

- No dashboard productivo conectado.
- No replacement de `/terminal`.
- No import de `SfiFieldShell`.
- No fetch real.
- No DB.
- No Supabase.
- No calculo de verdad.

