# SFI PROGRAM CONTROL PLANE

This directory is the durable coordination surface for SFI institutional implementation and operation. Chat sessions are replaceable; repository state, contracts, persisted state, CI and production evidence are authoritative.

## Canonical files

1. [`SFI-MASTER-PROGRAM.md`](./SFI-MASTER-PROGRAM.md) — constitutional target architecture and completion criteria.
2. [`SFI-CONTRACT-LOCK.md`](./SFI-CONTRACT-LOCK.md) — frozen shared schemas, authority classes, event taxonomy, namespaces and ownership rules.
3. [`DEPENDENCY-GRAPH.md`](./DEPENDENCY-GRAPH.md) — dependency and shared-owner rules.
4. [`CURRENT-STATE.md`](./CURRENT-STATE.md) — fresh reconstructable state and current round.
5. [`DECISIONS.md`](./DECISIONS.md) — canonical program decision ledger.
6. [`SFI-00-CONTROL-ROOM.md`](./SFI-00-CONTROL-ROOM.md) — integration-authority contract.
7. [`R4-INSTITUTIONAL-OPERATIONS.md`](./R4-INSTITUTIONAL-OPERATIONS.md) — R4 program-completion and founder-away operating regime.

## Canonical workstream ownership maps

- [`WS-01 · Cognitive Fabric`](./workstreams/WS-01-COGNITIVE-FABRIC.md)
- [`WS-02 · Twin + Method Lab`](./workstreams/WS-02-TWIN-METHOD-LAB.md)
- [`WS-03 · Discovery Mesh`](./workstreams/WS-03-DISCOVERY-MESH.md)
- [`WS-04 · Machine Interfaces`](./workstreams/WS-04-MACHINE-INTERFACES.md)
- [`WS-05 · Research Graph`](./workstreams/WS-05-RESEARCH-GRAPH.md)
- [`WS-06 · Material Audio`](./workstreams/WS-06-MATERIAL-AUDIO.md)
- [`WS-07 · External Identity`](./workstreams/WS-07-EXTERNAL-IDENTITY.md)
- [`WS-08 · Assurance + Release`](./workstreams/WS-08-ASSURANCE-RELEASE.md)

These files define ownership, invariant boundaries and Definitions of Done. They are not automatically active queues.

## Current operating mode

R1, R2 and R3 are complete. R3 has durable RETURN. R4 is active with two concurrent obligations:

```text
PROGRAM COMPLETION
+ INSTITUTIONAL OPERATIONS
```

Do not launch every workstream because a new round exists. SFI-00 reconstructs current state, classifies residual debt and triggers, and activates only bounded work for the existing owner.

```text
DECLARED PROGRAM GAP != NEEDS NEW TRIGGER
NEW UNPLANNED FEATURE == NEEDS EVIDENCE/TRIGGER
```

## Coordination rule

Do not coordinate cells by copying whole chat histories or founder memory.

Cross-cell state is communicated through:

```text
main
branches
PRs
issues
program documents
canonical workstream files
Supabase/migrations
CI
production and RETURN receipts
```

The founder should not be the scheduling bus between these surfaces.

## Completion language

Keep these distinct:

```text
DESIGNED
IMPLEMENTED
QA_PASS
MERGED
DEPLOYED
OBSERVED_IN_PRODUCTION
RETURN_PASS
```

No state advances merely because a chat says it did.
