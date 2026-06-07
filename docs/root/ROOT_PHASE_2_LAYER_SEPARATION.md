# ROOT Phase 2 Layer Separation

Scope: central pure classification only. No visual component was modified. No data was moved, deleted, normalized, migrated or written to Supabase.

## Objective

Create the central operational layer classification for ROOT:

- Archivo SFI: what exists in the corpus.
- Observatorio Vivo: what is operating now.
- Atractor: what has directional weight.
- Sandbox: what exists but must not affect reality.
- Auditoria Tecnica: what happened internally.

## Delivered Files

- `src/lib/root/rootLayers.ts`
- `src/lib/root/rootLayerLabels.ts`

## Classification Rules Implemented

The classifier is pure and deterministic. It accepts any visible item with optional fields such as `type`, `kind`, `source`, `status`, `runtimeState`, `tags`, `layer`, `layers`, `createdAt`, `updatedAt`, `observedAt`, `directionalWeight`, `evidenceWeight`, `confidence`, `verified`, `simulated`, and `test`.

Precedence:

1. Explicit sandbox/test/simulation indicators classify as Sandbox.
2. Explicit technical trace/log/table/endpoint/audit indicators classify as Auditoria Tecnica.
3. Directional weight, attractor markers or external validation classify as Atractor.
4. Recent or active evidence, mutation, proposal, WSV, MIHM, signal, pattern or event classify as Observatorio Vivo.
5. Catalogs, documents, frontmatter, historical patterns and static datasets classify as Archivo SFI.
6. Unknown items fall back to Archivo SFI with low confidence, because unknown material must not silently become live evidence.

## Human Verification Matrix

| Element | Expected layer | Why |
| --- | --- | --- |
| Static SFI document catalog item | Archivo SFI | It states what exists in the corpus. |
| Recent root evidence entry with known origin | Observatorio Vivo | It is active evidence in current operation. |
| Proposal with accepted status but no execution evidence | Observatorio Vivo | It is open decision state, not reality modified. |
| Item with directional weight | Atractor | It affects direction, but only because weight is present. |
| Simulated WSV or test node | Sandbox | It must not sustain regime. |
| Root audit event or endpoint log | Auditoria Tecnica | It records internal trace only. |
| Unknown object with no origin | Archivo SFI | Conservative fallback prevents false liveness. |

## Boundaries Preserved

- Archivo is not Vivo.
- Vivo is not Atractor.
- Sandbox does not touch regime.
- Auditoria does not govern the main experience.
- Accepted proposal is not executed action.
- No WSV, MIHM, RCE, debt or metric value was hardcoded.
- No state translation from Phase 3 was implemented.

## Tests

No test file was added because this repository currently has no existing `*.test.ts` or `*.spec.ts` pattern. The classifier is exported as pure functions and can be covered when a test convention is introduced.

## Phase 2 Closure

Closed. Central layer classification exists and is documented. It is not yet wired into visual components, by design.
