# MIHM-EXP-001 · G3c / G4 — Scientific comparator protocol (DRAFT, NOT FROZEN)

**Authoritative parent:** `SFI-MIHM-FOUNDATION-001`. **Case source:** existing GitHub G2c/G3a/G3b audit receipts within PR #749. **Epistemic class:** RESEARCH DESIGN. **State:** CANDIDATE / NOT_PREREGISTERED / NOT_VALIDATED. **No canonical Φ, MIHM-T or CIMPS changes.**

## Documented observations driving the design (14 October 2026)

- G2c: 24 prospectively *unselected by outcome* historical PRs sampled across a fixed past window, 15 with eligible CI, 9 without; 68 CI runs (21 SHA commits), 12 workflow failures. No blind test.
- G3a: 21 SFI Verify receipts across 15 PR groups; 9 source workflow versions; 3 canonical architecture-preflight failures across 2 PRs; 0 domain-boundary failures.
- G3b: GitHub Actions run `38577354381`, original artifact `11900702149`, checksum `d2ce5a1ed161c7d4c3b81e854b7ae31c5d3f16025815cfd35e61e3ec63b79dcc`. **12/12 QA tests**, 21 source chains, 3 P12 source-matched runs across 2 PRs, 18 page non-matches, 6 page source blobs / 1 canonical-guard source blob, 42 source API requests, no fetch errors and no abstentions for *this post-hoc historical sample*. These 21 flags descriptively matched the overall architecture-preflight results, but no independent P12 ground-truth study was performed. The original ZIP is preserved in the existing institutionally restricted MIHM Google Drive folder: https://drive.google.com/file/d/1bzZvikdgiNm-jOoZyZg6amxGtJo-vBgX/view?usp=drivesdk .

**Crucial negative result:** the ordinary P12 guard detects the same source patterns. The relation graph makes evidence lineage inspectable but is not itself a validated MIHM implementation, and there is **no observed incremental predictive skill**. The data were selected after case discovery; retrospective agreement is not a forecast, nor a held-out result.

## Proposed prospective experiment (requires independent preregistration before data)

### Unit and admission

A PR is the primary independent unit. Freeze one qualifying **first CI-entry snapshot per PR**, with all eligible PRs included regardless of eventual status. Retain later runs and SHAs for dependency/recurrence description only, not as independent samples. `T0` is the run-created timestamp as a proxy; where source upload availability or executed PR merge-ref bytes cannot be established, mark uncertainty or abstain. Never substitute current PR head, later revision, final merge status or post-T0 logs for a feature.

Record immutable source identifiers, original rule version and the exact status of missing/unknown/abstained checks. No access to secrets, private raw logs, unapproved external datasets or production databases.

### Competing interventions — same inputs

1. **M0 conventional:** the original P12 guard and other declared checks as of T0, plus a competent conventional trace/incident summary that names rule, file and violation. This is the **mandatory reference**, not a deliberately weakened baseline.
2. **R1 relational documentary instrument:** typed pre-T0 evidence links (workflow declaration → source guard → constraint → source file → declared dependency), each with cited blob, vintage, observed/deferred status, missingness and authority boundary. **R1 is not automatically MIHM**.
3. **MIHM candidate:** the original unchanged MIHM instrument with only its actually admissible nodes/relations and applicable Φ family, or **NOT_APPLICABLE** when no MIHM-scoped measurement is justified. A relational diagram renamed as MIHM or a new invented score fails admission.
4. **Ablation:** remove typed inter-node edges while preserving available node-level evidence and cost budget. Any gain must survive both M0 and this ablation.

### Endpoints, in priority order

- **Primary measurement of practical interest:** proportion of correctly sourced, independently reviewable **cross-component incident reconstructions**, assessed on blind future cases by a predeclared rule-based/expert reference. Do not presume that a syntactically detected P12 breach constitutes a new MIHM-discovered incident. If no independent expert/reference observations are possible, outcome stays **UNKNOWN** and no primary success is claimed.
- **Secondary:** P12 detection on a version-matched rule set, measured for coverage/completeness and false positives; M0 is likely to be a ceiling baseline because it already contains the exact rule. A tie is a legitimate null result, not MIHM success.
- **Guardrails:** source-at-T0 admissibility, undocumented inferred edges, wrong authority claims, incorrect PASS vs SKIPPED interpretation, refusal/abstention calibration, provenance verification cost, total API calls, compute time where measured, and dollars only where directly charged/observed.

### Admissibility, design and stop rules

- Identify a stable check or explicitly model changes in its version. Changes to detector and affected source are covariates, not presumed causal effects.
- Enforce source-vintage filtering. A file fetched today at a historical immutable commit SHA is a historic source **proxy**, not independent proof of when the executor obtained that byte sequence.
- Preselect source eligibility, PR-level split, endpoint, statistical test, abstention penalty, verification-cost budget and failure/negative controls **before future outcomes**. No data-driven tuning on confirmatory groups.
- Evaluate independent groups and confidence intervals; use a sample-size justification based on a realistic effect and positive-event prevalence rather than arbitrary minimums. The current 2 P12-failure PRs do **not** support a confirmatory comparison.
- If source-based relational edges cannot be established for both treatment and M0 at the same cutoff, or if the target has no independent reference, **ABSTAIN**: do not fit, relabel source counters, or mint a scientific RETURN.
- Keep observation vs derivation vs inference separate. Freeze versioned protocol through the existing governed research owner only after explicit scientific admission; GitHub QA or Method Lab simulation are never a substitute.

## SFI precheck and impact boundary

- **Owner:** existing MIHM research program and GitHub source provenance; single writer unchanged.
- **Existing capability inspected:** GitHub Actions source receipts, canonical architecture rule, MIHM Foundation research contracts, G2/G3 experimental audit.
- **Absorb vs create:** extend existing MIHM-EXP-001; no new experiment platform or production monitoring loop.
- **Authority / execution / RETURN:** none expanded; this document is not a frozen experiment or institutional governance act.
- **Persistence:** draft research design on isolated PR branch; original source evidence is separately preserved in restricted Drive, not rewritten.
- **Cost / time / risk:** retrospective audit consumed API reads and GitHub CI minutes. A new recurring or prospective study may consume additional CI compute and reviewer effort, and is **not authorized by this draft**.
- **Rollback:** revert this draft without affecting any canonical evidence, production state or Φ formulas.

**Next actionable gate:** evaluate feasibility of source-grounded multi-file dependency resolution and an independent review reference, and identify whether the operational need is defect detection or auditable system explanation. Do not turn on a continuous CI collector until resource/authority constraints are approved.
