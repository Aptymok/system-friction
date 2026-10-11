# SFI MIHM — Foundation Measurement and Falsification Protocol 001

**Program:** SFI-MIHM-FOUNDATION-001  
**Classification:** PROPOSED / NOT_FROZEN / NOT_VALIDATED  
**Parent:** [SFI-MIHM-FOUNDATION-RESEARCH-PROGRAM-001](./SFI-MIHM-FOUNDATION-RESEARCH-PROGRAM-001.md)  
**Scope:** Foundation MIHM only; MIHM-T temporal increment separately gated.  
**Date:** 2026-10-11

## 1. Purpose and boundaries

This document operationalizes the existing foundation research program without revising the canonical MIHM ontology, method selection or Phi family. The study asks whether a bounded multinodal representation adds independently verifiable value to adequately constructed alternatives. This is a **design proposal**, not an experiment run, preregistration freeze, scientific validation, canonical promotion or empirical RETURN.

Reuse the existing system contract (`src/core/contracts/system.ts`), MIHM parent-child gate (`src/lib/mihm/foundationResearchContract.ts`), method resolver, canonical Phi family, Method Lab experiment contract, Reality Chain and evidence provenance. Do not create a parallel database or evaluator.

## 2. Study target

**Primary unit:** a preidentified bounded system observed over a defined interval. Declare the boundary and inclusion/exclusion criteria before any outcome inspection.

**Eligible systems:** at least three identifiable interacting nodes, at least one predeclared operational constraint and an independently observable event or perturbation. A study may be performed with fewer nodes for a negative control, but that sample is not eligible for the primary multinodal claim.

**Exclude:** reconstructed systems with unavailable source chronology, only model-generated observations, lack of an independent outcome, undocumented selective exclusions, or intervention labels inferred from an outcome.

The study may begin with public open-source incident and system telemetry only when rights and original time availability can be audited. Historical cases are explicitly descriptive unless a true earlier information cutoff is reconstructible. One retrospective incident cannot substantiate prospective performance.

## 3. Hypotheses and competent rivals

- **H0 / null:** MIHM offers no practically meaningful incremental benefit at matched information, complexity and evaluation cost.
- **H1 / representation:** typed inter-node relations improve held-out event discrimination beyond a node-only feature model.
- **H2 / viability:** explicit constraint envelopes improve degradation/recovery discrimination beyond conventional operational threshold alarms.
- **H3 / temporal extension:** when MIHM-T is separately enabled, pre-cutoff lag and heterogeneous clock features improve performance beyond an informed temporal baseline. Do not claim H3 from parent-only tests.
- **H4 / transport:** claimed gains persist in held-out systems after explicit transport assumptions; otherwise report context dependence.

**Comparators** (adapt to actual target and freeze before opening outcomes):
- M0-A: transparent status-quo operational rules and alarms.
- M0-B: competent graph or state-space baseline with matched admissible information and tuning effort.
- M1-ablated: MIHM node features without relationships.
- M1-full: bounded MIHM representation with predeclared relations and viability envelope.
- M1-temporal: MIHM-T only after separate preregistration and proper pre-T0 features.

Ensure equal evidence vintages, training windows, outcomes, and access to node covariates. A straw-man comparator invalidates claims of improvement.

## 4. Observable outcome and scoring

For each case declare in advance:

1. Entity boundary, population, observation cadence, node count, edges, relation type, flow units and physical/organizational meaning.
2. Outcome definition: e.g., independently verified violation of a declared operational constraint in the next H time units; no outcomes invented from SFI status labels.
3. Horizon H, event rate, anticipated observation delay, and follow-up policy for censored or not-yet-known outcomes.
4. Classification metrics where applicable: Brier score and log loss for probability quality, precision/recall at precommitted thresholds, calibration slope/intercept, and explicit abstention rates. Do not substitute qualitative plausibility for actual endpoints.
5. Decision utility: predeclared missed-event and false-alarm costs, intervention cost, and an operational baseline; optionally report net benefit.
6. Uncertainty: clustered confidence intervals at *system* level and paired comparison on identical held-out outcomes; no arbitrary fixed confidence percentage.
7. Complexity and cost: model fit/search budget, data burden, computation, latency, annotator effort and added monitoring burden.

**Success rule is NOT YET SPECIFIED:** a minimum practically meaningful improvement threshold, one primary score and acceptable cost margin must be frozen using domain data and independent review **before** confirmatory testing. A statistically nonzero difference alone is insufficient.

## 5. Evidence chronology and missingness

Every observation must preserve:
- Original source ID, rights/access and provenance chain;
- event time, capture time, record time, first-publicly-available time, and actual decision-maker knowledge time *only if evidenced*;
- instrumentation and model version, units, observation quality, uncertainty;
- epistemic classification (OBSERVED, DECLARED, INFERRED, SIMULATED, UNKNOWN, etc.) and source-supporting artifacts;
- null/absent/withheld/contradictory status separately from a real numeric zero.

**Critical code-audit hypothesis:** `packages/mihm-core/src/index.ts` currently computes `avgValue` and `avgNti` by converting null node values to `0` and averages even when inputs are missing. The reduced kernel also substitutes zero for empty arrays in `average()`. This may bias numerical outputs by source coverage and should be tested against (a) explicit complete-case, (b) coverage-stratified evaluation, and (c) principled model-based imputation with disclosed uncertainty. These are competing *research variants*, not production changes. The reduced kernel's `phi` remains noncanonical `REDUCED_KERNEL_CONTINUITY`.

**Negative controls:** inject missing-source, delayed-source, randomly permuted edges, redundant edges, mismatched node IDs, only simulated sources and unavailable-at-T0 artifacts. The correct scientific outcome may be `ABSTAIN/INSUFFICIENT_EVIDENCE`, not 0% confidence or a synthetic observed value.

## 6. Data split and leakage controls

Group splits by **system** (not random records of the same system). Use strictly forward chronological out-of-time splits for forecasting. If sufficient systems exist, reserve an independent external holdout. Freeze target, variables, estimands, candidate relations, metric versions, thresholds and exclusion rules before any holdout is opened. Register every exploratory post-hoc change as exploratory; never reclassify its success as preregistered.

A retrospective reconstruction can test reproducibility and explanation only, not claim blind prospective forecasting. MIHM-T's `DRAFT_UNFROZEN` status stays unchanged.

## 7. Failure and rejection criteria

Reject or narrow H1 if performance advantage disappears under node-only or randomly rewired controls. Reject or narrow H2 if ordinary operational alarms match or exceed recovery detection at equal cost. Reject claims of transport if held-out systems reverse the signal. Abstain where evidence coverage or origin cannot be verified. Report failures and contradictions with the same prominence as successes.

A formal theory claim requires a demonstrated causal/mechanistic account or clearly bounded statistical estimand; correlation, network visualization and an attractive metric are not sufficient.

## 8. Integration with existing SFI chain

**Definition:** this research protocol is an unapproved candidate under SFI-MIHM-FOUNDATION-001.  
**Registry:** reference existing methodology registry; do not add a rival.  
**Runtime:** existing MIHM core and Method Lab facilities, only after research authority/validation.  
**Caller:** existing approved Method Lab or authorized research workflow.  
**Persistence:** existing evidence/research object and case receipts, provenance separated from public outputs.  
**Authority:** scientific research design ≠ canon, production deployment or real-world intervention.  
**Execution:** no experiment executed by this document.  
**RETURN:** requires independent measured outcome, not document publication or code QA.  
**Learning:** compare results with hypotheses, revise only through explicit scientific and governance review.

## 9. Next executable gates

- **G1 — Audit:** construct unit tests showing actual output differences between missing vs true zero for the current reduced kernel. Preserve current behavior; document warnings.
- **G2 — Dataset feasibility:** identify one admissible bounded dataset with source dates, independently adjudicated outcome and valid rights; produce a source register.
- **G3 — Comparator:** implement an ordinary transparent M0 with matched inputs, plus MIHM relation ablation; calculate incremental value on training only.
- **G4 — Freeze:** decide one primary endpoint, margin, horizons, inclusion rules and protocol registration before held-out data.
- **G5 — Contrast:** run blinded holdout and publish results including negative/null outcomes. No implication of external replication.

**Present gate:** G1 + G2 OPEN. **Empirical performance:** NOT_OBSERVED. **Canonical change:** NONE. **Prospective RETURN:** NONE.
