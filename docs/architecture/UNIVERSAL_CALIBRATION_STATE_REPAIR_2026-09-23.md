# SFI PRECHECK: truthful universal-cycle calibration state

- Owner: existing universal signal cycle read model, consumed by the canonical external signal gateway.
- Existing capability inspected: universalSignalCycle.readUniversalCycleHistory, universalClosure.contrastLatestUniversalReturn, universalEmpiricalContinuation, World hypothesisCalibration and hypothesisCycle.
- Absorb vs create decision: repair the existing history projection; no new runtime, writer or authority surface.
- Authoritative writer: existing appendEpistemicEvent for universal lifecycle events; World hypothesis writers remain unchanged.
- Persistence/lineage impact: NONE. Preserve every original RETURN and contrast. Derive state only from the latest RETURN and its latest subsequent linked contrast.
- Front delta: NONE; consumers receive a truthful existing state.
- Back delta: a failed/inconclusive/unlinked contrast must not project CALIBRATED; a later RETURN invalidates the earlier calibration checkpoint.
- DB delta: NONE.
- Redundancy removed: NONE; no parallel capability introduced.
- Execution/ROOT boundary: read-only projection; no OAuth, scope, grants, confidence, learning or canon mutation.
- Rollback: revert the projection change; no history or data erased.
- Verification: behavior tests execute the actual history reader against in-memory persisted-event fixtures, then domain boundaries, canonical audit, typecheck and existing CI build.

## Scope and remaining boundary

This is a bounded part of P1, not the World-to-RETURN integration repair. Current code proves that any contrast currently projects CALIBRATED, even PREDICTION_MISSING. Tests must reproduce that defect before modification.

The current session exposes no authenticated SFI MCP tool. The configured canonical MCP URL exists, but configuration is not access. Live hypothesis/RETURN/contrast payloads and their canonical relation cannot be recovered in this session. Do not infer a World relation from a UUID, a caller statement, or this document. Do not mutate or recreate user-provided objects. Complete original-object hydration, governed evidence validation and World outcome lineage only after authenticated MCP recovery.

Latest repository base: 9c4baef32c36d3382bc457d2c4749b9b2352648d, after PRs 656-660. Production workflow 35881198855 reports success for that SHA. Runtime exercise is NOT_OBSERVED.
