# SFI Cognitive Runtime

The SFI Cognitive Runtime is an infrastructure layer, not a parallel app.

It registers cognitive contracts for agents and modes that coordinate existing memory, event, simulation, prediction, and governance surfaces. It does not create new database schemas and does not fabricate operational results when evidence is missing.

## Current integration

- Contract registry: `src/lib/sfi/cognitive-runtime/registry.ts`
- Runtime reader: `src/lib/sfi/cognitive-runtime/runtime.ts`
- ROOT state reader: `src/lib/root/sovereign/readers/readRootCognitiveRuntime.ts`
- ROOT-gated API: `GET/POST /api/root/cognitive-runtime`
- ROOT UI view: `/root?view=cognitive-runtime`

## Rules

- `MetaOrchestratorAgent` creates `SFI_TASK_CREATED`; it does not call agents directly.
- Agent authority, readable memory, writable memory, emitted events, confidence model, simulation permission, and approval requirement are explicit contract fields.
- `Passive Field Observation Layer` is an operational mode, not an executor agent.
- Historical reconstruction and specialized field simulators remain gated when their supporting persistence surfaces are missing.
- Prediction output must return through observed outcome, error, adjustment, and next readiness before being treated as learned state.
