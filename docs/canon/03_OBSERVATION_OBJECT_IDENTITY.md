# 03 · Observation Object Identity

**Status:** CANONICAL  
**Version:** 2026-08-06.object-identity.v1

No metric exists without an observed object. Each reading must identify:

- `object_id`;
- `object_type`;
- owner or institutional scope;
- temporal scope;
- method and instrument;
- source lineage.

Canonical object types include person, session, bounded system, artifact, signal, phenomenon, case, organization, world context and SFI institution.

A reading cannot be reassigned to another object merely because the variables have the same names. IHG, NTI or LDI measured for an artifact do not become institutional indicators. A personal session cannot stand in for a global human state. A world-context vector cannot stand in for SFI health.

When legacy data lacks sufficient object identity, the record is `DEGRADED` and cannot be promoted until context is recovered. The correct repair is contextual migration, not a blind rename.

Object identity precedes formula selection. If the object is unknown, the method selection result must be `AMBIGUOUS` or `BLOCKED`.