# SFI PROGRAM CURRENT STATE

**Updated:** 2026-09-05 UTC  
**Authority:** SFI-00 · CONTROL ROOM  
**Rule:** fresh repository/CI/production evidence overrides this summary.

## 1. Ronda 1 — COMPLETE

Integrated with exact-head guards:

- #369 WS-03 → `5ee9005d566a9f88d89b36976712294a73fbd833`
- #367 WS-01 → `06ae7b4c1beed5a0fe0a8f832831ff7c3a6d5522`
- #371 WS-05 → `b3deadf51f4c1c3c1ff81234a52a4c9b7c2d3780`
- #370 WS-07 → `f4f651d8b95aae7c2b9b49e6a88351d78658b6d4`
- #368 WS-08 → `d10d3b6273a3f7275ce8c23d3c18a223d212679b`

Ronda 1 contract delta: `NONE`.  
Authority expansion: `NONE`.

## 2. #366 production closure

Issue #366 is `CLOSED / COMPLETED`.

Correction deployment:

- source #369 HEAD `c2a0614568bd428da9374fe7f1eda0d572e9f8c6`;
- merge SHA `5ee9005d566a9f88d89b36976712294a73fbd833`;
- `SFI Vercel Prebuilt Production` run `33944928325`: SUCCESS.

Durable WS-08 production RETURN:

- harness-code HEAD `bc53bcd899286e8c44fb7846d75c07289454a89b`;
- smoke run `33949491992` / #11: SUCCESS;
- artifact `9964354481 / sfi-production-observatory-smoke-33949491992`;
- digest `sha256:9087e2623449dddbfd911dd37310934c8fd3130a092cb571b558c6ca5fab6327`;
- SFI Verify `33949491991` / #2376: SUCCESS.

Observed:

```text
SSR LOADING semantics PASS
world AVAILABLE
state DEGRADED
timeline AVAILABLE
hydrated browser PASS
UNAVAILABLE != ZERO PASS
AVAILABLE + authoritative empty filtered view = 0 PASS
hypothesis absence boundary PASS
bounded reads world/state/timeline = 2/2/2
harness retries = 0
retry amplification = NONE
5xx/network failures attributable = NONE
PRODUCTION RETURN = PASS
OBSERVED_IN_PRODUCTION = YES
```

Durable assurance owner now lives in `main`:

```text
.github/workflows/sfi-production-observatory-smoke.yml
scripts/qa-sfi-production-observatory-smoke.mjs
docs/program/workstreams/WS-08-ASSURANCE-RELEASE.md
docs/program/workstreams/WS-08-PRODUCTION-RETURN-366.md
```

## 3. Frozen contracts

```text
SFI-PROGRAM-CONTRACT-LOCK-1.0
SFI-COGNITIVE-PASSPORT-1.0
SFI-CAPABILITY-REQUEST-1.0
SFI-CANONICAL-OBJECT-1.0
```

Protected invariants remain unchanged, including:

```text
MODEL OUTPUT != OBSERVATION
MISSING remains MISSING
NOT_OBSERVED remains NOT_OBSERVED
UNAVAILABLE != ZERO
AUTHORITY NEVER EXPANDS from model capability/confidence
EXTERNAL REPRESENTATION NEVER becomes CANON
DISCOVERY != EXECUTION
ONE INTERACTIVE NEED -> ONE AUTHORITATIVE READ PER DATA DOMAIN
```

## 4. Ronda 2 — SEMANTIC CORE

Ronda 2 is released from the fresh `main` containing this reconciliation commit.

To reduce coordination cost, use staged concurrency.

### R2-A — ACTIVE

Only these implementation owners run in parallel:

- WS-01 · Cognitive Fabric — Slice B: Capability Broker.
- WS-03 · Discovery Mesh — Canonical Object Registry / canonical entity-object plane.

WS-08 remains independently active only as assurance/release authority.

### R2-B — WAITING

Do not activate until SFI-00 integrates the relevant R2-A owner:

- WS-05 · Research Graph — research/publication projection over canonical object plane.
- WS-07 · External Identity — identity coherence over canonical entity/object plane.

### Deferred

Do not formally activate yet:

- WS-02 · Twin + Method Lab;
- WS-04 · Machine Interfaces;
- WS-06 · Material Audio.

## 5. R2-A scope

### WS-01

Implement one bounded complete Capability Broker PR:

```text
CAPABILITY_REQUEST
→ governed disposition
→ ADMIT | DENY | DEFER | ALREADY_SATISFIED | HUMAN_AUTHORITY_REQUIRED | EVIDENCE_REQUIRED
→ execute only when admitted
→ lineage receipt
```

Requirements:

- request != authorization;
- verify canonical passport/source contract;
- deduplicate equivalent trajectory requests;
- check scope, authority ceiling, evidence, budget and depth;
- use existing lineage/event owner;
- no self-grant;
- no second orchestrator/registry/router/event store/task graph;
- no Slice C/D/E/F expansion.

### WS-03

Implement one bounded complete Canonical Object Plane PR:

- one `SFI-CANONICAL-OBJECT-1.0` owner;
- explicit publication/publicability state;
- frozen object taxonomy;
- canonical entity/object relationship;
- stable canonical URL semantics;
- reuse existing institution profile, sitemap and machine-index owners;
- no private/internal event auto-publication;
- no fabricated `sameAs`;
- no duplicate sitemap/AI-index/institution profile;
- no broad semantic-page/SEO expansion in this slice.

### WS-08

Independently assure exact PR heads. Do not implement product semantics and do not merge.

## 6. R2-A integration rule

WS-01 and WS-03 branch independently from the same fresh R2 baseline and produce one vertical PR each. They stop at PR-ready.

WS-08 assures exact heads. SFI-00 integrates green immutable heads. After both are stable in `main`, SFI-00 releases R2-B to WS-05 and WS-07.

## 7. Current handoff

```text
RONDA 1 = COMPLETE
#366 = CLOSED / COMPLETED
PRODUCTION RETURN = PASS
OBSERVED_IN_PRODUCTION = YES
R1 FINAL ASSURANCE MERGE = d10d3b6273a3f7275ce8c23d3c18a223d212679b
CONTRACT DELTA = NONE
AUTHORITY EXPANSION = NONE
HUMAN DECISIONS REQUIRED = NONE

R2-A = RELEASED
ACTIVE = WS-01, WS-03, WS-08
WAITING = WS-05, WS-07
DEFERRED = WS-02, WS-04, WS-06
```

Fresh state always overrides this file.
