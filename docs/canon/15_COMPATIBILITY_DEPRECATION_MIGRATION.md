# 15 · Compatibility, Deprecation and Migration

**Status:** CANONICAL  
**Version:** 2026-08-06.migration.v1

Compatibility exists to preserve history, not to perpetuate ambiguity.

Migration classes:

- `DIRECT_ALIAS`: one legacy identifier maps to exactly one canonical identifier.
- `CONTEXTUAL_ALIAS`: resolution requires method, object type or storage context.
- `TRANSFORM_REQUIRED`: scale, unit or formula conversion is required.
- `HISTORICAL_ONLY`: readable but cannot generate new records.
- `UNRESOLVED`: insufficient information; no automatic migration.
- `PROHIBITED`: invalid concept or identifier.

Automatic redirection is permitted only for `DIRECT_ALIAS`. Contextual aliases must use an explicit resolver. Transformations must preserve raw values, conversion formula and versions. Unresolved records remain degraded instead of being guessed.

`PHI_SYSTEMIC → PHI_S` is direct. `PHI_SF` is contextual: bounded assets map to `PHI_S`; institutional snapshots map to `PHI_SFI`. PPOI composite `0–5 → PHI_F 0–1` requires transformation and retention of the raw composite.

Deprecated fields remain available for historical reads during a declared compatibility window. New writers use canonical identifiers only. Removal requires usage audit, migration verification, rollback plan and governance approval.

The repository must fail validation when production code introduces an unknown canonical-looking variable without registry admission.