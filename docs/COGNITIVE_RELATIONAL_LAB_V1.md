# Cognitive Relational Laboratory v1

Status: EXPERIMENTAL · ROOT ONLY · evidence-bound

## Objective

Observe relational coupling rather than treating the founder as an isolated cognitive object.

The laboratory distinguishes:

- what the founder originated;
- what a model proposed;
- what the founder merely authorized;
- what was co-developed;
- what emerged from system behavior;
- what came from external actors or sources.

Founder authorization is explicitly **not** evidence of founder origination.

## Activation

After the migration is applied and the application is redeployed, ROOT exposes the `CRL` launcher.

1. Open `/root` as ROOT/founder.
2. Open `CRL`.
3. Select a condition.
4. Define the real objective of the session.
5. Press `ACTIVAR SESIÓN`.

Activation creates a persisted `sfi_cognitive_lab_sessions` row. It is not a visual-only toggle.

## Initial controlled conditions

### FOUNDER + MODEL

The model receives the current task and recent laboratory chat only. It does **not** receive Cognitive Twin memory. This is the general-model baseline.

### FOUNDER + COGNITIVE TWIN

The execution model receives only:

- `VERIFIED` / `CANONICAL` Cognitive Twin memory;
- `APPROVED` founder decisions.

It deliberately excludes `CANDIDATE` memory to reduce circular learning.

### FOUNDER SOLO / FOUNDER + HUMAN + TECH

The persistence model supports these conditions, but v1 does not fabricate automatic capture for external activity. Events can be ingested through the governed events endpoint until dedicated adapters exist.

## Provenance classes

- `FOUNDER_ORIGINATED`
- `MODEL_PROPOSED`
- `CO_DEVELOPED`
- `SYSTEM_EMERGENT`
- `EXTERNAL`
- `FOUNDER_AUTHORIZATION`
- `UNKNOWN`

## Operational cycle

```text
ACTIVATE SESSION
→ CAPTURE EVENTS + PROVENANCE
→ EXECUTE REAL TASK
→ BLIND COGNITIVE TWIN RECONSTRUCTION
→ FOUNDER READING
→ DIVERGENCE ANALYSIS
→ CANDIDATE RELATIONAL LEARNING
→ LATER REPLICATION / VERIFICATION
```

The blind Twin is executed **before** the founder reading is supplied.

## “EJECUTA” semantics

The ROOT laboratory console exposes `REGISTRAR “EJECUTA”`.

It records:

- `event_kind = FOUNDER_DECISION`
- `provenance = FOUNDER_AUTHORIZATION`

This prevents the laboratory from learning that an operation was founder-originated merely because the founder accepted execution.

## Blind analysis

`POST /api/root/cognitive-lab/sessions/:id/blind`

The blind analysis reconstructs:

- objective;
- founder function;
- technology function;
- direction of initiative;
- expansion;
- contraction;
- induced friction;
- omissions;
- material trajectory changes;
- candidate relational phenomena;
- uncertainty;
- `WHO CHANGED WHOM` when evidence allows.

It does not promote learning to canon.

## Founder contrast

`POST /api/root/cognitive-lab/sessions/:id/contrast`

The founder reading is persisted after the blind analysis. The divergence stage separates:

- agreement;
- divergence;
- provenance conflict;
- omission;
- missing relational representation;
- instrument bias;
- legitimate ambiguity;
- genuinely new founder information.

A successful contrast creates exactly one `CANDIDATE` Cognitive Twin memory object for the session. It remains non-canonical and must later be replicated or explicitly verified.

## Persistence

Tables:

- `sfi_cognitive_lab_sessions`
- `sfi_cognitive_lab_events`
- `sfi_cognitive_lab_analyses`

Laboratory output can also create a `CANDIDATE` row in `sfi_cognitive_twin_memory` after founder contrast.

No seed data is inserted. Empty laboratory state remains explicit.

## API surface

- `GET /api/root/cognitive-lab/sessions`
- `POST /api/root/cognitive-lab/sessions`
- `GET /api/root/cognitive-lab/sessions/:id`
- `GET /api/root/cognitive-lab/sessions/:id/events`
- `POST /api/root/cognitive-lab/sessions/:id/events`
- `POST /api/root/cognitive-lab/sessions/:id/interact`
- `POST /api/root/cognitive-lab/sessions/:id/blind`
- `POST /api/root/cognitive-lab/sessions/:id/contrast`

All routes are ROOT-governed server routes.

## Activation dependencies

The feature is operational only when all three conditions are true:

1. the branch is merged/deployed;
2. migration `20260810003000_cognitive_relational_lab_v1.sql` has been applied to the production Supabase database;
3. at least one configured LLM provider is available for model/Twin conditions and blind/contrast analysis.

Without database migration, the console must fail visibly rather than simulate a session.
Without an LLM provider, captured evidence remains valid but synthesis returns degraded/blocked state.
