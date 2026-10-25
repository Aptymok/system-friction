# SFI MIHM — Independent Foundational Scientific Research Program

**Institution:** System Friction Institute  
**Program:** SFI-MIHM-FOUNDATION-001  
**Foundational research contract:** `SFI-MIHM-FOUNDATION-RESEARCH-0.1`  
**Stage:** `WORKING_SCIENTIFIC_FOUNDATION / NOT_EMPIRICALLY_VALIDATED`  
**Owner:** Existing SFI MIHM method and institutional science authority.  
**Date:** 2026-10-11  
**Publication dependence:** **NONE** on CIMPS 2026; that paper is a separately versioned application/submission and cannot govern the parent framework.  
**Subordinate extension:** MIHM-T, `DRAFT_UNFROZEN`.  

## 1. Foundational definition

**MIHM (Modelo Integral Homeostático Multinodo)** is SFI's meta-methodological framework for specifying **bounded systems whose states, relations, constraints, evidence and responses to perturbations co-evolve across possibly asynchronous timescales**. It is a research program plus implemented modeling grammar, **not yet an independently scientifically validated universal model or law**.

MIHM is not identical to any one instrument, any one value of Φ, the reduced-kernel `phi` compatibility alias, MIHM-T's time-lag experiment, the historical Knight case, or the CIMPS 2026 paper.

System boundary and observed object are not optional decorations: an observation is only interpreted relative to a declared **boundary, population, scale, method, time, evidence vintage, model version and falsification target**.

## 2. Explicit ontological structure (reuses SFI existing contracts)

The parent SFI model is `SfiSystemModelV1` and its boundary is `SfiSystemBoundaryV1`, **already defined** in `src/core/contracts/system.ts` under `SFI-SYSTEM-CONTRACT-1.0`.

A bounded descriptive candidate is:

```text
S_B(t) = (B, V, D, R, Q, C, X_B(t), P_B(t), H_B(≤t), E_B(≤t))
```

- `B`: explicit inclusion/exclusion rule; scope and assumptions.
- `V`: identified nodes (not a generic undifferentiated population).
- `D`: dimensions with units, observables, normalization and semantic roles.
- `R`: typed relations, including unknown or changing links.
- `Q`: flows with provenance and direction.
- `C`: constraints and conditions of viability, **not a postulated global optimum**.
- `X_B(t)`: **partially observed** system state; values may be `UNKNOWN`.
- `P_B(t)`: observed or hypothesized perturbations/interventions and operational authority.
- `H_B(≤t)`: temporal history, with event time distinguished from knowledge and record time.
- `E_B(≤t)`: admissible evidence at the declared information cutoff.

This is a **proposed scientific representation**, not a proven universal dynamics equation. It is invalid to infer existence, absence, causal identification or empirical homeostasis solely because a field was declared.

The existing SFI system entity kinds `NODE`, `DIMENSION`, `RELATION`, `FLOW`, `CONSTRAINT`, `STATE`, `FRICTION`, `PERTURBATION`, `TRAJECTORY`, `ATTRACTOR`, `TRANSITION`, `EMERGENCE` remain the authoritative vocabulary. An object's implementation status may be `DECLARED`, `FORMALIZED`, `EXPERIMENTAL`, `OPERATIONAL` or `NOT_IMPLEMENTED`; using the vocabulary does not assert observation.

## 3. Homeostasis is a testable process, not an attractive label

At each method/object scale, define:
- A declared set of viability constraints `C_B(t)` and observation interval/horizon.
- Observable performance, loss, capacity, recovery and degradation criteria with units.
- Candidate friction mechanisms: which constraints or desired transitions are obstructed, by which relation and under what perturbation.
- Alternative explanations, including ordinary distributed-system timing, safety engineering, incident management, control theory and statistical drift.
- Observation, action and RETURN receipts sufficient to test a claimed response. Neither passage of time nor an internal status flag alone constitutes homeostasis.

One useful future operational target is **constraint satisfaction/recovery under perturbations** compared against competent conventional alternatives with predeclared loss and uncertainty; its scoring procedure is *not yet frozen* here. A stable status can conceal a large unobserved failure and must not be treated as proof of homeostasis.

### Unknowns

`MISSING`, `NOT_ASSESSED`, `UNOBSERVED`, `INFERRED`, `SIMULATED` and `CONTRADICTED` are not numeric 0. Empty evidence cannot be silently converted into nonzero model observations, zero percent confidence, or institutional RETURN. Research logs and canonical evidence admission remain separate authorities.

## 4. Instruments are specializations of the parent, not the model itself

SFI's **existing** method-selection contract identifies the object, time, modality and purpose *before* choosing an instrument:

| Scope and instrument | Valid output | Prohibition |
|---|---|---|
| MOP-H — identified human session | `PHI_H` | No global personal identity or institutional state |
| ScoreFriction — bounded system | `PHI_S` | No automatic score from a missing source |
| PPOI — longitudinal phenomenon | `PHI_F` | Preserve underlying 0–5 composite |
| World Vector / WorldSpect — world context | `PHI_W` | Do not relabel world context institutional Φ |
| SFI institutional — SFI itself | `PHI_SFI` | Do not aggregate other Φ measures |

All five may use a normalized output range but **do not have shared units or the same estimand**. The `REDUCED_KERNEL_CONTINUITY` metric in `packages/mihm-core` is **not canonical Φ** and its legacy `phi` is not a sixth instrument.

Existing authority: `docs/MIHM_PHI_CANON.md`, `docs/canon/05_MIHM_METHOD_SELECTION.md`, `docs/canon/06_MIHM_PHI_FAMILY.md`. **This research plan does not change formulas, alter scales or canonize a new metric.**

## 5. MIHM-T derives from SFI MIHM (never the reverse)

`MIHM-T` extends a valid MIHM bounded frame with temporal dependency hypotheses. It MUST reference a declared parent system and two actual dimension identifiers within that parent. Its directed `SfiDimensionalTransferV0` fields include observable source/target, lag, direction, gain, attenuation, uncertainty, constraints, context and source lineage.

```text
SFI-MIHM parent (boundary, nodes, dimensions, sources, method)
  └── MIHM-T candidate (temporal dependencies / lag / possible transformation)
        └── bounded experiment (T0, comparable M0, M1, ablations, future RETURN)
```

`MIHM-DIMENSIONAL-TRANSFER-MODEL-0` remains **EXPERIMENTAL**: no assumed conservation law, calibrated gain, universal temporal relation, or physical backwards causation. A `RETROLONGITUDINAL` historical inquiry can traverse a documented RETURN backwards **analytically**, but this neither reverses real physical causality nor creates a prospective prediction that never took place.

**Parent-child gate implemented:** `src/lib/mihm/foundationResearchContract.ts`. It reuses `SfiSystemModelV1`, `SfiSystemBoundaryV1`, `SfiDimensionalTransferV0` and the existing method selector; it rejects mismatched boundaries, missing node/dimension IDs, unknown public-source dates at T0, model outputs represented as original real observations, transfer across absent parent dimensions and assumed cross-dimensional conservation. This gate verifies source and schema admissibility only, **not scientific model validity**.

## 6. CIMPS 2026 is a separate published-work track

The paper submitted to CIMPS 2026 may describe one application, evidence-core instrumentation, benchmark, or bounded validation. Even if accepted, publication review **does not grant canonical authority to formulas, prove cross-scale homeostasis, or invalidate alternative definitions by default**.

- Independent SFI MIHM: enduring parent hypothesis/ontology, versioned in this repository.
- MIHM-T: a child research instrument aimed at detecting temporal intervention effects.
- CIMPS 2026 manuscript: frozen *scholarly artifact* with its own methods/results/reviewer history.
- Knight Capital SEC case: real historical documentary case; retrospective example, not a blind predictive score.
- Zenodo: archival DOI and immutable version *of a specified artifact*, not scientific approval.

A major-change revision, acceptance, DOI or citation of the manuscript must not modify this parent contract automatically.

## 7. Falsifiability: candidate hypotheses with competent rivals

**F0 — Foundational representation sufficiency:** For predeclared tasks, provenance-preserving MIHM boundary/node/relation/constraint representations permit at least comparable reconstruction/forecast quality to conventional models at justified additional complexity. **Rival:** an ordinary graph, causal DAG, state-space or risk register is just as good or better.

**F1 — Cross-node specificity:** Correctly captured links add measurable generalizable value beyond the same node attributes without links. **Rival:** relations are redundant with sufficient node-state/features.

**F2 — Constraint/viability criterion:** A declared viability envelope and perturbation history improve discrimination of real degradation/recovery beyond uncalibrated heuristic integrity scores. **Rival:** a competent operations/safety control detects the same transitions with lower error/cost.

**F3 — Temporal incremental value (MIHM-T):** Explicit latency, pre-T0 latent links and heterogeneous clocks improve out-of-sample incident/intervention risk analysis relative to an equally informed conventional baseline **M0**. **Rival:** competent M0 performs as well and simpler.

**F4 — Cross-context transport:** A relationship learnt on one system predicts held-out systems only after verifying transport assumptions. **Rival:** effect fails out of domain (no universal invariant).

These are **research hypotheses**, not empirical results. A failed or null result is an admissible finding. PEMS is a proposed task-relative preservation property, not a global law.

## 8. Minimum scientific study architecture

Every eligible test must specify:
1. **Study unit and boundary:** entity/case, included/excluded systems, observation coverage.
2. **Variables:** measurable definitions, original units, instrument version, missingness policy.
3. **Knowledge times:** event, capture, document public availability and actual actor knowledge when a real receipt exists; `UNKNOWN` otherwise.
4. **Competing explanations:** credible M0/matched evidence, not a weak straw-man.
5. **Endpoint and falsification:** precommitted event, horizon, cost, uncertainty and abstention; prospective independent adjudication when predictive claims are intended.
6. **Authority and effects:** decisions ≠ grants, executions ≠ observed external outcomes, and sources ≠ canonical accepted evidence.
7. **Versioned reproducibility:** code revision, source register, preregistration freeze, negative examples, held-out/out-of-time validation, licence and contradiction audit.

## 9. Development milestones

| Milestone | Software/source output | Scientific gate |
|---|---|---|
| **M1 — Parent coherence** | Ontology, method map, typed parent-child validation, tests | Internal contract QA only |
| **M2 — Operational measurement** | Real bounded observations, missingness/time provenance, within-method formula tests | Traceable documented empirical measures |
| **M3 — Explanation** | Retrolongitudinal and forward models, mechanism/rival inventory | Counterexamples and competent explanatory controls |
| **M4 — Prospective contrast** | Independent blinded holdouts, predictive scoring + uncertainty | Precommitted falsifiable outcomes |
| **M5 — External validation** | Cross-organization replication, calibration/transfer study | Independent adversarial confirmation |
| **M6 — Publication** | Research Hub research object, DOI series and separately citable software/dataset versions | Source rights, reproducibility, appropriately scoped claims |

The current implementation is **M1 candidate only**. Knight documentary case contributes historical data for M2/M3; it does not complete M4–M5.

## 10. Zenodo relationship: WHAT will be deposited

The first Knight DOI should be a **bounded source-indexed historical research package** (Method Lab public derivative + source inventory, reproducibility instructions, code reference and explicit limitations). Zenodo permits attaching multiple files to a single record; a ZIP is optional. It **must not** include the complete proprietary SFI repository, restricted raw records or invented external RETURN.

A distinct later **SFI MIHM Foundation** DOI can archive the formal model definition, methods, scientific research hypotheses, tests and an immutable versioned artifact when the separate licensing/rights and review gates are satisfied. It should not be misleadingly titled \"MIHM Scientifically Validated\". The CIMPS paper can have its own citation/DOI without becoming the parent authority.

**Current repository deliverable:** one parent scientific-development program, one pure bounded parent-child verification function and CI tests. **No automatic canon, DOI, scientific validity result, operation or RETURN.**


## 2026-10-25 — F1 topology contrast implementation (experimental, not validation)

**Question:** Can a bounded MIHM-related representation detect a change in *which nodes relate to which*
when an existing reduced aggregate retains exactly the same node and edge counts?

**Status:** IMPLEMENTED_ON_WORK_BRANCH / SYNTHETIC_QA / NOT_EMPIRICALLY_VALIDATED.
This is NOT a preregistered prediction, independent replication, canonical Phi, MIHM-T law or observed-world RETURN.

**Existing capabilities reused:** packages/mihm-core/src/index.ts (reduced computation);
src/lib/mihm/scientificMethodRuntime.ts (NETWORK_SCIENCE local measures and CHANGE_POINT screening);
the foundation F1 cross-node-specificity hypothesis; existing SFI field scientific QA.
No new measurement methodology, data table, route, agent, scheduler or source registry is created.

**Proposed bounded comparator:** compareMihmTopology / MIHM-TOPOLOGY-CONTRAST-1.0.
It compares two snapshots only under a predeclared boundary, observer, typed relation semantics,
orientation and structural/temporal resolution. Inputs are explicit lists of stable node IDs and
typed edges, coverage, epistemic source labels, source references and observation times.
It returns STRUCTURAL_CHANGE, EQUIVALENT_WITHIN_PROTOCOL or INDETERMINATE;
node/edge count parity is reported separately. It rejects incomplete coverage,
unmatched boundaries and relation semantics, missing evidence references for
observational labels, bad endpoints, duplicate node identities and nonordered timestamps.
The structural component count is a descriptive weak-connectivity measure, not emergence.

**Adversarial fixture:** a six-node cycle and two disconnected triangles both have six nodes
and six edges. Aggregate counts remain equal while components change from one to two.
Additional controls include identity-preserving reordered edges, orientation, parallel edges,
unknown/partial coverage, observed-without-evidence, invalid endpoints, T0/T1 ordering
and changed boundary. All synthetic tests are labeled SIMULATED.

**Known boundaries:** node/edge labels and coverage are caller assertions; this comparator
does not adjudicate external evidence, quantify weights, identify ontological identity,
make predictions, or establish that a trajectory emerged. Topological difference alone is
not meaningful forecast skill. Equivalence is solely within the predeclared node/relation
protocol, never indistinguishability in principle. This is F1 instrumentation only,
not F1 empirical confirmation.

**Required development preflight:**
- Owner: MIHM Foundation / existing MIHM core and Method Lab research authority.
- Existing capability inspected: reduced MIHM computation; field NETWORK_SCIENCE and
  CHANGE_POINT; existing research program and missingness diagnostic.
- Absorb vs create: extend current MIHM core and existing QA; no parallel service or engine.
- Authoritative writer: unchanged; this function is pure and has no writer.
- Persistence / lineage: no database changes. Source lineage remains an input requirement;
  no output is persisted as institutional evidence.
- Front / back / DB delta: none / pure computation / none.
- Redundancy removed: none created.
- Execution / ROOT boundary: no action, permission, production or canon expansion.
- Rollback: revert the additive core export, QA addition and this program note.
- Verification: targeted synthetic QA, full typecheck and CI architecture/build required
  before merge. Confirmatory held-out comparison against competent baselines remains OPEN.

**Next gate:** compare structural features against competent graph-change baselines on
preselected source-vintage-safe data; independently adjudicate future outcomes. If the
structure-aware method does not improve performance, preserve the negative result.
