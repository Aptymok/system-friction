# SFI PROGRAM CONTROL PLANE

This directory is the durable coordination surface for the distributed SFI implementation program. Chat sessions are replaceable; these contracts and repository/infrastructure state are not.

## Canonical files

1. [`SFI-MASTER-PROGRAM.md`](./SFI-MASTER-PROGRAM.md) — full target architecture, program phases and definition of completion.
2. [`SFI-CONTRACT-LOCK.md`](./SFI-CONTRACT-LOCK.md) — frozen shared schemas, authority classes, event taxonomy, namespaces and ownership rules.
3. [`DEPENDENCY-GRAPH.md`](./DEPENDENCY-GRAPH.md) — parallelization, dependencies, shared-file conflict protocol and integration order.
4. [`CURRENT-STATE.md`](./CURRENT-STATE.md) — reconstructable program state; update as actual state advances.
5. [`DECISIONS.md`](./DECISIONS.md) — canonical program decision ledger.
6. [`SFI-00-CONTROL-ROOM.md`](./SFI-00-CONTROL-ROOM.md) — integration-authority contract and copy/paste dispatch prompt.

## Workstream cells

- [`WS-01 · Cognitive Fabric`](./workstreams/WS-01-COGNITIVE-FABRIC.md)
- [`WS-02 · Twin + Method Lab`](./workstreams/WS-02-TWIN-METHOD-LAB.md)
- [`WS-03 · Discovery Mesh`](./workstreams/WS-03-DISCOVERY-MESH.md)
- [`WS-04 · Machine Interfaces`](./workstreams/WS-04-MACHINE-INTERFACES.md)
- [`WS-05 · Research Graph`](./workstreams/WS-05-RESEARCH-GRAPH.md)
- [`WS-06 · Material Audio`](./workstreams/WS-06-MATERIAL-AUDIO.md)
- [`WS-07 · External Identity`](./workstreams/WS-07-EXTERNAL-IDENTITY.md)
- [`WS-08 · Assurance + Release`](./workstreams/WS-08-ASSURANCE-RELEASE.md)

Each workstream file contains its own copy/paste dispatch prompt for a new specialized chat.

## Launch order

### First

Open `SFI-00 · CONTROL ROOM` using the prompt at the bottom of `SFI-00-CONTROL-ROOM.md`.

SFI-00 must first reconstruct `main`, verify the bootstrap PR/control-plane is merged, and confirm the production state of the baseline merge.

### Wave 1 — may run simultaneously after control-plane merge

```text
SFI-01 · COGNITIVE FABRIC
SFI-03 · DISCOVERY MESH
SFI-05 · RESEARCH GRAPH
SFI-07 · EXTERNAL IDENTITY
SFI-08 · ASSURANCE + RELEASE
```

### Wave 1B — may start inspection immediately; integrate against frozen dependencies

```text
SFI-02 · TWIN + METHOD LAB
SFI-06 · MATERIAL AUDIO
```

### Wave 2

```text
SFI-04 · MACHINE INTERFACES
```

WS-04 may inspect/prepare immediately, but public machine publication consumes stable WS-03 semantic-object contracts and authenticated adaptive execution consumes stable WS-01 contracts.

## Operational rule

Do not coordinate cells by copying whole chat histories.

Cross-cell state is communicated through:

```text
main
branches
PRs
program documents
workstream files
Supabase/migrations
CI
deployment receipts
```

## Completion language

Keep these distinct:

```text
DESIGNED
IMPLEMENTED
QA_PASS
MERGED
DEPLOYED
OBSERVED_IN_PRODUCTION
```

A workstream is not complete merely because a chat says it finished.
