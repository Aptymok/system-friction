# SFI PROGRAM DEPENDENCY GRAPH

**Contract:** `SFI-PROGRAM-DEPENDENCY-GRAPH-1.0`  
**Authority:** SFI-00 · CONTROL ROOM  
**Baseline:** `565ac410fceb56d86ff9d6eaec85b901d0d77248`

## 1. Core rule

Parallelism is allowed only when ownership and contracts are explicit.

A workstream must not wait unnecessarily for another workstream, but it must not consume an unstable contract as if it were canonical.

## 2. Topology

```text
                         MAIN BASELINE
                              │
                        CONTRACT LOCK
                              │
      ┌───────────────────────┼────────────────────────┐
      │                       │                        │
   WS-01                  WS-03                    WS-05
COGNITIVE FABRIC       DISCOVERY MESH          RESEARCH GRAPH
      │                       │                        │
      │                 ┌─────┴─────┐                  │
      │                 │           │                  │
      │               WS-04       WS-07               │
      │          MACHINE IFACES  EXTERNAL IDENTITY    │
      │                 │           │                  │
      ├──────────────┐  │           └──────────┬───────┘
      │              │  │                      │
    WS-02          WS-06│                      │
TWIN + LAB     MATERIAL AUDIO                  │
      │              │  │                      │
      └──────────────┴──┴──────────────────────┘
                              │
                            WS-08
                     ASSURANCE + RELEASE
                              │
                          SFI-00 MERGE
                              │
                         PRODUCTION
                              │
                           RETURN
```

WS-08 is active from the beginning; the graph above shows its release gate role, not a late start.

## 3. Dependency matrix

| Consumer | Dependency | Required state before consumption | Blocking? |
|---|---|---|---|
| WS-01 | Contract Lock | FROZEN | yes |
| WS-02 | cognitive passport + Twin invariants | FROZEN | only for runtime integration |
| WS-02 | existing Twin/Method Lab | INSPECTED | yes |
| WS-03 | canonical object + entity identity | FROZEN | yes |
| WS-04 | WS-03 semantic object read contract | STABLE PR or MERGED | yes for public MCP publication |
| WS-04 | WS-01 capability contract | STABLE PR or MERGED | yes for authenticated adaptive execution exposure |
| WS-05 | institution identity + publication object contract | FROZEN | yes |
| WS-06 | material rights boundary | FROZEN | yes |
| WS-06 | WS-01 passport/adaptive runtime | STABLE PR or MERGED | only for runtime capability integration |
| WS-07 | institution identity fingerprint | FROZEN | yes |
| WS-08 | all workstreams | PR READY | yes for merge |
| SFI-00 | WS-08 | PASS | yes for merge |

## 4. Work that can start immediately after this control plane merges

### Fully parallel

- WS-01: inspect and implement cognitive passport + adaptive runtime slices.
- WS-03: inspect public semantic owners and implement canonical-object/discovery slices.
- WS-05: inspect README/publication metadata and prepare citation/research graph artifacts.
- WS-07: inventory real external identities; do not fabricate account state.
- WS-08: define assurance gates and baseline production verification.

### Partially parallel

- WS-02: inspect Twin and Method Lab immediately; implementation may proceed inside owned code where it does not require unfinished runtime interfaces.
- WS-06: inspect current audio/FAD/Studio path immediately; implement registry/material contracts inside owned code after proving no duplicate owner.
- WS-04: inspect current external gateway/MCP-like surfaces immediately; public MCP adapters can be prepared but publication depends on stable semantic objects.

## 5. Integration order constraints

SFI-00 chooses actual merge order from fresh PR state, but the following constraints apply:

1. shared contract implementation before its external adapter;
2. database owner/migration before code that requires it, unless code is backward-compatible and disabled until schema exists;
3. public semantic owner before publishing registry integrations that expose it;
4. authority/governance implementation before execution-capable external adapter;
5. assurance gate in same PR or earlier than capability exposure;
6. no public external identity link in canonical `sameAs` until ownership is verified;
7. no DOI metadata in canonical public object until a real DOI exists;
8. no model/provider advertised as available until a credential/API canary proves availability;
9. no production claim before deployment receipt.

## 6. Shared-file conflict protocol

Shared files include but are not limited to:

- root layout/navigation;
- central SFI contracts;
- `epistemic_events` event semantics;
- public institution profile;
- `llms.txt` / `llms-full.txt` / `ai-index.json`;
- global OpenAPI merge sources;
- package scripts / workflow files;
- Supabase shared migrations/policies.

If two workstreams need the same shared file:

1. owner with earlier dependency writes the shared contract;
2. later consumer rebases after that PR or asks SFI-00 for integration sequencing;
3. do not independently produce competing edits and expect merge resolution to decide semantics.

## 7. Branch naming

Recommended long-lived workstream branches are coordination roots only; implementation should prefer bounded PR branches.

```text
ws01/<functional-slice>
ws02/<functional-slice>
ws03/<functional-slice>
ws04/<functional-slice>
ws05/<functional-slice>
ws06/<functional-slice>
ws07/<functional-slice>
ws08/<functional-slice>
```

Every branch starts from fresh `main` unless a dependency requires an explicit upstream PR branch and SFI-00 records that dependency.

## 8. Pull-request size policy

Do not create one PR per tiny file.

Do not create a workstream mega-PR.

A PR is a complete vertical function with:

- preflight;
- implementation;
- persistence if required;
- authority boundary;
- UI/API if required;
- QA;
- documentation;
- rollback.

Examples:

### WS-01

```text
PR A cognitive passport registry + validation
PR B adaptive capability broker + event lineage
PR C dynamic task graph + continuation
PR D operation-level model routing
PR E ephemeral authority grant enforcement
```

### WS-03

```text
PR A canonical object registry + entity graph
PR B canonical concept/method/instrument projections + JSON-LD
PR C Evidence Capsules + public-state gate
PR D feeds/sitemaps/IndexNow/crawler policy
PR E discovery telemetry + ROOT control plane
```

### WS-06

```text
PR A instrument/rights registry
PR B SFZ render adapter + deterministic receipts
PR C ephemeral material workspace
PR D audio capabilities + closed-loop evaluation
PR E authenticated audio MCP/external tools
```

## 9. External dependencies

External systems are not assumed available merely because the plan names them.

Human/account dependent:

- LinkedIn Page;
- Medium account settings;
- GitHub Organization reservation;
- Zenodo connection;
- ORCID researcher records;
- ResearchGate;
- Hugging Face Organization;
- YouTube;
- Bluesky domain handle;
- Mastodon identity;
- email sender/domain;
- Postman workspace;
- OSF identity/registration;
- future ROR request.

A code workstream must degrade cleanly when an external identity is `UNCLAIMED`.

## 10. Deadlock rule

A workstream must not block on a future external platform if it can complete a provider-neutral internal contract today.

Examples:

- implement publication receipt before LinkedIn API access;
- implement model broker before Astra availability;
- implement MCP server before registry approval;
- implement DOI fields before a specific DOI exists, while leaving values null until real;
- implement instrument registry before a complete proprietary sample library exists.

This permits maximum parallelism without fabricating external reality.
