# MIHM-T · Timeline Observatory v0.1 — operational authenticated temporal view

**Instrument:** `SFI-MIHM-T-TIMELINE-CLOCKS-0.1`. **State:** IMPLEMENTED ON ISOLATED FEATURE BRANCH / EXPERIMENTAL DESCRIPTIVE PROJECTION; **NOT A SCIENTIFIC VALIDATION OF MIHM-T**. **System owner:** existing SFI Timeline, observational reader and existing MIHM Foundation program. **Audience:** authenticated users at `/timeline`. Public Observatory is not changed to show restricted records.

## Original request and retained thesis

> THE WORLD DOESN'T HAVE THE SAME CLOCK.  
> DIFFERENT SYSTEMS MOVE AT DIFFERENT SPEEDS.  
> TIME REVEALS WHAT WE MISTOOK FOR TRUTH.

The output is **not** a city time-zone display or a substitute for `SFI-MIHM-T-EXP-001`. It is a source-bounded view of heterogeneous temporal coordinates on persisted institutional and WorldSpect records.

## What changed

- `/timeline` invokes the existing `requireUserProfile()` gate *before* loading a source registry or world-history reader, redirects unauthenticated users to `/login?next=%2Ftimeline` and distinguishes temporary authentication-service failure from unauthorized users. `robots` noindex/nofollow. The existing SFI institutional permissions on source readers remain authoritative. It does not expose additional cases/projects or mint account privileges.
- Operational component now has a selectable **Observatory of Clocks** (default) and **Recorded Chronology**. The chronology uses real published institutional registry entries and existing WorldSpect source-reader snapshots, not synthetic events. It retains the window/lanes/range filters and adds explicit horizontal scrolling with SFI gold scrollbars.
- Existing false bottom footer was removed. The functional time-window scrubber is embedded in the central timeline panel, not disguised as a second site footer.
- A pure MIHM child **temporal reading**, not a new MIHM score, documents seven separate axes: EVENT, OBSERVATION, RECORD, KNOWLEDGE, AUTHORITY, EXECUTION and RETURN. Time is `UNKNOWN` unless source **and** time basis/meaning are independently supplied; record timestamps do not imply event or knowledge timestamps.
- WorldSpect public reader now preserves whether the frame's timeline anchor came from `observed_at` or the fallback `created_at`, and separately exposes record `created_at`. A fallback is not relabelled as observed time.
- The clock inspector computes only separately source-dated timestamp differences (e.g. OBSERVATION → RECORD), with negative ordering flagged for review. There is **no** quantified causal MIHM-T transfer, inferred latency, canonical Φ calculation, calibrated gain, synthetic history, or institutional RETURN.

## SFI temporal and authority boundaries

- `SFI-TEMPORAL-CONTRACT-1.0` remains frozen: `OBSERVED_TIME` ≠ `RECONSTRUCTED_TIME` ≠ `SIMULATED_TIME` ≠ `PROJECTED_TIME`.
- `SFI-MIHM-FOUNDATION-RESEARCH-0.1` remains parent. The draft `SFI-MIHM-T-EXP-001` remains unfrozen and the experimental vector/clock ablation remains `SYNTHETIC_QA_ONLY`.
- No new data store, API writer, cron, external integration, workflow repetition or cost-bearing experiment is created. Source readers remain the same pre-existing bounded readers. Source identity and read-plane degradation remain visible.
- Publicly published registry records and WorldSpect snapshots are presently the **only** event feeds. Governed CASE and PROJECT records remain visibly **NOT EXPOSED BY CURRENT READER**; user authentication does not magically create an authorized reader. SOURCE/RECORD/OBSERVATION/EVIDENCE/INFERENCE/AUTHORITY/RETURN are not collapsed.
- **Temporal source completeness is currently intentionally sparse.** Most clocks show UNKNOWN until access-controlled, dated Reality Chain or case records can be lawfully joined through an existing read owner. This is a truth boundary, not an interface defect.

## Verification gate

`npx tsx scripts/qa-sfi-mihmt-timeline.ts` checks calendar parsing and missingness, clock substitution, independent pairwise deltas, inverted time ordering, operational authentication, absence of false footer, reuse of WorldSpect truth, and SFI horizontal scroll. `npm run typecheck` and the existing institutional visual/temporal QA must pass before merge.

## Next phase, NOT claimed as complete

MIHM-T v0.2 should connect the existing authenticated Reality Chain source reader or Method Lab experiment record by **explicit authority**, preserving event/knowledge/authorization/execution/RETURN receipts, and only then present lag maps and bounded interventions. Confirmatory MIHM-T advantages require the separately frozen comparative experiment and independently observed future outcomes.

**Rollback:** revert branch/PR. **Production deployed:** NO until reviewed and merged. **MIHM scientific advantage established:** NO. **Cost/authority changed:** none outside ordinary GitHub CI review.

## 2026-10-14 implementation QA and governance review

The dedicated GitHub Actions job `MIHM-T Timeline Clocks v0.1 Review`, run `38582788228`, completed successfully: seven-clock source/unknown controls, existing temporal-surface QA, existing institutional visual convergence QA, and complete TypeScript typecheck all PASSED. The broader `SFI Verify` preflight initially correctly blocked admission of a structural research helper because 13 canonical `SFI PRECHECK` tokens were not present in PR #752's description; the PR body has now been supplemented with the explicit P17 architecture plan. A new normal CI run is required to verify this governance correction. This is a documentation compliance fix, not a change to model definitions, recorded events or clinical/physical systems.

**Scientific status unchanged:** MIHM-T is an unfrozen research child. The only delivered v0.1 capability is observational clock source distinction. All missing clock readings remain UNKNOWN and the project cannot assert lag propagation, calibration, actor knowledge or RETURN.
