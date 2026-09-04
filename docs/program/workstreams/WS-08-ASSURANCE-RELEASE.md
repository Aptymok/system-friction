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

## 18. Assurance snapshot — 2026-09-04 · baseline / #366

**WS-08 program state:** `QA_FAILED` — the currently deployed baseline still reproduces #366 in production.  
**Fresh `main`:** `1bd890c8a2ec784ad87d73eac6d19a294e050543`  
**Functional production baseline:** `565ac410fceb56d86ff9d6eaec85b901d0d77248`  
**#366 implementation owner:** WS-03  
**#366 independent assurance owner:** WS-08  
**WS-03 implementation PR:** `#369`, current reviewed head `db1dd1089081a631713cd5593fead73c303231cb`  
**WS-08 durable assurance PR:** draft `#368` from `ws08/assurance-366-gate`; docs-only after assurance-gate absorption; NO MERGE by WS-08.

### 18.1 Confirmed production failure

A bounded public read of the canonical site reproduced the exact #366 failure class: while the surface exposed a non-authoritative hydration/session state, the public Observatory simultaneously rendered numeric `0` for observations, active sources, hypotheses and return. This violates frozen `UNAVAILABLE != ZERO` semantics. The baseline therefore remains `DEPLOYED`, not `OBSERVED_IN_PRODUCTION`.

### 18.2 #366 gate absorption and independent review of PR #369

WS-03 correctly absorbed availability regression coverage into the existing `scripts/qa-sfi-temporal-surfaces.ts` gate. WS-08 removed its initial standalone prototype because that prototype asserted an implementation detail (`worldR.ok`) rather than only the frozen external invariant and would have duplicated WS-03 semantics.

The reviewed WS-03 slice introduces an explicit public read-availability projection inside the existing Observatory owner and preserves the existing data-plane topology. Its regression gate proves:

- `AVAILABLE + 0 = 0`;
- `LOADING`, `DEGRADED`, `UNAVAILABLE`, and `ERROR` never become numeric zero;
- exactly one fetch remains for each existing Observatory public domain (`world`, `state`, `timeline`);
- exactly one `Promise.all` read owner remains;
- exactly one 20-second polling owner remains;
- machine-readable availability is exposed;
- the former direct false-zero projections are absent.

CI chronology matters. The first #369 run failed canonical preflight because the structural `src/lib/**` addition lacked the required PR dossier fields. WS-03 corrected the PR metadata without weakening the gate. A rerun of the old workflow event still failed because GitHub reused the original event payload. WS-03 then created a fresh pull-request event via a documentation-only branch commit. On final reviewed head `db1dd108...`, `SFI Verify` run `33906131721` recorded PASS for canonical preflight, Field/Observatory temporal surfaces, ROOT graph/navigation, ROOT reports/runtime, Method Lab convergence, runtime read-plane stability, typecheck and build. Therefore PR #369 is `QA_PASS` for the #366 pre-merge slice. This does not imply `MERGED`, `DEPLOYED`, or `OBSERVED_IN_PRODUCTION`.

### 18.3 Baseline verification matrix

- ROOT actionable queue / `NECESITA DE TI`: static and CI contract coverage PASS; controlled authenticated production observation remains `NOT_OBSERVED` in this run.
- report approval dossiers: static and CI contract coverage PASS; controlled authenticated production observation remains `NOT_OBSERVED`.
- Library: route/catalog integration is present and existing CI remains green; controlled authenticated production observation remains `NOT_OBSERVED`.
- Twin Learning: route/lineage integration is present and existing CI remains green; controlled authenticated production observation remains `NOT_OBSERVED`.
- Method Lab / Observatory / Studio navigation: canonical links and navigation QA PASS; controlled authenticated production traversal remains `NOT_OBSERVED`.
- public false-zero on deployed baseline: **FAIL**, independently reproduced in production.
- #362 ROOT/CASES/TWIN/GOVERNANCE static read-plane regression gate: PASS on fresh `main` and PASS on #369 final reviewed head.
- zero duplicate equivalent reads / zero N+1: PASS in the static #362/read-plane gate for its owned ROOT/CASES/TWIN/GOVERNANCE domains; attributable production verification remains `NOT_OBSERVED`.

No PASS is inferred from missing production evidence.

### 18.4 Production API/Auth/runtime evidence

The exact functional production deployment remains `565ac410...`, with GitHub production workflow `33897088220` completed successfully at `2026-09-04T16:49:36Z`.

Available production Supabase API logs show successful `200/201/204` activity after that deployment. PostgreSQL logs in the retrieved window contain statement-timeout bursts and an earlier recovery event, but the visible timeout burst at approximately `16:09Z` precedes deployment completion and therefore cannot be attributed to `565ac410...`. No post-deployment statement-timeout appears in the retrieved slice; this is not promoted to PASS because WS-08 did not obtain a controlled, attributable authenticated navigation trace.

Auth logs show successful token/JWKS activity in the available window, but the directly attributable auth samples retrieved for this review predate the deployment. Post-deployment authenticated ROOT/Library/Twin/navigation behavior therefore remains `NOT_OBSERVED` rather than PASS.

### 18.5 Migration and security review for #369

`#369` adds no migration, table, writer, persistence path, secret, scope, RLS policy, auth authority, or production mutation. Migration/RLS/secret review is therefore `N/A` for this slice, not silently skipped. Rollback is a code revert with no data rollback.

### 18.6 Performance review

The #362 contract remains:

```text
ONE INTERACTIVE NEED
→ ONE AUTHORITATIVE READ PER DOMAIN
→ ZERO DUPLICATE EQUIVALENT READS
→ ZERO N+1
```

PR #369 preserves one existing read per Observatory endpoint, one `Promise.all`, and one 20-second polling owner; its fix does not add another fetch, poller, endpoint or persistence reader. The final-head runtime read-plane gate passes.

Separately, production API logs show repeated equivalent reads of `world_vector_*` and `worldspect_snapshots` in a pre-baseline-deployment interval. Those observations are not classified as a #362 regression because they are outside #362's ROOT/CASES/TWIN/GOVERNANCE scope and precede the functional deployment under review. They remain a Discovery/Observatory performance risk that must be rechecked with a bounded, attributable post-#366 production smoke.

### 18.7 Governance risk

Fresh `main` is currently reported by GitHub as unprotected with required status checks enforcement off. WS-08 did not mutate repository governance. This does not invalidate completed CI evidence, but it is an unresolved release-governance risk because the repository does not technically enforce the SFI-00-only integration policy or required gates at branch level.

### 18.8 Recommendation to SFI-00

**PR #369: eligible for SFI-00 integration from an assurance perspective.** Its #366 semantics are consistent with the frozen contract and its required pre-merge gates are PASS. WS-08 must not merge it.

**Baseline: HOLD at `DEPLOYED`; DO NOT promote to `OBSERVED_IN_PRODUCTION`.** After SFI-00 merges #369, record the exact merge SHA, wait for the exact production deployment to reach terminal success, then run a bounded public smoke proving both sides of the invariant: non-authoritative/loading/degraded/error states are non-numeric, and an authoritative successful zero-valued read renders `0`. After that, perform controlled authenticated observation of ROOT actionable queue, report dossiers, Library, Twin Learning and Method Lab/Observatory/Studio navigation with attributable API/Auth/Postgres evidence and no #362 duplicate-read/N+1 regression. Only then is baseline closure eligible for `OBSERVED_IN_PRODUCTION`.

## 19. Assurance continuation — 2026-09-04 · review-thread reconciliation

**Current WS-08 state:** `QA_FAILED`  
**Supersedes:** section 18.8 recommendation that PR #369 was eligible for integration.  
**Fresh `main`:** `1bd890c8a2ec784ad87d73eac6d19a294e050543`  
**PR #369:** OPEN, not merged, reviewed HEAD `db1dd1089081a631713cd5593fead73c303231cb`  
**PR #368:** remains DRAFT and docs-only; WS-08 self-merge remains forbidden.  
**Functional production deployment:** `565ac410fceb56d86ff9d6eaec85b901d0d77248`, workflow `33897088220`, terminal `success` at `2026-09-04T16:49:36Z`.

### 19.1 Why the prior #369 recommendation is superseded

The reviewed HEAD did not move, and the required SFI workflows remain terminally successful. However, review evidence posted after the earlier assurance assessment exposed three adversarial states that the current deterministic gates do not cover. WS-08 independently inspected the current HEAD and confirmed all three defects in source; therefore this is a substantive `FAIL`, not merely `STALE_REVERIFY_REQUIRED`.

1. **Contract-incomplete HTTP 200 can be classified `AVAILABLE`.** The current classifier accepts any parseable object that is not explicitly `ok:false` and has no warnings. An HTTP 200 payload such as `{}`, `{ok:true}`, or a timeline response without its required collection can therefore become `AVAILABLE`; the UI then normalizes missing collections to empties and may publish numeric zero or an empty snapshot count without an authoritative response shape.
2. **Overlapping poll generations can restore stale `AVAILABLE`.** The 20-second interval can begin a new `pull()` while an older one remains in flight. There is no generation, abort, or serialization guard. A newer degraded/unavailable response can therefore be followed by an older successful response that overwrites the more recent availability/data state. One source-level poll owner does not by itself prove zero runtime overlap or zero duplicate-equivalent read amplification.
3. **Non-available world state can become an absence claim.** Clearing stale `world` data when a read becomes non-available is correct, but the hypotheses lens then falls through to copy asserting that no hypothesis exists under the filters. That converts unavailable/degraded/error into an authoritative absence claim and violates the same epistemic boundary that forbids false zero.

These findings do not require WS-08 to choose WS-03's implementation. Acceptance requires only the observable invariants: an applicable response must be structurally authoritative before `AVAILABLE`; stale/out-of-order polling must not overwrite the latest read state or create overlapping equivalent read cycles; and non-available states must not emit absence claims. Regression coverage belongs in the existing WS-03 temporal/read-plane gates.

### 19.2 CI and external status

For HEAD `db1dd108...`, `SFI Verify`, `SFI Universal Signal`, and `SFI Session Controls` are terminal `success`; canonical preflight, Field/Observatory temporal surfaces, ROOT graph/navigation, ROOT reports/runtime truth, Method Lab, runtime read-plane stability, typecheck and build all passed. These green gates are retained as evidence but are insufficient to override the confirmed adversarial gaps above.

The commit's external combined status is not uniformly green: the Vercel preview reports success while two Netlify deploy-preview contexts report failure. Netlify is not elevated here to a frozen SFI release gate, but the PR is not treated as externally all-green and GitHub reports its merge state as unstable. No merge is authorized by WS-08.

### 19.3 Current production smoke

Production has not received PR #369. The exact functional deployment remains `565ac410...`. A fresh public read of the canonical site again reproduced #366: the page identifies itself as a non-authoritative `PUBLIC hydrating` / session-loading state while simultaneously publishing numeric `0` for observations, active sources, hypotheses and return, plus text asserting that the field contains zero visible observations/hypotheses. Production therefore remains `DEPLOYED`, not `OBSERVED_IN_PRODUCTION`.

Because #369 is not merged, no post-#369 production performance or correctness claim exists.

### 19.4 Auth/runtime and baseline evidence

The production Supabase project is currently healthy at the service level. Available API/Auth logs include successful API responses and successful token-refresh/login/JWKS activity after the `565ac410...` deployment. The PostgreSQL slice retrieved for this continuation shows no error after deployment completion; the latest visible statement-timeout cluster remains around `16:09Z`, before `16:49:36Z`. None of this is promoted to baseline PASS because WS-08 did not obtain a controlled, attributable authenticated navigation trace.

Therefore production status remains:

- ROOT `NECESITA DE TI` actionable semantics: static/CI PASS; authenticated production `NOT_OBSERVED`;
- report approval dossier/action: static/CI PASS; authenticated production `NOT_OBSERVED`;
- Library: static/CI PASS; authenticated production `NOT_OBSERVED`;
- Twin Learning: static/CI PASS; authenticated production `NOT_OBSERVED`;
- Method Lab / Observatory / Studio navigation: static/navigation gates PASS; authenticated production traversal `NOT_OBSERVED`;
- ROOT / Observatory authority separation: canonical/static boundary PASS; authenticated production traversal `NOT_OBSERVED`;
- #362 ROOT/CASES/TWIN/GOVERNANCE read-plane gate: static PASS;
- attributable production zero-duplicate / zero-N+1: `NOT_OBSERVED`;
- PR #369 Observatory polling boundedness under slow/out-of-order response: FAIL on current source because overlap is possible.

No absence of logs is interpreted as absence of defects.

### 19.5 PR #368 disposition

PR #368 remains **DRAFT** and docs-only. It should not be closed yet because its current assurance evidence has not been absorbed into canonical `main`, and its previous merge-eligible conclusion required explicit supersession. It should not be promoted for integration as a substitute for fixing #369. Its role is durable independent assurance evidence until SFI-00 decides how to absorb the final release record.

### 19.6 Recommendation to SFI-00

**DO NOT MERGE PR #369 at current HEAD `db1dd108...`.** Classification: `FAIL`.

Fix owner remains **WS-03**. Require a narrowly scoped #366 correction that closes the three confirmed adversarial gaps without adding a second reader, endpoint, poll owner, event universe or contract delta. The resulting new HEAD must rerun canonical preflight, temporal/public-epistemic regression QA, runtime read-plane stability, typecheck and build, after which WS-08 performs a fresh independent review.

Baseline remains **`QA_FAILED` / functional deployment `DEPLOYED`**. Even after a future #369 merge, do not promote to `OBSERVED_IN_PRODUCTION` until the exact production SHA reaches terminal success, bounded public smoke proves both `UNAVAILABLE != ZERO` and `AVAILABLE + real zero = 0`, and controlled authenticated baseline traversal yields attributable API/Auth/Postgres evidence without duplicate-read/N+1 regression.

## 20. Assurance continuation — 2026-09-04 · moved-head re-verification

**Supersedes:** section 19.6 only for the exact PR-head state; the production/baseline conclusions remain unchanged.  
**PR #369 current HEAD:** `7c8c0fe44bb772fe9a95e1aeae3d0a4912799666`  
**State:** OPEN, NOT MERGED  
**Classification:** `FAIL`  
**Fix owner:** WS-03

### 20.1 Head movement and first three findings

After the `db1dd108...` FAIL, WS-03 moved the code to `18ff9873276b135c793e95807b6fd8496b8fb445` and then added a docs-only checkpoint at `7c8c0fe...`. WS-08 re-inspected the code delta rather than inheriting the previous verdict.

The `18ff987...` code corrected the three prior findings:

- endpoint-specific authoritative shape is required before `AVAILABLE`;
- the existing poll owner is serialized with an `inFlight` guard so interval generations do not overlap;
- non-available FIELD/HYPOTHESES paths expose availability rather than asserting no hypotheses.

The existing temporal QA was expanded to cover incomplete HTTP 200 payloads, the overlap guard, non-numeric non-available states, authoritative zero, one endpoint read per domain, one `Promise.all` owner, and one 20-second timer. `SFI Verify` run `33909058682` on code HEAD `18ff987...` was terminal `success`, including temporal surfaces, runtime read-plane stability, typecheck and build; Universal Signal and Session Controls also succeeded.

### 20.2 New adversarial finding on corrected code

A subsequent review of `18ff987...` exposed a fourth P2 that WS-08 independently confirmed in source:

**A serialized poll can freeze permanently if one request never settles.** `fetchJson` uses `fetch(path,{cache:'no-store'})` without an abort signal or bounded timeout. The effect sets `inFlight=true` before awaiting the three-request `Promise.all` and only releases it in `finally`. If any fetch remains pending indefinitely, `finally` never executes; every future 20-second tick observes `inFlight` and returns immediately. The Observatory can therefore stop refreshing permanently until remount.

This is not the original overlap race, but it violates the same bounded-runtime requirement: availability must be able to recover from a stalled public read without introducing retries, parallel generations or duplicate read owners.

HEAD `7c8c0fe...` is docs-only relative to `18ff987...`; it does not change the runtime and therefore does not close this finding. Its final-head CI was still running at the durable observation point, but CI outcome cannot override the source-confirmed defect.

### 20.3 Current assurance disposition

**DO NOT MERGE PR #369 at HEAD `7c8c0fe...`.** `FAIL` is based on the runtime defect, not on pending CI.

WS-03 should bound the existing read batch so a stalled request transitions to an explicit non-available/error state and later scheduled refresh remains possible, while preserving:

```text
one polling owner
one authoritative read per Observatory domain
zero concurrent refresh generations
zero retry fanout
zero N+1
UNAVAILABLE != ZERO
```

The exact implementation remains WS-03's responsibility. Regression QA must prove bounded stalled-read recovery in addition to the already-fixed three cases. A new code HEAD requires full deterministic CI and fresh WS-08 review.

### 20.4 Production and baseline remain unchanged

PR #369 is not merged and has no production deployment. Production remains on functional SHA `565ac410fceb56d86ff9d6eaec85b901d0d77248`, and the fresh public smoke still reproduces false zero during non-authoritative hydration/session state. The baseline remains `QA_FAILED` / `DEPLOYED`, never `OBSERVED_IN_PRODUCTION`.

ROOT actionable queue, report dossiers, Library, Twin Learning and authenticated Method Lab/Observatory/Studio traversal remain `NOT_OBSERVED` in production. Static/CI coverage remains evidence, but it is not substituted for controlled production observation.

---

# COPY-PASTE DISPATCH PROMPT

You are **SFI-08 · ASSURANCE + RELEASE**.

Start from fresh `Aptymok/system-friction`, current CI/deploy state, all program control-plane documents and `docs/program/workstreams/WS-08-ASSURANCE-RELEASE.md`. You are adversarial assurance, not a second product owner.

First close the baseline: verify the exact production deployment for merged `565ac410fceb56d86ff9d6eaec85b901d0d77248`, then verify ROOT actionable inbox/report dossiers/Library/Twin Learning/navigation, false-zero behavior, #362 zero-duplicate read plane and relevant Supabase/Postgres/API/Auth health without executing sovereign user decisions.

For subsequent workstreams, enforce canonical ownership, epistemic/authority/RLS/security/privacy/rights/lineage/performance/migration/typecheck/build/rollback gates. Never weaken QA to go green and never direct-SQL production around canonical writers. You may add QA/fixes and open PRs but may not merge. Return an explicit recommendation to SFI-00 with evidence and durable handoff state.

Proceed from actual repository state now.
