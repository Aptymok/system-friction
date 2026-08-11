# SFI Canonical Evidence Graph — 2026-08-10

## Invariant

One evidence object is represented once in the active graph, independently of how many persistence tables reference it.

Primary identity rule:

```text
1 evidence_hash = 1 canonical evidence object = 1 canonical evidence node
```

`root_evidence_entries` and `sfi_evidence_ledger` are provenance surfaces. They do not create separate epistemic objects when they share the same evidence hash.

## Source of truth vs projection

Preserved source-of-truth surfaces:

- `root_evidence_entries`
- `sfi_evidence_ledger`
- Cognitive Twin canonical tables
- domain-specific primary records

Rebuildable projection:

- `graph_nodes`
- `graph_edges`

The reconciler may remove its own previously managed projection and rebuild it from primary evidence. It must not delete source evidence.

## Graph node classes

- `evidence`: one canonical evidence object.
- `module`: declared taxonomy/context node; not additional evidence.
- `case`: declared case/context node; not additional evidence.
- `attractor`: declared attractor state; does not prove convergence.

Source URLs and database table names remain provenance attributes. They are not emitted as cognitive nodes solely because they exist in storage.

## Display contract

ROOT distinguishes:

- `OBJ`: canonical evidence objects.
- `N`: graph nodes, including context nodes.
- `E`: explicit graph relations.

Therefore `OBJ`, `N`, and `E` are intentionally different quantities.

The Cognitive Twin panel reads `sfi_cognitive_twin_*` state. Predictive hypotheses remain in the Predictive Engine and are not relabeled as Cognitive Twin memory.

## Predictive legacy boundary

Legacy prediction rows that are placeholders or structurally empty are retained in storage for forensic continuity but are excluded from the active ROOT predictive view. Current filtering excludes short placeholder records such as `x`, `test`, `prueba`, `placeholder`, `n/a`, and exact textual duplicates.

## Reconciliation behavior

`POST /api/root/evidence/reconcile` is explicit, auditable and idempotent at the canonical-object level. It:

1. reads primary ROOT and SFI evidence rows;
2. resolves canonical evidence objects;
3. removes the reconciler-managed graph projection;
4. writes one evidence node per canonical object;
5. creates declared module/case context relations;
6. links explicit evidence references to attractors where present;
7. reports object, node, edge, removal and warning counts to ROOT audit.

Reading ROOT alone does not mutate the graph.
