# ROOT data contracts

## Canonical value

Every system-matrix value uses `RootObservedValue<T>`:

```ts
type RootObservedValue<T> = {
  value: T | null;
  status: 'observed' | 'derived' | 'inferred' | 'gated' | 'missing' | 'degraded';
  source: string;
  observedAt: string | null;
  confidence: number | null;
  evidenceIds: string[];
  explanation: string;
  warning: string | null;
};
```

Visual formatters map absence to `SIN DATO`, `NO MEDIDO`, `BLOQUEADO`, `FUENTE DEGRADADA`, `SIN CONTRATO` or `SIN EVIDENCIA`. `NULL`, `undefined`, `NaN` and `Infinity` are not rendered.

## Reader envelope

Each reader returns `data`, `source`, `dataClass`, `observedAt` and `error`. Readers use explicit field lists, a bounded timeout and preserve source errors. A source error never becomes a zero.

| Reader | Primary sources |
|---|---|
| `readRootSystemState` | governance runtime, World Vector observation, latest epistemic event, latest audit |
| `readRootGovernanceQueue` | action proposals, logbook mutations, ROOT audits, epistemic events |
| `readRootAgents` | existing agentic ROOT state and provider state |
| `readRootPredictions` | `sfi_predictive_*` plus separate legacy registry tables |
| `readRootAmv` | persisted AMV memory, attractors, ejectors |
| `readRootEvidenceGraph` | ROOT/SFI evidence plus both persisted graph contracts |
| `readRootExecution` | known route contracts plus recent audited actions |

## Predictive engine

Migration `20260711090000_create_sfi_predictive_engine_contract.sql` defines models, runs, evidence requests, outcomes and learning events. It does not define or change a formula, create seed models, infer probabilities or fabricate calibration. Until a model/run is persisted, the UI displays the missing contract/sample state.

The legacy `sfi_prediction_entries` manual probability contract remains visually and semantically separate.

## Evidence graph

Only persisted nodes and edges are drawn. Node placement is a deterministic UI layout and is labelled `LAYOUT DERIVED`; relationships are labelled `RELATIONSHIPS OBSERVED`. The layout coordinates are not stored as evidence and do not represent geography.
