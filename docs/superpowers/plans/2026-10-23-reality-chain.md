# Reality Chain integrity implementation plan

**Goal:** Connect the twelve requested functions through existing Case Platform reads, reports and lifecycle; never certify missing evidence.
**Spec:** User's twelve-component request, 23 October 2026.
**Architecture:** Absorb into reportAssembler, canonical repository, existing case/reports routes and RealityChainWorkbench. No new agent, registry, database or permission plane.

## SFI PRECHECK
- Owner: Case Platform; Reality Chain is its authorized inspection/reporting surface.
- Existing capability inspected: operational.ts transitions; repository.ts readers/writers; reportAssembler; integrity claim validation; actionRepository decisions/interventions/RETURN; graph knowledge-time and Passport projections; JR field coordinator.
- Absorb vs create decision: Extend existing report assembler and report delivery; no parallel state machine or graph writer. Case reconstruction uses persisted Case objects rather than importing institutional graph data across tenant boundaries.
- Authoritative writer: Existing Case objects, reports, lifecycle and audit writers.
- Persistence/lineage impact: Reports preserve a content-bound reconstruction snapshot. Original event, observation and registration dates remain distinct. Closed history is retained.
- Front delta: Spanish closure, T0/T1, gaps and downloadable Passport from existing reports route.
- Back delta: One deterministic chain read model, provenance/closure validation shared by UI and OAuth; stored report reconstruction; complete bounded pagination.
- DB delta: Add monotonic case revision and child-write lock triggers; one service-only atomic closure RPC under the existing case membership/lock. No new data tables, permission grants, or evidence/RETURN writes. Required before enabling closure on either provider.
- Redundancy removed: Replace empty UI report receipts with substantive, bounded reconstruction; retain older trace exports explicitly as drafts.
- Execution/ROOT boundary: No evidence admission, execution, RETURN minting, publication or canon promotion. Narrative is deterministic interpretation, never an assertion that JR executed.
- Rollback: Revert branch code; preserve generated reports/audit history.
- Verification: Failing regression tests, chain adversarial tests, existing Case QA, architecture/boundaries, typecheck, build and CI.

## Task 1 — Reconstruction and closure contract
- [x] Write failing behavior tests for legacy CLOSED without report/RETURN, missing provenance, temporal leakage, mismatch/version/cycle, forged report receipt, inconclusive close and complete synthetic chain.
- [x] Extend reportAssembler with typed reconstruction, T0/T1 knowledge snapshots, provenance edges/gaps, existing action-authority linkage, RETURN contrast, Spanish explanation, current-content report binding and closure guard.
- [x] Run tests RED then GREEN.

## Task 2 — Canonical integration
- [x] Read all objects/reports/actions/decisions with bounded complete pagination after membership checks; project chain in canonical read.
- [x] Generate and preserve reconstruction inside canonical reports. Enforce closure modes at the shared writer; audit explicit reason; optimistic transition conflict check.
- [x] Extend existing reports delivery with Passport JSON and printable HTML, no new route. Extend OAuth existing operations for report generation/delivery within existing scope.
- [x] Connect frontend to server chain, report and Passport; no false JR execution claim.

## Task 3 — Verification and handoff
- [ ] Run relevant behavioral suites and architecture/domain/type/build checks. Add new tests to existing CI lane.
- [ ] Review branch, repair findings, push isolated branch, open PR with preflight and exact evidence/limits. Do not merge while CI fails or live exercise is unproven.

## Review focus
Missing/nonfinite times; foreign tenant/case references; empty or forged report objects; stale reports after new data; out-of-order execution/RETURN and absent expectations. Each must block certification rather than fill missing facts.

## Execution ledger
- Baseline: main f845d17c, existing fresh clone, dedicated work branch. Live SFI case CLOSED with zero reportRefs and returnRefs observed through canonical case reader.
- Choice: User supplied scope and repeated instruction to execute without design questions; proceed with existing stack and reversible branch changes.

- Review findings addressed: canonical RETURN route/writer accepts and validates evidenceRefs; canonical object writer reuses installed atomic RPC; closure revision, stable read and atomic status/audit under same lock; accepted assessment requires rationale/assessor/time/evidence binding; canonical read fetches report metadata and only the matching current snapshot.
- Boundary ruling: OAuth reconstruction report is founder-only (institutional bound OAuth + root_delegate + root:operate + cases:write) and always claims:[]; ordinary account authority is unchanged.
- Verification environment: tsx CLI IPC is blocked (EPERM). Local node_modules command shim invokes the same loader as node --import tsx; it is not a tracked product change.
- Database test uses PostgreSQL 18 in PGlite, not live Supabase/Neon. Deterministic stale-revision interleavings are tested; two-session contention still requires staging observation.

- Live read-only provider preflight found that both Supabase and Neon lack the historical canonical atomic object RPC as well as the new closure RPC/revision. New migration therefore includes the unchanged existing object function definition; no caller may be treated as exercised before both providers install it.
- PDF visual QA found an existing 8-pixel glyph advance bug causing text overlap. Added RED regression and corrected pixel width; Passport uses A4 and Spanish detail headers through the existing renderer.

## Verified results and rollout gates
- 20 behavioral/PDF tests pass; original empty-close and overlapping-glyph regressions observed RED then GREEN.
- PostgreSQL/PGlite test passes for migration, existing atomic writer, stale-revision close, report gate, atomic audit and post-close writes.
- Existing Case Platform V1/Operational V1, GPT bridge, Reality Chain intake, canonical architecture and domain boundary checks pass; TypeScript passes.
- A full production build passed before the final font/date changes. A subsequent Turbopack run failed opening its persistence cache; rebuilding from an empty generated .next directory. Final exact result recorded in PR.
- PDF generated locally using 51 objects from the observed real case: 13 A4 pages, readable after font fix; registration remains distinct from historical Git metadata dates. This local render does not prove server delivery or report persistence.
- No migration applied to Supabase or Neon, no production deployment, no observed live end-to-end completion or certified real case. Apply the additive migration to both providers only after operational approval/replay-compatibility review; verify function grants and revisions, deploy matching caller, then run an authorized synthetic full cycle and reread the real case/report/Passport.
- Risk: new lock/revision triggers serialize child mutations per case and must be exercised against continuity replay and two actual sessions before production certification. Existing recovery SQL disables user triggers during canonical replay, but this has not been exercised in this change.

- SQL guard also rejects direct CLOSED updates outside the service-only atomic closure owner; trigger gate requires both its scoped transaction guard and the definer identity. Existing authenticated UPDATE policy cannot bypass closure validation.

- Final clean production build completed successfully for the implementation; repeat builds against an existing Turbopack cache can fail with its persistence-directory parsing error. Clean generated .next build passed.
- First remote CI detected the old QA exact-token requirement for the HTTP conflict matcher. Preserved its standalone matcher while retaining new closure conflict handling; reproduced RED then PASS locally.
- Action OpenAPI now exposes closureMode/closureReason and bounded Passport/report operations. Required fields and intervention/RETURN authority exclusions are unchanged; schema regression exercised RED then GREEN.
