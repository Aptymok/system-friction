# MIHM-EXP-001 · G3a — Named-check evidence and relational admissibility

**Parent:** SFI-MIHM-FOUNDATION-001; existing PR #749 continuation. **Category:** exploratory source audit, not frozen. **Authority:** GitHub historical receipts and existing Method Lab research governance. **No scientific validation, no execution in production, no canonical Φ change and no institutional RETURN.**

## What is being tested

The G2c historical sample is a feasibility dataset only. Its 68 CI entries come from 15 PR groups and nine distinct CI workflows. Of 21 **SFI Verify** entries, 7 failed and 14 succeeded, and the underlying named YAML verification program changed across nine head-commit source blobs. Therefore a pooled generic CI failure target is invalid as a stable construct.

The G3a task is to use the *exact G2c original research artifact* fixed by its ZIP SHA-256, inspect the actual GitHub Actions **named step receipts** for each SFI Verify run, and retrieve the SFI Verify YAML source declaration at each immutable head commit SHA. For each step, distinguish PASS, FAIL, SKIPPED, ABSENT and UNKNOWN. Record independently the number of PR groups producing check failures and the declarative workflow-to-script command. Do not assume a declared YAML source equals the actual executed PR merge-ref workflow or a causal dependency graph.

## Known read-only receipts (13–14 Oct 2026)

The 21 individual runs were inspected directly through the GitHub Actions jobs tool. Failing checks were:

- **Enforce canonical development preflight**: three failed runs, across PR #670 and PR #680.
- **Verify bounded Neon continuity heartbeat fallback**: two failed runs, both in PR #621.
- **Verify ROOT graph and navigation convergence**: one failed run in PR #510.
- **Verify ROOT reports and runtime truth**: one failed run in PR #510.

**Check domain boundaries** succeeded in all 21 actual jobs, including those with failures elsewhere; it currently has no positive error class for predictive testing in the sampled cohort. **Verify MIHM method selection** succeeded when executed; on three preflight-failed jobs its execution was skipped and must not be counted as a pass or fail.

The named check **Enforce canonical development preflight** is a **candidate experimental outcome**, not a selected or preregistered target. Three run failures span only **two independent PRs**, insufficient to claim predictive discrimination. The target's control script and its code dependencies also require source-vintage audit. Version matching by exact same step name alone is insufficient.

## Scientific decision gates

- **G3a source feasibility:** archive named step receipts with provenance and version-specific declared commands; record any non-observation or contract mismatch.
- **G3b model admissibility:** reconstruct bounded, typed *as-of-T0* node/edge/constraint evidence from source. At minimum: workflow step -> invoked check script, check script -> referenced modules/configs, change -> actually affected component. Preserve indirect and unknown dependency cases as unknown. A named command is not enough to demonstrate mechanism.
- **G3c conventional comparator:** transparent conventional M0 with the same inputs and cost budget versus MIHM-relational representation and node-only ablation. Comparison must be over the same preregistered endpoint and information vintage. Do not fit on held-out records or report overconfident AUC on two failed PR groups.
- **G4 frozen outcome:** decide endpoint, T0, horizon, data rights, group-level outcome, rejection criterion, calibration, abstention and verification costs before independent future data are collected.
- **G5 prospective RETURN:** only after independent outcomes, proper holdout and reproducible evaluation. Failure/null result and abstention are legitimate outcomes.

## Explicit non-effects

No new methods, formulas, data tables, code owner, execution authority, grant, SFI database writer or material-world intervention. The read-only audit runs as an isolated research workflow and writes temporary GitHub Actions artifact only. Institutional archiving requires separate integrity/readback verification. Publication/CI success cannot mint scientific validity or empirical RETURN.

## 2026-10-14 G3a executed and archived (source-linked)

**Actual GitHub Actions run:** `38547376017`; **10/10 anti-leakage and unknown-state QA tests passed**, 21 real SFI Verify jobs inspected, 15 PR groups, 9 head-commit workflow source versions; zero source or job read errors. G3a original ZIP SHA256 `2bd9b3c34f7d3fd8de50ef43a7bf77b73527b32b04a6bacee101a4c48273c383`. Institutional original archive: https://drive.google.com/file/d/1r5qDpsuZ38ai2ClEpngFSG9BUfZuFYtf/view?usp=drivesdk (readback/hash verified). Source: GitHub Actions artifact `11884937440`, 30-day ephemeral retention.

Per-check observed receipts: domain-boundary check **21 PASS / 0 FAIL**; architecture preflight **18 PASS / 3 FAIL across 2 PRs**; MIHM selection **18 PASS / 3 SKIPPED / 0 FAIL**; Neon fallback **13 PASS / 2 FAIL across 1 PR / 3 SKIPPED / 3 ABSENT**; ROOT navigation **17 PASS / 1 FAIL / 3 SKIPPED**; ROOT reports **16 PASS / 1 FAIL / 4 SKIPPED**. The three architecture failures are PR #670 run `36073833796` and PR #680 runs `36114751141`, `36114960487`. No check is an admissible scientific predictive endpoint from the current sample. Head SHA workflow source is not proven to match the actual PR merge-ref execution.

## 2026-10-14 G3b bounded historical reconstruction: repeated architectural violation

**OBSERVED FROM ACTUAL HISTORICAL JOB LOGS (not code inference):**

- [PR #670 / CI run 36073833796](https://github.com/Aptymok/system-friction/actions/runs/36073833796) — canonical preflight rejected two rules: `P12_INTERFACE_NO_SUPABASE` and `P12_INTERFACE_NO_RAW_TABLE_ACCESS` in `src/app/publications/page.tsx`.
- [PR #680 / CI run 36114751141](https://github.com/Aptymok/system-friction/actions/runs/36114751141) and [second run 36114960487](https://github.com/Aptymok/system-friction/actions/runs/36114960487) — same two violations at the same path.
- Git blob `be0e113344cb267976942a57fdfa0e76d604c1f3` of that file at both #670 and #680 source HEADs is identical. It explicitly imports `createServiceSupabaseClient` from `@/runtime/supabase/server`, calls the factory, and queries `.from('sfi_publications')`. [Original failing source at #670](https://github.com/Aptymok/system-friction/blob/7b700123df31de14bc62f9f9274447b3c9c8ff7b/src/app/publications/page.tsx).
- The same canonical preflight script blob `d9223b305fe732e6267f3f1bfea842cb4e5a611b` is present at failed PR #670/#680 **and** at sampled passing PR #640 and #740 source HEADs. [Script version](https://github.com/Aptymok/system-friction/blob/7b700123df31de14bc62f9f9274447b3c9c8ff7b/scripts/qa-canonical-architecture.mjs). This constrains one explanation: changed detector source is *not needed* to explain those differences, although runtime/merge-ref differences remain possible.
- The publication page at sampled [PR #640 passing source](https://github.com/Aptymok/system-friction/blob/fea33e4150e4f9ebe70cb76be26cb29d7d129267/src/app/publications/page.tsx) has blob `76078f3f3b48402282525ab629dc10afadedbb37` with no inspected Supabase client or `.from()` marker. The later [PR #740 passing source](https://github.com/Aptymok/system-friction/blob/2aee155d124f74b858ceb16a7c404647dbec7fd3/src/app/publications/page.tsx) has distinct blob `0bd23b415213f23f5bcf44af2e347e937d54810a`, also lacking these markers.

**DERIVED:** Three observed failed CI checks arose in two PR groups with the **same source violation**, not three independent failure mechanisms. A bounded documentary relation can be reconstructed:

`CI workflow -> declared canonical-preflight script -> P12 architectural constraint -> publications UI file -> server Supabase import/direct table access -> failed preflight receipt`.

Each arrow here has a source-backed **declared invocation, source-code observation or error receipt**, *not* a demonstrated causal graph for MIHM predictive inference. GitHub artifact/document receipt is source provenance; the real executed PR merge-ref remains a separate provenance limitation.

**INFERRED/HYPOTHESIS:** A relation-aware MIHM representation *might* group repeat failures under a common perturbation/constraint better than a node-only count. To test that, construct a matched conventional rule-based or graph model that can see the **same** file path, code imports and P12 rule. Simply grouping three failure logs under one file is not evidence that MIHM outperforms ordinary incident triage.

**Result:** G3b *retrospective source reconstruction* advanced with one bounded positive evidence chain; G3 performance test **still blocked** by inadequate independent PR failure groups, missing prospective experiment freeze and absence of complete, independent, as-of-T0 relation/constraint inputs on broader samples. The original G2c/G3a archives remain unmodified.

## 2026-10-14 G3b formal reproducible documentary replay (pre-result source inputs)

**Owner:** existing SFI MIHM Foundation research program. **Existing capabilities inspected:** G2c/G3a fixed GitHub history, canonical SFI Verify workflow, canonical architecture preflight P12 script, `src/app/publications/page.tsx` historical file. **Absorb vs create:** a narrow **pure research-only** G3b adapter, not another MIHM calculation or competing governance writer. **Authority:** GitHub commits and GitHub Actions status receipts, read-only. **DB/front/runtime/ROOT:** no changes. **Persistence:** ephemeral research artifact and later existing private MIHM archive, not Method Lab canonical evidence. **Rollback:** revert research-only script/test/workflow; no production state affected.

The **G3b experiment is retrospective source replay, not predictive scientific validation**. Input: immutable G3a research ZIP `11884937440` with sha256 `2bd9b3c34f7d3fd8de50ef43a7bf77b73527b32b04a6bacee101a4c48273c383`. From each of its 21 SFI Verify run receipts, use the associated original commit SHA to retrieve only two historically versioned files: `scripts/qa-canonical-architecture.mjs` and `src/app/publications/page.tsx`.

**M0 conventional comparator** uses exactly the original P12 regex rules in the canonical preflight. **Relational documentary view** reuses the same M0 flags and requires independent source evidence for the declared workflow → preflight script → P12 constraint → publications page relations, with versioned blob hashes and linked run receipts. It does **not** compute MIHM Φ, emulate a predictive MIHM engine, or claim any empirical gain. Explicit abstention is required if the page, guard or declaration is not observable or version-compatible.

**Epistemic isolation:** the actual CI preflight PASS/FAIL receipt is appended to the output only for retrospective consistency inspection; it never enters `conventionalP12` or `relationalView`. A match against the **overall preflight step conclusion** is NOT a validated P12-specific label because that step can reject other rules. CI `created_at` and historical commit SHA supply a **time-zero source proxy**, not verified human/push-time knowledge or the bytes of the executed PR merge ref. The code limits its substantive claim to **one known historical publications page** and preserves unknowns as unknown.

**Interpretation gate:** if the conventional P12 baseline already explains the known repeated failure, the honest finding is that G3b adds **traceability of documentary relationships, not demonstrated predictive performance**. To test the scientific model, G3c must have independent admissible changes, authentic pre-T0 system dependencies and a competent same-input comparator. Cost is recorded only as API request count, not claimed dollars/tokens/time.
