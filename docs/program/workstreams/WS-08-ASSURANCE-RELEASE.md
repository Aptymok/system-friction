# WS-08 · ASSURANCE + RELEASE

**Mission:** act as the adversarial assurance and release-verification cell for the entire SFI program. Prove that workstreams preserve contracts, authority, epistemic integrity, security, performance and production behavior. Do not become a second implementation owner.

**Initial baseline:** `565ac410fceb56d86ff9d6eaec85b901d0d77248`  
**Integration authority:** SFI-00  
**Self-merge:** FORBIDDEN

## 1. Role

WS-08 independently verifies work produced by WS-01 through WS-07.

It may:

- add/fix QA tests and validation tooling;
- identify contract violations;
- request changes;
- prepare migration/security/performance review;
- inspect CI;
- inspect production deployment/logs;
- record observed RETURN.

It must not:

- silently redesign another workstream's domain;
- make sovereign user decisions;
- weaken tests to make CI green;
- direct-SQL mutate production to hide a defect;
- approve its own unreviewed semantic contract changes.

## 2. Baseline closure first

Before new program work is considered safe, verify merged `565ac410...`:

1. exact production deployment success;
2. ROOT sovereign surface loads;
3. `NECESITA DE TI` only counts actionable human obligations;
4. report approvals open real dossiers/actions;
5. Library is accessible and non-fabricating;
6. Twin Learning is accessible and lineage-preserving;
7. Method Lab/Observatory/Studio navigation is reachable;
8. no public `UNAVAILABLE → 0` false-zero behavior;
9. no #362 interactive duplicate-read regression;
10. no new Supabase/Postgres timeout/retry burst attributable to navigation.

## 3. Assurance matrix

Every program PR is evaluated across relevant dimensions:

```text
CANONICAL PREFLIGHT
OWNERSHIP / DUPLICATION
EPISTEMIC BOUNDARY
AUTHORITY BOUNDARY
RLS / DATA ACCESS
SECRET HANDLING
PRIVACY
RIGHTS / LICENSE
LINEAGE
READ-PLANE COST
N+1 / DUPLICATE READS
MIGRATION SAFETY
BACKWARD COMPATIBILITY
API CONTRACT
TYPECHECK
UNIT/INTEGRATION QA
BUILD
ROLLBACK
PRODUCTION RETURN
```

Not every PR requires every domain, but skipped dimensions must be non-applicable for a stated reason.

## 4. Required program gates

WS-08 coordinates implementation/registration of these gates, absorbing existing QA infrastructure rather than creating a separate CI universe:

```text
SFI-RUNTIME-ADAPTIVE-CAPABILITY-1.0
SFI-CAPABILITY-AUTHORITY-1.0
SFI-MODEL-INDEPENDENCE-1.0
SFI-DOMAIN-NEUTRAL-KERNEL-1.0
SFI-DISCOVERY-INTEGRITY-1.0
SFI-ENTITY-COHERENCE-1.0
SFI-PUBLIC-EPISTEMIC-BOUNDARY-1.0
SFI-PUBLIC-MCP-READONLY-1.0
SFI-DISCOVERY-NO-DUPLICATE-CANON-1.0
SFI-AUDIO-RIGHTS-SEPARATION-1.0
SFI-AUDIO-EPHEMERAL-ASSET-1.0
```

Existing gates remain authoritative where they already cover a rule. Do not duplicate tests solely to create a new filename.

## 5. Runtime adversarial tests

For WS-01 prove:

- capability request does not self-authorize;
- denied request cannot execute;
- duplicate/recursive requests terminate;
- model unavailable/fallback does not change authority;
- scope/TTL/ceiling enforced;
- model output remains derived/inference;
- explicit/auto compatibility remains.

## 6. Twin/Method Lab adversarial tests

For WS-02 prove:

- historical learning remains reconstructable after amendment;
- simulation/reentry does not create OBSERVATION;
- same T0 replay is reproducible within declared nondeterminism;
- model/provider swap is an experimental variable, not memory replacement;
- private Twin state does not leak publicly.

## 7. Discovery adversarial tests

For WS-03 prove:

- only publicable objects enter sitemaps/feeds/capsules;
- JSON-LD identity is coherent;
- canonical/hreflang correct;
- no unverified external node in `sameAs`;
- no false-zero;
- crawlers are separated by policy class;
- ROOT/private endpoints excluded;
- Discovery Control Plane uses bounded reads;
- one canonical object does not create competing canonical URLs.

## 8. Machine-interface adversarial tests

For WS-04 prove:

- public MCP is read-only;
- public MCP cannot access ROOT/private cases/Twin;
- authenticated adapter uses existing scopes;
- high-capability model cannot bypass scope;
- OpenAPI/manifest/MCP descriptions agree;
- external listing is not claimed without receipt.

## 9. Research adversarial tests

For WS-05 prove:

- citation files parse;
- DOIs emitted are real/verified;
- ORCIDs emitted are verified;
- no fictional ROR;
- authors/institution roles correct;
- publication version/canonical landing metadata agree.

## 10. Audio adversarial tests

For WS-06 prove:

- instrument/reference banks cannot substitute each other;
- rights state gates execution/publication;
- SFZ path actually renders in supported fixture;
- raw source material is not default DB payload;
- ephemeral cleanup state is recorded;
- bounded rerender preserves unaffected stems where supported;
- rendered output does not become cultural observation by inheritance.

## 11. External identity adversarial tests

For WS-07 prove:

- claimed/verified state is evidence-backed;
- no fabricated handle/URL/identifier;
- canonical name/domain consistent;
- lost/degraded node not still emitted as verified;
- identity collision observations distinguish observed confusion from mere name similarity.

## 12. Migration review

For every migration:

```text
owner exists?
duplicate table/column?
RLS enabled?
policies explicit?
indexes appropriate?
foreign keys correct?
nullable/default semantics honest?
backfill bounded?
rollback understood?
production lock risk?
```

Only SFI-00 coordinates production application order.

## 13. Performance/read-plane review

Protect #362 invariant:

```text
ONE INTERACTIVE NEED
→ ONE AUTHORITATIVE READ PER DOMAIN
→ ZERO DUPLICATE EQUIVALENT READS
→ ZERO N+1
```

For new ROOT/Discovery UI:

- no heavy archive in periodic polling;
- no exact COUNT where bounded existence is enough;
- no full graph/state fanout for a card;
- dossier reads are explicit/on demand;
- mutation responses should be reused when canonical and fresh rather than write→discard→duplicate read.

## 14. Production verification protocol

After merge:

1. record merge SHA;
2. identify exact production workflow/deployment;
3. wait for terminal success/failure;
4. do not call production live before success;
5. exercise only non-sovereign smoke paths unless the user explicitly requests an action;
6. inspect relevant logs;
7. record observed failures separately from registered incidents;
8. compare expected RETURN against observed behavior;
9. update `CURRENT-STATE.md` via SFI-00.

## 15. Status language

Allowed:

```text
DESIGNED
IMPLEMENTED
QA_PASS
MERGED
DEPLOYED
OBSERVED_IN_PRODUCTION
```

Never collapse them into `DONE` without context.

## 16. Definition of done

WS-08 remains active through the whole program. It reaches program-complete state only when every completed workstream has independent assurance evidence, all merged functional surfaces have production RETURN where applicable, and no unresolved severity-critical contract/security/epistemic defect remains hidden behind green superficial CI.

## 17. Handoff

```text
BASE SHA
PR/WORKSTREAM REVIEWED
ASSURANCE DIMENSIONS
GATES RUN
FAILURES
FIX OWNER
MIGRATION REVIEW
PERFORMANCE REVIEW
DEPLOYMENT SHA/STATE
PRODUCTION OBSERVATION
UNRESOLVED RISK
RECOMMENDATION TO SFI-00
```

---

# COPY-PASTE DISPATCH PROMPT

You are **SFI-08 · ASSURANCE + RELEASE**.

Start from fresh `Aptymok/system-friction`, current CI/deploy state, all program control-plane documents and `docs/program/workstreams/WS-08-ASSURANCE-RELEASE.md`. You are adversarial assurance, not a second product owner.

First close the baseline: verify the exact production deployment for merged `565ac410fceb56d86ff9d6eaec85b901d0d77248`, then verify ROOT actionable inbox/report dossiers/Library/Twin Learning/navigation, false-zero behavior, #362 zero-duplicate read plane and relevant Supabase/Postgres/API/Auth health without executing sovereign user decisions.

For subsequent workstreams, enforce canonical ownership, epistemic/authority/RLS/security/privacy/rights/lineage/performance/migration/typecheck/build/rollback gates. Never weaken QA to go green and never direct-SQL production around canonical writers. You may add QA/fixes and open PRs but may not merge. Return an explicit recommendation to SFI-00 with evidence and durable handoff state.

Proceed from actual repository/infrastructure state now.
