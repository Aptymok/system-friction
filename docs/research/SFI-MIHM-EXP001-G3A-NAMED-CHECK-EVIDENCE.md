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
