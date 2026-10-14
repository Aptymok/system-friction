# MIHM-EXP-001 G2c — Real CI cohort independence audit

Parent: SFI-MIHM-FOUNDATION-001. Continuation of PR #741 (G2a) and PR #749 (G2b). Evidence status: **DERIVED**, research-only. **No model, no prediction, no empirical MIHM validation, no scientific RETURN.**

## What G2b established

On 13 Oct 2026 GitHub Actions reconstructed 40 CI run records, with 26 successes, 10 failures and four cancellations. On independent audit these were derived from **2 PRs and 11 distinct commits**, with 36 records concentrated on PR #740. The artifact is safely backed up in the existing institutional MIHM Google Drive folder; its ZIP SHA-256 is `83a5c96ac4ba1bcf2bdee4d3aceb2917edf3fe02b886acadd06a9afd07bdcdd1`. It must not be treated as 40 independent experimental cases.

## G2c objective and design

Recover a **larger, non-outcome-selected PR cohort** from GitHub in a fixed observation window (2026-09-15 UTC through 2026-10-11 23:59:59 UTC). Read-only; include both open and closed PRs regardless of ultimate CI success, merge or current status. Traverse all accessible PR creation dates within the study window (pagination bounded); take **24 evenly spaced creation-date PRs across the window** and the first three historical commits per PR. This post-hoc coverage adjustment is EXPLORATORY and is not treated as a preregistered sample. Each historical commit SHA and first qualifying PR-triggered CI run for its workflow are represented as separate **correlated** observations, clustered by PR, commit and workflow.

For each unit, source chronology precedes CI entry (T0). File-change aggregates available from immutable commit IDs are preserved as candidate **pre-outcome features**. The subsequent run conclusion is held apart. CI success/failure are binary outcomes only when GitHub reports a completed run with updated timestamp at/before the fixed audit cutoff; cancellation/skipped/timed-out/unknown remain explicit nonbinary/censored observations, **never zeros**. The update timestamp is a conservative upper bound, not an independently verified completion time.

Preserve source links, IDs, observability limitations, selection rules, missingness, truncation and errors. Request no raw logs, private conversation, source-code content or secrets. The collector must signal incomplete commit/run pagination and prevent incomplete run inventories from being labeled admissible. Research artifacts expire in 30 days unless archived to the established SFI MIHM folder; do not confuse the GitHub run artifact with Method Lab canonical evidence or RETURN.

## G2c gates

1. Run anti-leakage and missingness tests; inspect CI execution outcome.
2. Execute bounded source retrieval and inspect distinct PR groups, commits, CI entries, outcome categories, errors and time coverage. At least ten distinct groups is a **screening warning only**, not a power or statistical-sufficiency threshold.
3. If enough independent PRs exist, establish an exploratory conventional M0 on the *development* portion only, matching feature vintages, model tuning and verification costs.
4. MIHM graph/relations must come from pre-cutoff source-justified dependencies; file-change statistics **alone cannot prove MIHM added systemic relational information**. Without independently admissible graph edges, mark MIHM comparison BLOCKED rather than relabel file counts as MIHM.
5. Pre-register a primary workflow and failure endpoint, horizon, threshold and cost budget; freeze before touching held-out outcomes. Prospective validation and replication require future independent receipts.

## Reproduction

`node --test scripts/research/mihm-exp001-g2c-cohort.test.mjs`

`GITHUB_TOKEN=... node scripts/research/mihm-exp001-g2c-cohort.mjs > g2c-cohort.json`

GitHub Actions runs this same bounded audit, retaining a private experiment artifact for 30 days. Check the source visibility and archive only through existing institutional storage, with hash and provenance. **No changes** to MIHM canonical Φ, MIHM-T, CIMPS, Method Lab authority, Reality Chain admission, databases or production.

## 2026-10-14 — G2c first-run audit and transparent revision

The **first G2c run** (GitHub Actions run 38533632933, artifact 11878956749) completed successfully with 13/13 tests: 24 sampled PRs, 40 eligible CI entries, 8 distinct PRs, 10 SHA commits, 32 CI successes and 8 failures, no source request errors and one PR commit pagination warning. However, its PR selection chose the latest 24 creation dates, and all CI entries were from October 10–11. **This does not demonstrate independence, forecasting or MIHM benefit.**

The original archive is retained, unchanged, in the existing private MIHM institutional Drive folder as `MIHM-EXP-001-G2c-2026-10-14-original.zip`, SHA-256 `4b06788def79b527df6a57462ad50c0e8e53fd33d2585b7fb892f2af6c2667cc`.

We therefore changed the **sampling strategy**, not the outcome labels or MIHM model, to spread creation dates across the full study window. This is a transparent, post-hoc **coverage repair**, to be separately rerun, archived and contrasted against the original G2c result. Both runs remain exploratory; the later run must not be described as confirmatory or as improved MIHM prediction.

## 2026-10-14 — Stratified rerun: observed coverage gains, not MIHM validation

The creation-date-stratified run `38534047737` (archive `11879387131`) completed with **14/14 tests**, zero GitHub retrieval errors and no pagination warnings. It scanned 227 candidate PRs within the predeclared exploratory window, selected 24 evenly spaced PRs and returned **68 CI entries from 15 distinct PRs and 21 commits**: 56 successes, 12 failures. The CI dates now span 2026-09-15 through 2026-10-11 (10 distinct dates), rather than October 10–11 only.

Cross-workflow pooling remains scientifically inadmissible. The **SFI Verify** subset comprises 21 CI entries across 15 PRs, with 7 failures in only 4 PRs. This makes SFI Verify a **possible future single-workflow endpoint**, not a statistically adequate or frozen prediction experiment. Source-level dependency/constraint relations that would constitute MIHM-specific inputs were not reconstructed. No difference in performance between M0 and MIHM has been observed.

The untouched stratified artifact is backed up to the existing MIHM Drive folder, at https://drive.google.com/file/d/1FJwjBo_lSWXiE1lDfhs8FDGdOWn2-H9d/view?usp=drivesdk , ZIP SHA-256 `b42900315295e87fe1a668fa0357d1f83e8ed022858df2d3fbc4fbc49cbe372f`.

**Further G2c correction:** prior JSON only included selected PRs with qualifying CI records. A source-completeness record for *all 24 selected PRs* is now part of the output, distinguishing no qualifying CI observed from failed CI. It also explicitly prohibits pooling heterogeneous workflows or inferring MIHM-relational superiority from file-change metadata alone. That amendment is still descriptive and exploratory, subject to independent CI execution.

## 2026-10-14 — G2c source coverage closed (descriptive, research only)

**Final audit:** GitHub Actions run `38534497119`, artifact `11879152257`, **16/16 anti-leakage/source-coverage tests passed**, source requests 145, no retrieval errors or pagination warnings. Among 227 window-candidate PRs, 24 creation-date-spaced PRs were examined: 15 had at least one qualifying CI run and **9 had no qualifying CI observed** (unknown coverage, not successful CI). The final research manifest records all 24 PR coverage states without inventing missing results. Distinct observed groups: 15 PRs, 21 SHA commits, 68 workflow runs; 56 success, 12 failure, 0 prospective predictions.

**Workflow comparability:** Nine named workflows appeared. For a narrowly defined future SFI Verify experiment there are 21 workflow runs across 15 PRs, 7 failure events in **4 distinct PR groups** and 14 successful runs. A baseline across all workflows would be invalid because workflow identities/tasks differ. Group-level independent failure sample is currently too limited for a defensible predictive advantage claim.

**G2c result:** Evidence-acquisition and source-coverage gates *operationally exercised*; scientific model advantage remains **NOT_OBSERVED**. The G3 matched-comparator experiment is **BLOCKED** until independently admissible, pre-T0 node/edge/constraint data can be reconstructed and one comparable endpoint/horizon and sufficient holdout groups are chosen without outcome leakage. No MIHM computational values or Φ scores were calculated from this data.

**Final archive:** Original artifact ZIP preserved without modification in existing MIHM Google Drive folder:
https://drive.google.com/file/d/1SKfh5Ed3wdEAFH4ZLw-2XNx_OlifFs9L/view?usp=drivesdk
SHA-256 of the archived ZIP `ed432026d254bed860cdbf95b233855055ea5d86217f7f9b5a133bc6819ad3ef`. Readback from Drive matched GitHub artifact digest. Retain original versioned audits and distinguish each post-hoc research change.

**Next action:** specifically audit and construct as-of-T0 source dependency/constraint relations for the **SFI Verify** subgroup, with meaningful observable constructs. If typed relations cannot be grounded from pre-cutoff sources, record **ABSTAIN / G3 BLOCKED** rather than fit a nominal “MIHM” model to file counts.
