# SFI PROGRAM CURRENT STATE

**Updated:** 2026-09-04 / integration continued into 2026-09-05 UTC  
**Program authority:** SFI-00 · CONTROL ROOM  
**Source of truth:** fresh GitHub/CI/production evidence overrides this file when newer.

## 1. Current integration baseline

Pre-reconciliation `main` SHA:

`f4f651d8b95aae7c2b9b49e6a88351d78658b6d4`

Ronda 1 Slice A integration admitted by SFI-00 with exact-head guards:

| PR | Workstream | Source HEAD | Merge SHA | Integration state |
|---|---|---|---|---|
| #369 | WS-03 · Discovery Mesh | `c2a0614568bd428da9374fe7f1eda0d572e9f8c6` | `5ee9005d566a9f88d89b36976712294a73fbd833` | MERGED / DEPLOYED |
| #367 | WS-01 · Cognitive Fabric | `dd66dbacf0bd00571bd39f68a2ee9ecf9d5216e9` | `06ae7b4c1beed5a0fe0a8f832831ff7c3a6d5522` | MERGED / DEPLOYED |
| #371 | WS-05 · Research Graph | `f548f55f7642047bea61cb9ecdfd659c27ef4b5f` | `b3deadf51f4c1c3c1ff81234a52a4c9b7c2d3780` | MERGED / DEPLOYED |
| #370 | WS-07 · External Identity | `56e69cda8b7bc456fd55f07b8fecee31ed25cbce` | `f4f651d8b95aae7c2b9b49e6a88351d78658b6d4` | MERGED / docs-only |

No contract delta or ROOT authority expansion was admitted by these Slice A integrations.

## 2. Production and CI receipts

### #369 / public availability semantics

Exact production workflow:

- workflow: `SFI Vercel Prebuilt Production`;
- run: `33944928325`;
- exact merge SHA: `5ee9005d566a9f88d89b36976712294a73fbd833`;
- conclusion: `success`;
- deployment emitted: `https://system-friction-d9c5hxi2f-systemfrictioninstitute.vercel.app`;
- canonical alias reached Ready: `https://www.systemfriction.org`.

This establishes `DEPLOYED`, not `OBSERVED_IN_PRODUCTION`.

### #367 / Cognitive Passport Registry

Exact post-merge SHA:

`06ae7b4c1beed5a0fe0a8f832831ff7c3a6d5522`

Post-merge evidence:

- `SFI Vercel Prebuilt Production` run `33946777293`: SUCCESS;
- `SFI Verify` run `33946777270`: core boundaries/build SUCCESS;
- Studio audio gates: SUCCESS;
- canonical preflight, cognitive passport registry, AI governance, temporal surfaces, runtime read-plane, typecheck and build: PASS.

### #371 / repository citation metadata

Exact post-merge SHA:

`b3deadf51f4c1c3c1ff81234a52a4c9b7c2d3780`

Post-merge evidence:

- `SFI Vercel Prebuilt Production` run `33946952943`: SUCCESS;
- `SFI Verify` run `33946952940`: core boundaries/build SUCCESS;
- Studio audio gates: SUCCESS.

### #370 / external identity inventory

Exact post-merge SHA:

`f4f651d8b95aae7c2b9b49e6a88351d78658b6d4`

Post-merge evidence:

- `SFI Verify` run `33947135939`: core boundaries/build SUCCESS;
- Studio audio gates: SUCCESS;
- no production deployment was required/observed for this documentation-only delta.

## 3. Issue #366 remains open by design

Corrective issue:

`#366 [WS-03/WS-08] Eliminate public false-zero during Observatory availability`

Repository/QA correction is integrated. Independent pre-merge assurance passed. Exact deployment succeeded.

However, production RETURN is still:

`NOT_OBSERVED`

WS-08 post-deploy assurance record is PR #368, currently OPEN / DRAFT, HEAD:

`254bfd41a0e6e708d5544c1c66c04820a8937f4d`

WS-08 recorded:

```text
PRODUCTION RETURN: NOT_OBSERVED
#366 PRODUCTION ASSURANCE: NOT_OBSERVED
DEPLOYED != OBSERVED_IN_PRODUCTION
```

The available execution surfaces could not complete a fresh controlled live smoke against the canonical Observatory. SFI-00 independently attempted available HTTP/browser/deployment access paths and likewise did not obtain sufficient fresh live observation. This is an access/tool limitation, not evidence of product success or product failure.

Therefore:

- #366 must remain OPEN;
- PR #368 must remain an assurance record rather than be merged as if it contained a production PASS;
- deterministic QA must not be substituted for live RETURN;
- `OBSERVED_IN_PRODUCTION` must remain false for this gate.

Required remaining evidence:

```text
EXACT DEPLOYMENT
→ FRESH /observatory
→ /api/observatory/world
→ /api/observatory/state
→ /api/observatory/timeline
→ NO FALSE ZERO
→ BOUNDED READ-PLANE OBSERVATION
→ PRODUCTION RETURN
```

## 4. Ronda 1 workstream state

| Workstream | State after integration | Next safe action |
|---|---|---|
| SFI-00 | INTEGRATING / RELEASE_BLOCKED | preserve exact integrated baseline; close R1 only after #366 production RETURN |
| WS-01 | MERGED | freeze Slice A; Capability Broker / Slice B waits formal R2 start |
| WS-02 | NOT_STARTED for this program wave | waits formal next-round activation |
| WS-03 | MERGED / DEPLOYED | freeze Slice A; #366 live production observation remains release gate |
| WS-04 | READY_INSPECTION | publication/adaptive execution remains dependency-bound |
| WS-05 | MERGED | freeze Slice A; no DOI/ORCID/ROR/Zenodo promotion without evidence |
| WS-06 | READY_INSPECTION | runtime integration waits on admitted dependencies |
| WS-07 | MERGED | freeze Slice A; no external claiming or sameAs promotion without evidence |
| WS-08 | BLOCKED_EXTERNAL | pre-merge PASS; post-deploy RETURN NOT_OBSERVED; PR #368 remains draft |

## 5. Integrated Slice A invariants

### WS-01

- one canonical cognitive execution registry;
- one runtime passport projection owner;
- one canonical operation/model-requirements owner;
- EvidenceHunter remains non-observational;
- RETURN obligations remain source-derived;
- human confirmation cannot be weakened;
- no Capability Broker, grants or new persistence admitted in Slice A.

### WS-03

- explicit availability semantics preserve `UNAVAILABLE != ZERO` in deterministic QA;
- numeric zero is only valid under authoritative `AVAILABLE`;
- co-rendered `ObservatoryInterpretiveFlow` consumes canonical world + availability;
- one authoritative read owner per domain and one polling owner remain protected;
- no retry amplification or N+1 admitted by Slice A.

### WS-05

- repository `CITATION.cff` established under fail-closed validation;
- `Aptymok` remains the observed alias rather than an inferred legal/scholarly name;
- `.zenodo.json` remains absent;
- DOI, ORCID and ROR are not fabricated;
- publication/release/license state is not promoted without evidence or decision.

### WS-07

- canonical entity remains `https://systemfriction.org/#sfi`;
- controlled GitHub repository asset does not become institutional `sameAs` by inheritance;
- `CANONICAL SAMEAS READY = none observed`;
- similarly named external entity remains `COLLISION_CANDIDATE / DISAMBIGUATION_RISK`, not an observed collision;
- no external account, DNS or claiming mutation was admitted.

## 6. Known separate defects / routing items

These are not silently absorbed into completed Slice A work:

- repository Website/Homepage remains legacy `https://system-friction.vercel.app` rather than canonical `https://systemfriction.org`;
- pre-existing public `ResearchOrganization.sameAs` contains the repository URL even though repository control does not establish institutional identity equivalence;
- #366 live production smoke remains unobserved;
- remaining baseline ROOT/report/Library/Twin Learning/navigation/log/read-plane observations are not presumed complete unless fresh evidence establishes them.

## 7. Contract state

Program contract remains frozen:

`SFI-PROGRAM-CONTRACT-LOCK-1.0`

Canonical passport remains:

`SFI-COGNITIVE-PASSPORT-1.0`

No Ronda 1 Slice A merge changed the institutional authority model.

Protected invariants continue to include:

```text
MODEL OUTPUT != OBSERVATION
SIMULATION != OBSERVATION
CONTEXT != EVIDENCE
SEARCH RESULT = SOURCE CANDIDATE until admitted
MISSING remains MISSING
NOT_OBSERVED remains NOT_OBSERVED
UNAVAILABLE != ZERO
TWIN PROPOSAL != INSTITUTIONAL AUTHORIZATION
EXECUTION != SUCCESS
AUTHORITY NEVER EXPANDS from model capability/confidence
PRIVATE STATE NEVER becomes public by inheritance
DISCOVERY != EXECUTION
```

## 8. SFI-00 current handoff

```text
PROGRAM BASE SHA
1bd890c8a2ec784ad87d73eac6d19a294e050543

PRE-RECONCILIATION MAIN SHA
f4f651d8b95aae7c2b9b49e6a88351d78658b6d4

MERGES COMPLETED
#369 → 5ee9005d566a9f88d89b36976712294a73fbd833
#367 → 06ae7b4c1beed5a0fe0a8f832831ff7c3a6d5522
#371 → b3deadf51f4c1c3c1ff81234a52a4c9b7c2d3780
#370 → f4f651d8b95aae7c2b9b49e6a88351d78658b6d4

OPEN ASSURANCE PR
#368 OPEN / DRAFT
HEAD 254bfd41a0e6e708d5544c1c66c04820a8937f4d
POST-DEPLOY RESULT NOT_OBSERVED

OPEN RELEASE GATE
#366 OPEN
production RETURN not observed

CONTRACT CHANGES
None.

AUTHORITY EXPANSION
None.

HUMAN DECISIONS REQUIRED
None for the current technical gate.

FORMAL ROUND STATE
Ronda 1 implementation/integration complete for WS-01/03/05/07.
Ronda 1 release closure BLOCKED_EXTERNAL on #366 live production observation.
Formal Ronda 2 must not be declared started while this release gate remains unclosed.

NEXT SAFE ACTION
Obtain a fresh bounded canonical production observation for #366. If PASS, persist WS-08 production RETURN, close #366, reconcile #368, establish the consolidated Ronda 1 baseline, then activate formal Ronda 2 from one shared MAIN SHA.
```

## 9. Workstream handoff format

Every workstream records:

```text
BASE SHA
BRANCH
COMMITS
FILES CHANGED
MIGRATIONS
EVENTS ADDED
ROUTES ADDED
CONTRACTS TOUCHED
QA EXECUTED
QA RESULT
KNOWN DEFECTS
UNRESOLVED DEPENDENCIES
PR
DEPLOYMENT STATE
NEXT SAFE ACTION
```

Fresh repository/infrastructure evidence always overrides this file.
