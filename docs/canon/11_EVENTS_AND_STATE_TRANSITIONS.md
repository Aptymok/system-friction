# 11 · Events and State Transitions

**Status:** CANONICAL  
**Version:** 2026-08-06.events.v1

Institutional continuity is event-driven. Events record what happened; state is a projection derived from ordered events and persisted records.

Every event declares event name, schema version, actor or source, object identity, occurrence time, ingestion time, epistemic class, confidence, payload, lineage and authorization.

Canonical lifecycle transitions must be explicit and validated. Examples include evidence admission, hypothesis creation, prediction registration, simulation completion, calibration completion, promotion request, approval, rejection and reversion.

An event cannot claim a transition that the current state does not allow. Duplicate events must be idempotent or rejected. Failed persistence must be visible and retryable; it must not be represented as successful execution.

State labels are not inferred from interface text. Writers and reducers use declared contracts. Historical events are immutable except for append-only correction or invalidation events.

Schedulers and agents may request transitions. Governed transitions require the authority declared by the relevant contract.