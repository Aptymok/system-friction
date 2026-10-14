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
