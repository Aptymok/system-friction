# WS-03 · DISCOVERY MESH

**Mission:** turn SFI from a site that is machine-readable after arrival into a canonically identifiable institution that can be independently reconstructed through search, AI retrieval, research graphs, external references and public machine interfaces without creating competing canons.

**Initial baseline:** `565ac410fceb56d86ff9d6eaec85b901d0d77248`  
**Integration authority:** SFI-00  
**Self-merge:** FORBIDDEN

## 1. Existing owners to inspect and absorb

Before writing code inspect:

- `src/lib/public/institutionProfile.ts`;
- `/institution`;
- `/llms.txt`, `/llms-full.txt`;
- `/ai-index.json`;
- `/ai-policy`;
- `/field-schema.json`;
- `src/app/robots.ts`;
- `src/app/sitemap.ts`;
- root layout metadata/JSON-LD/OpenGraph;
- public observatory/history/timeline routes;
- Library/public research assets;
- current public report/research/dataset representations.

Do not create a second public institution profile, second sitemap owner or duplicate machine index.

## 2. Canonical identity

```text
System Friction Institute
SFI
https://systemfriction.org
https://systemfriction.org/#sfi
```

External nodes must not use `SFI` as the only identifier.

Current digital-facing descriptor:

`Evidence-governed observability and governed AI interaction for complex sociotechnical systems.`

Institution-wide descriptor:

`System Friction Institute studies how friction becomes observable, persistent and actionable across complex systems through evidence, governed inference, intervention and RETURN.`

## 3. Target outcome

```text
ONE CANONICAL OBJECT
        │
        ├─ HTML
        ├─ JSON-LD
        ├─ machine JSON
        ├─ RSS/Atom/JSON Feed
        ├─ MCP resource
        ├─ external distribution drafts/receipts
        └─ citation metadata where appropriate
```

External representations point back to the canonical object and never redefine it.

## 4. Owned implementation domain

Primary ownership:

```text
src/lib/discovery/**
canonical public object registry/projections
concept/method/instrument public pages
discovery feeds/sitemaps/IndexNow integration
discovery telemetry
/root/discovery
```

Shared public metadata files require sequencing with SFI-00/WS-04/WS-05.

Potential persistence owners only after duplicate-owner preflight:

```text
sfi_canonical_objects
sfi_external_nodes
sfi_external_representations
sfi_discovery_queries
sfi_discovery_query_runs
sfi_entity_collisions
```

## 5. Required functional slices

### Slice A — Canonical Object Registry

Implement object types:

```text
CONCEPT METHOD INSTRUMENT OBSERVATION DATASET REPORT PAPER SOFTWARE RELEASE RETURN PUBLICATION
```

Required fields follow `SFI-CANONICAL-OBJECT-1.0`.

No public URL exists merely because an internal event exists. Publication state must be explicit.

### Slice B — Semantic Entity Layer

Create/absorb canonical routes for at least:

```text
/concepts/system-friction
/concepts/observation
/concepts/evidence
/concepts/missing
/concepts/inference
/concepts/return
/concepts/authority-envelope
/concepts/governed-memory
/concepts/model-output-is-not-observation
/methods/mihm
/methods/mop-h
/methods/sfs
/instruments/worldspect
/instruments/world-vector
/instruments/atlas
/instruments/cognitive-twin
/instruments/method-lab
```

Each public object must provide:

- definition;
- version/date;
- epistemic status where relevant;
- related concepts;
- source/citation refs;
- limitations/MISSING where applicable;
- machine representation;
- stable canonical URL.

No 100-page SEO filler and no thousands of thin pages.

### Slice C — Evidence Capsules

Eligible public objects such as Observation/RETURN/Publication/Release may project a small persistent capsule with:

```text
ID TYPE STATE OBJECT TIME CLAIM EVIDENCE METHOD LIMITATIONS MISSING RELATED LINEAGE VERSION CANONICAL URL
```

Publication gate must check:

```text
privacy
rights
security
epistemic state
lineage
identity
license
```

### Slice D — JSON-LD by object type

Use appropriate types, e.g.:

```text
Organization / WebSite
DefinedTermSet / DefinedTerm
ScholarlyArticle
Dataset
SoftwareSourceCode / SoftwareApplication
Report / CreativeWork
```

Avoid a generic identical JSON-LD blob on every route.

### Slice E — Bilingual canonicalization

Implement coherent EN/ES localized canonical strategy with:

```text
canonical
hreflang=en
hreflang=es
hreflang=x-default
```

Do not canonicalize a complete localized page to another language simply to reduce duplication.

### Slice F — Discovery Emitter

A public object mutation emits/updates:

```text
page
sitemap lastmod
RSS
Atom
JSON Feed
IndexNow notification
llms/AI index resource map
MCP resource availability
publication/discovery receipt
```

IndexNow failure must not falsely mark the object unpublished; it is a distribution failure state.

### Slice G — Crawler Policy

Separate:

```text
SEARCH DISCOVERY
MODEL TRAINING / DATA REUSE
PRIVATE
```

Search-discovery policy should explicitly handle Googlebot, Bingbot, OAI-SearchBot and PerplexityBot on public surfaces.

Training/data-reuse bots such as GPTBot/CCBot/ClaudeBot/Google-Extended require explicit institutional policy rather than accidental `Allow:*` inheritance.

Private/ROOT/authenticated material remains out of public discovery.

### Slice H — Discovery Control Plane

`/root/discovery` must expose:

```text
ENTITY HEALTH
CANONICAL OBJECTS
EXTERNAL NODES
PROPAGATIONS
SEARCH HEALTH
AI DISCOVERY
ACADEMIC GRAPH
COLLISIONS
CRAWLERS
DOIs
FEEDS
MCP
FAILED PUBLICATIONS
```

No heavy polling fanout; preserve read-plane discipline.

### Slice I — Query Graph and Metrics

Persist a durable non-branded query corpus (target 200+, but only real meaningful queries) mapped to concepts/intents.

Metrics:

```text
UDR
EIC
IRD
ACR-R
ACR-A
ACR-C
ECR-NAME
ECR-DOMAIN
ECR-METHOD
ECR-ENTITY
MPD
ERR
```

Measurement records are observations of retrieval tests, not claims of universal ranking.

## 6. Public machine resources synchronization

Existing owners must remain synchronized:

```text
/llms.txt
/llms-full.txt
/ai-index.json
/ai-policy
/field-schema.json
/openapi.json
/api/external/v1/manifest
```

Correct any stale naming that treats ROOT as the Observatory after verifying current source.

## 7. False-zero invariant

Public metrics must represent availability separately from value.

Only a successful query whose actual count is zero may render numeric zero.

```text
AVAILABLE + 0 = 0
DEGRADED = unavailable/degraded indicator
UNAVAILABLE = unavailable indicator
```

Never `UNAVAILABLE → 0`.

## 8. Forbidden outcomes

- twenty competing content canons;
- fabricated external accounts in `sameAs`;
- automatic publication of private events;
- keyword-stuffed thin pages;
- hidden training-crawler policy;
- duplicated sitemap/AI-index owner;
- follower count as primary success metric;
- invented DOI/ROR/ORCID;
- external platform text silently becoming the canonical definition.

## 9. QA gates

Required:

```text
SFI-DISCOVERY-INTEGRITY-1.0
SFI-ENTITY-COHERENCE-1.0
SFI-PUBLIC-EPISTEMIC-BOUNDARY-1.0
SFI-DISCOVERY-NO-DUPLICATE-CANON-1.0
```

Test at least:

- HTTP 200/public SSR readability;
- title/description/canonical/hreflang;
- JSON-LD parse and object-specific schema;
- sitemap membership only for eligible URLs;
- feed entries point to canonical objects;
- no private route/object appears;
- no false zero;
- identity fingerprint coherent;
- no unverified external node emitted in canonical `sameAs`;
- Discovery Control Plane does not create duplicate read amplification.

## 10. Definition of done

WS-03 is complete when SFI has one canonical semantic object layer, controlled Evidence Capsules, object-specific JSON-LD, bilingual canonicalization, discovery emitter, crawler policy, query graph, metrics/control plane and synchronized machine resources, with all publicability/authority/privacy boundaries enforced.

## 11. Handoff

```text
BASE SHA
BRANCH
COMMITS
CANONICAL OBJECT TYPES
PUBLIC ROUTES
MIGRATIONS
FEEDS/SITEMAPS
CRAWLER POLICY
METRICS
CONTRACT DELTAS
QA
KNOWN DEFECTS
PR
NEXT SAFE ACTION
```

## 12. Active corrective slice — #366 Observatory availability

**State:** `PR_OPEN`  
**Issue:** `#366 [WS-03/WS-08] Eliminate public false-zero during Observatory availability`  
**Base:** `1bd890c8a2ec784ad87d73eac6d19a294e050543`  
**Branch:** `ws03/366-observatory-availability`  
**PR:** `#369`  
**Integration authority:** SFI-00; WS-03 self-merge remains forbidden.

### Owner reconstruction

The canonical public Observatory remains `src/components/sfi/ObservatoryConsole.tsx` over the existing `/api/observatory/world`, `/api/observatory/state`, and `/api/observatory/timeline` reads. The UI retains one `Promise.all` and one bounded `setInterval(pull,20000)` owner. No additional endpoint, poller, persistence owner, or data-domain read was introduced.

### Corrective semantics

The existing read result is now classified as:

```text
LOADING
AVAILABLE
DEGRADED
UNAVAILABLE
ERROR
```

Only `AVAILABLE` may expose a numeric public counter. Therefore an authoritative empty read renders `0`, while loading/degraded/unavailable/error remain explicit non-numeric states. A later failed/degraded read clears the formerly admitted read-model projection rather than retaining stale numeric state under a non-available label.

`src/lib/observatory/public/readAvailability.ts` is a pure projection helper inside the existing public Observatory owner; it performs no fetch, write, polling, cache, persistence or authority function.

### Regression QA absorbed

`scripts/qa-sfi-temporal-surfaces.ts` now asserts:

- `AVAILABLE + 0 = 0`;
- `LOADING`, `DEGRADED`, `UNAVAILABLE`, and `ERROR` never map to numeric zero;
- exactly one existing fetch per Observatory public data domain;
- exactly one `Promise.all` read owner;
- exactly one `setInterval(pull,20000)` refresh owner;
- public machine-readable availability attributes exist;
- former direct false-zero count projections are absent.

### Contract impact

No frozen contract delta. The slice implements the existing `UNAVAILABLE != ZERO` invariant and preserves `ONE INTERACTIVE NEED -> ONE AUTHORITATIVE READ PER DATA DOMAIN`.

No migrations, events, new routes, persistence mutations or production mutations.

### QA chronology

Initial `SFI Verify` run `33905732102` reached canonical preflight and failed because PR #369 added a structural `src/lib/**` file but the PR body did not contain the exact required `SFI PRECHECK` field names. Boundary checks before that gate passed. The code was not changed to bypass the rule; the PR dossier was corrected to include the required owner/reuse/writer/persistence/front/back/DB/redundancy/authority/rollback/verification fields. A subsequent branch documentation commit triggers a fresh pull-request run against the corrected dossier.

At this durable checkpoint, full final-head temporal QA, runtime read-plane QA, typecheck and build remain release-gated by the fresh `SFI Verify` run and must not be reported PASS until GitHub Actions records success.

### Next safe action

Let the final-head PR checks complete. If green, WS-08 performs independent adversarial assurance on PR #369; SFI-00 alone decides integration. No merge from WS-03.

---

# COPY-PASTE DISPATCH PROMPT

You are **SFI-03 · DISCOVERY MESH**.

Read fresh `Aptymok/system-friction`, then all canonical program documents and `docs/program/workstreams/WS-03-DISCOVERY-MESH.md`. Inspect and absorb the existing public institution profile, llms resources, AI index, robots, sitemap and public routes before creating anything.

Implement the complete current Discovery Mesh architecture: canonical object registry, semantic concept/method/instrument layer, controlled Evidence Capsules, object-specific JSON-LD, bilingual canonicalization, discovery emitter, feeds/sitemaps/IndexNow, crawler-policy separation, query graph, metrics and `/root/discovery`. Preserve `systemfriction.org` as canon and never fabricate external identities/DOIs or publish private state.

No SEO spam, no duplicate canonical plane, no false-zero metrics, no mocks or placeholder publication success. You may branch/commit/open PRs but may not merge. Shared machine/public contracts go through SFI-00. Execute QA/typecheck/build and leave durable handoff state.

Proceed from actual repository state now.
