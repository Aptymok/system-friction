# MIHM-EXP-001 — SFI GitHub history, prospective system-friction experiment

**Stage:** G2 DATA-FEASIBILITY RUN / NOT_FROZEN / NOT_VALIDATED  
**Research parent:** SFI-MIHM-FOUNDATION-001  
**Temporal extension:** MIHM-T separately compared after MIHM baseline  
**Source:** repository GitHub pull requests, workflow runs, commit history

## Research question

Does a preregistered MIHM relation/constraint representation improve prediction of subsequent CI failure (and eventually recovery latency) relative to competent conventional methods using the same information available at the chosen observation time?

## Experiment object

A commit-specific snapshot of a bounded SFI code change, with an explicit pre-CI decision/forecast timestamp. **Do not** equate the *current PR final head* to its state when a PR first opened. Reconstruct a pre-outcome commit snapshot at each chosen forecast time, including permissible file changes, graph dependencies and historical prior CI information. Neither merge results nor eventual workflow conclusion may enter forecast inputs.

## G2 source feasibility (the deliverable currently executing)

`scripts/research/mihm-exp001-sfi-feasibility.mjs` pulls at most 30 recently created closed PRs, their current recorded final head commit timestamps and workflow run receipts matching that SHA. The manifest preserves explicit provenance, source-vintage warnings and run IDs. GitHub Actions uploads its bounded research JSON artifact. **No model fit or experiment outcome is claimed by this feasibility audit.**

Potential known caveats:
- workflow run list may be incomplete due to GitHub API pagination (100 results/sha), permissions and artifact retention;
- current final PR SHA may not be the original observed decision snapshot;
- existing and previously observed CI workflow conclusions can be features only if genuinely known before the next forecast cutoff;
- missing workflow result is **censored or unknown**, never an observed successful build;
- CI checks changed over time: preserve workflow names and versions; no across-era score mixing without comparability review.

## Tentative M0 / M1 comparison (NOT frozen)

M0-0 empirical base rate by time and workflow; M0-1 conventional metadata/code-change statistics and prior failure rates; M1-ablated node-only representation; M1 MIHM typed dependencies and violation of declared constraints; M2 MIHM-T additionally pre-T0 lag/interaction and heterogeneous-clock information.

**Primary prospective target candidate:** whether a named configured workflow failed at first qualifying run after a specific commit snapshot, using a declared horizon and exclusion policy. Do not aggregate flaky workflows or cancelled/skipped runs into 'pass'. Alternatives include policy/typecheck CI regressions per workflow. Record Brier score, log loss, calibration, abstention, and cost/latency. Select primary outcome and minimum practically meaningful gain **before held-out evaluation**.

## Eligibility, exclusions and privacy

Use repository read-only metadata and non-sensitive CI data only. Do not ingest secrets, environment variables, restricted issue comments, personal account content or internal institutional records into public artifacts. Raw logs may contain secrets and are not harvested. This stage does not perturb deployment, ROOT, Method Lab, evidence canon, or SFI production.

## Scientific stages

- G2a source chronology availability: **active** (read-only workflow).
- G2b accurate time-zero reconstruction and provenance: **pending**.
- G3 matched M0 and MIHM+ablation development on development split only: **pending**.
- G4 preregistration freeze, endpoint, minimum meaningful margin and budget: **pending**.
- G5 untouched temporal holdout and prospective RETURN: **pending**.
- External replication across another system: **pending**.

## Institution integration

This manifest is a research-method artifact under the existing SFI MIHM foundation program. Later outcomes should be persisted via the existing Method Lab research object, typed as DERIVED/OBSERVED only when supported. An automated GitHub test success is operational evidence of CI and is not automatically evidence of MIHM validity; a Reality Passport requires source-linked admission and explicit RETURN contrast. CI artifacts are diagnostic until reviewed.

**No retrospective claim of accuracy and no result from a model not yet executed.**
