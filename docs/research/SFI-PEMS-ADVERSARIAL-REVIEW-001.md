# SFI — PEMS Adversarial Review 001
**Status:** `DOCUMENTARY_ADVERSARIAL_REVIEW / PARTIALLY_VERIFIED`  
**Recorded:** 2026-10-10  
**Original reviewer:** Claude, assessment supplied by the human researcher in conversation  
**Evidence boundary:** Claude expressly disclosed inability to read the assigned eight files or authenticate to SFI MCP. Its literature references were not independently reverified in that assessment. Repository cross-checks below were performed separately using GitHub reads and a governed Method Lab state/report read.  
**Authority:** This document is not a preregistration, protocol amendment, published scientific finding, or canonical promotion.

## 1. Relationship to the three experiments

**Master record:** [SFI Three-Experiment Convergence](./SFI-THREE-EXPERIMENTS-CONVERGENCE.md)

| Track | Original source | Current evidence boundary |
|---|---|---|
| LCI | [Preregistration v0.1](../../experiments/lci/preregistration-v0.1.json) | Internal `PREREGISTERED_EXPERIMENTAL` source status; this label is not an external registry receipt |
| SFI-DT EXP-001 | [Frozen experimental design](./decision-transfer/SFI-DT-EXP-001-FREEZE-CURRENT.md) | `EXPERIMENTALLY_FROZEN` / `AWAITING_NATURALISTIC_TARGET`; frozen arms and weights not amended |
| MIHM-T EXP-001 | [Unfrozen draft](./SFI-MIHM-T-EXP-001-PREREGISTRATION.md) | `DRAFT_UNFROZEN`; no confirmatory result |
| PEMS | [Master integrative tracking](./SFI-THREE-EXPERIMENTS-CONVERGENCE.md) | Proposed cross-task minimal-sufficient-structure property, not a fourth protocol or a universal identity invariant |

## 2. Claude's independent methodological criticism — preserved as proposals, not proven facts

The supplied review identified: insufficient independent timestamp attestation, potential equivalence of PEMS to known sufficiency/abstraction/viability concepts, need to separate artificial biography from model/seed/context, LLM contamination with well-known historical incidents, possible decision reactivity, and need for task-specific error tolerances and independent returns. It recommended strong conventional comparators, negative cases, independent holdout custodians, operational loss definitions and concrete refutation criteria.

Suggested PEMS alternatives were:
- *Predictive*: reduced representation retaining task-relevant predictive information out of sample.
- *Interventional*: retaining results under declared, independently evaluated interventions.
- *Viability*: retaining admissible intervention sets and viability-set membership under an explicitly identified model.

This is a **candidate taxonomy**, not a demonstrated equivalence between domains.

## 3. Cross-check against source contracts / GitHub PRs

### 3.1 Timestamp export issue — CONFIRMED, precisely delimited

The GitHub [PR #458 review comment](https://github.com/Aptymok/system-friction/pull/458#discussion_r3964610190) noted the export omitted `preregisteredAt` and the database `createdAt`. Inspection of [`preregistrationExport.ts`](../../src/lib/method-lab/preregistrationExport.ts) at export contract **1.2** confirms neither timestamp is surfaced as an explicit field in the exported stable payload.

**Important correction:** [`experimentContract.ts`](../../src/lib/method-lab/experimentContract.ts) does include `preregisteredAt`, and [`experimentPersistence.ts`](../../src/lib/method-lab/experimentPersistence.ts) persists and checks the hash of the full preregistration; the timestamp is therefore not simply missing from the source record. A standalone export is less auditable regarding creation/registration chronology; this is not proof that preregistration was tampered with.

**Proposed change, NOT EXECUTED:** carry a verifiable persisted creation timestamp plus declared preregistration timestamp, origin, and a linked attestation/receipt into the signed/hashed export. For future confirmatory claims, consider a third-party anchoring mechanism. A GitHub commit and public receipt can provide a distinct trace if genuinely committed before exposure, but are not automatically equivalent to a registered OSF protocol or independently controlled custody.

### 3.2 Control/variant export omission — FIXED, do not reopen as if current

The distinct [PR #458 review comment](https://github.com/Aptymok/system-friction/pull/458#discussion_r3964610188) identified missing `CONTROL` and `VARIANTS` in original export. [PR #459](https://github.com/Aptymok/system-friction/pull/459) corrected that. Current export contract v1.2 explicitly includes `POPULATION_SYSTEM`, `CONTROL`, `VARIANTS` and typed epistemic reproducibility references.

### 3.3 LCI controls — PARTIALLY DECLARED, IMPLEMENTATION NOT VERIFIED

The original [LCI preregistration](../../experiments/lci/preregistration-v0.1.json) already explicitly requires base-only, equal-token long-context, retrieval-memory, randomized biography, matched other-lineage biography and full CT controls; it includes founder-seed removal, cross-biography transplant and model transplant.

**Unresolved:** whether sufficient crossed-seed replications, randomization, independent sealed outcomes and power/precision rules have actually been implemented or executed. The claim that *none of these controls were defined* would be incorrect; the concern about their actual execution and adequacy remains valid.

### 3.4 SFI-A is related but not automatically LCI validation — CONFIRMED BOUNDED OBSERVATIONS

An authenticated Method Lab `state` read on 2026-10-10 returned `SFI-A` version 0.4: `FINDINGS_REGISTERED`, `MIXED`, `WORKING`, with metrics that declare two bounded identity episodes. Finding categories include:
- UNVERIFIED: provenance as identity constraint; need for validation of system identification.
- OBSERVED: identity/certification state separable in one institutional episode; versioned research-object continuity.
- DERIVED: boundary definition changes continuity judgments.

These findings concern **bounded institutional object/identity continuity**, not demonstrated biography-based out-of-sample `BPA`, `CLS`, `TCI` or the LCI confirmatory gates. The numerical metrics here are stored research-object metadata, not automatically evidence of two qualifying LCI experiments.

The same Method Lab state query showed `decisionTransfer.totalEvaluations=0` and `NOT_OBSERVED`. The convergence object `SFI-RESEARCH-CONVERGENCE-LCI-DT-MIHMT-001` remained `WORKING / NOT_TESTED / DOCUMENTED_NOT_EXECUTED`.

### 3.5 MIHM-T comparators / temporal effect — SCIENTIFIC DESIGN OPEN

Strong conventional comparisons should include domain-relevant incident analysis, safety-system constraints/STPA where suitable, monitoring/change-point tools (e.g. CUSUM) where appropriate, and causal alternatives when identification is feasible.

**Do not strawman M0** as naïve rollback. Prespecify which mechanism `intervention × pre-T0 latent dependency × clock coupling` generates a forecast distinguishable from a competent M0 using equally admissible inputs. Predefine the labels for aggravated intervention, adverse-result horizons, false-alarm costs and abstentions.

Famous incident reports including Knight Capital are informative retrospective calibration cases, **not genuine unseen prospective evidence** for an LLM potentially trained on them. Select controls without disaster and unfamiliar or prospectively collected cases. `n=3` can pilot feasibility, not establish reliable generalization or false-positive rates.

### 3.6 SFI-DT naturalistic reactivity — DESIGN THREAT TO VERIFY

The original [frozen protocol](./decision-transfer/SFI-DT-EXP-001-FREEZE-CURRENT.md) requires a real naturalistic target registered before reveal, frozen context and evidence, and validated temporal proofs.

If a human decision-maker sees the predicted decision before acting, the model itself becomes an intervention. The confirmatory protocol should prevent exposure to predictions before the human decision, record unavoidable exposure and handle outcome codification blind to the model's outputs. **Do not silently change frozen arms/weights**; evaluate these protections against existing operational contracts.

### 3.7 General PEMS / computational minimum — IMPORTANT QUALIFICATION

For a fixed finite dataset, exhaustive subset search is computable in principle, though usually exponentially costly; saying that *minimum is never computable* is too categorical. Identifying a universally valid minimum under arbitrary functions, unknown systems and general transformations may be undecidable or empirically unidentifiable. Report `SMALLEST_FOUND_UNDER_SPECIFIED_SEARCH` unless global optimality is actually established.

PEMS' cross-task common schema is a **research design convergence**, not evidence of a common invariant or a universal law. A true shared invariant requires clearly specified mappings between tasks and independently verified preservation properties, beyond merely using a common vocabulary of "state, clock, history, authority".

## 4. Open decisions — no invented values

| Priority | Decision or test needed | Why the study is blocked |
|---|---|---|
| P0 | Exact target function `F`, admissible historical data `H`, transformation family `T` and preservation invariants `K` per task | Without these, PEMS is too generic to falsify |
| P0 | Define task-specific loss `L`, noninferiority tolerance `delta`, calibration/uncertainty and error costs | No defensible universal percentage; avoid post-result tuning |
| P0 | Correct standalone preregistration export timing and determine acceptable independent anchor for confirmatory work | External consumers cannot directly inspect authoritative freeze chronology |
| P0 | Confirm LCI crossed controls, seeds, held-out targets and qualifying execution receipts | Declared protocol does not prove experiments ran |
| P0 | SFI-DT future target registry, predicted-output shielding and blind outcome coding | Known target / subject reactivity invalidates confirmatory comparison |
| P0 | MIHM-T concrete latent-history interaction, capable baseline M0 and rival predictions | Generic `f(x,u,h)` adds no independently testable prediction |
| P1 | Case inclusion/exclusion, adequate sample, positive/negative cases, contamination audit and external outcomes | Famous historical incidents cannot simply be treated as blind |
| P1 | PEMS ablations and out-of-sample specificity/noise tests | Preservation has not been measured |
| P2 | Cross-domain transfer hypothesis, mapping and refutation | Requires individually validated domains first |
| P2 | Governed Research Hub promotion/public editorial package | GitHub README and Method Lab `WORKING` are not publication |

## 5. Disposition and requested next scientific review

**Keep:** Claude's critique as useful *adversarial methodological input*, not an empirically validated external audit of files it did not read.

**Correct:** distinguish missing export timestamp from missing persisted preregistration timestamp; recognize the PR #459 correction; recognize predeclared LCI history/seed controls; avoid treating SFI-A episodes as LCI success; qualify the computability claim about minimality.

**Next review should produce:** an exact, source-cited invariant/loss/threshold decision table, a timestamp attestation design with QA, and a comparative plan including unexposed target handling and negative controls. The next Claude pass must inspect the eight real repository documents before signing off on their contents.

**No execution or promotion performed by this document.**
