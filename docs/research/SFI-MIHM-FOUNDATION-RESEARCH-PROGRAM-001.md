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


## 2026-10-25 — NYC311 first real-data exploratory comparator (F1/F3 feasibility)

**Scientific status:** EXPLORATORY_RETROSPECTIVE / NOT_PREREGISTERED / NOT_INDEPENDENTLY_VALIDATED.
This result is separate from the F1 topology software diagnostic in draft PR #840. It does
not establish a MIHM law, physical failure prediction, or incremental skill.

**Bounded source and provenance:** third-party public aggregate
[buildwithsakthi/nyc-311-dashboard](https://github.com/buildwithsakthi/nyc-311-dashboard)
at commit 18b0c1d0073046fa8270cd17caef39509596fac3, path
data/daily_totals.csv.gz, Git blob SHA
2ba911001d0b17e3edc56b27384e395172fc6fb1.
The publisher's prepare_data.py reconstructs this from the official
[NYC Open Data 311 requests](https://data.cityofnewyork.us/d/erm2-nwe9) with a SoQL
daily group by borough. We independently parsed the static aggregate;
we did not re-query or validate individual underlying city records.
Recorded 1,825 day/borough aggregate values, 365 consecutive dates
2025-07-01–2026-06-30, complete coverage for Manhattan, Bronx,
Brooklyn, Queens, Staten Island. The source was retrieved after the event
times. Therefore these are retrospective calculations, not predictions
that were actually issued on the original dates.

**Task:** predict daily Manhattan 311 request count for day t from
only previous daily five-borough counts and the target calendar day.
The number of requests is an administrative reporting endpoint, not
an independently verified physical infrastructure incident or crisis.

**Train/validation/held-out chronology (exploratory; not preregistered):**
- Training: 2025-07-29 through 2026-03-07, 222 days.
- Validation: 2026-03-08 through 2026-04-16, 40 days.
- Retrospective test: 2026-04-17 through 2026-06-30, 75 days.
- Ridge alpha grid [0.1, 1, 10, 100, 1000] selected from the
  validation segment separately for each method; no test-day input
  appears in that day's features. The static historical source cannot
  independently certify each day's originally available source vintage.

**Comparators at matched input access:**
- Weekly naive: same weekday in previous week.
- M0 conventional: log-count ridge with 22 prior-count,
  rolling-history and calendar features from all five boroughs.
- M1 exploratory MIHM-inspired: same M0 plus 14
  lagged cross-borough shock, dispersion and interaction features;
  the learned relationships are hypotheses, not validated causal edges.
  M1 is not a canonical MIHM instrument or new Phi formula.

**Observed exploratory scores, 75 test dates, smaller is better:**

| Model | MAE (requests/day) | RMSE (requests/day) |
|---|---:|---:|
| Weekly naive | 208.2267 | 296.4653 |
| Conventional M0 ridge | 155.0787 | 197.5038 |
| MIHM-inspired M1 ridge | 153.7456 | 198.5988 |

M1 MAE difference (M0–M1) = +1.3330 requests/day
(~0.86% lower MAE), but M1 has worse RMSE.
Of 75 dates, M1 has lower absolute error on 38 and higher on 37.
Exploratory 7-day block-resampling 95% interval for the mean
MAE difference: [-4.2736, +9.7437] requests/day (crosses 0);
this does not correct for model search, non-independent publication,
or data-vintage errors. **Conclusion: no reliable MIHM advantage
demonstrated.** Preserve both the small favorable MAE contrast and
unfavorable RMSE rather than choosing one to claim success.

**Reproducibility:** scripts/research/mihm-nyc311-exploratory.mjs.
Built-in source fingerprint check rejects mutated input.
Use --self-test (synthetic smoke test), --file=PATH for an authorized
locally saved gzip, or --fetch for a bounded explicit public fetch.
A local synthetic self-test of an equivalent prototype passed; the
repository version still requires its own CI/test verification.
No database writes, autonomic monitoring, production mutations,
external deployment, canonical changes, or publication were executed.

**Learning/next discriminating test:** F1 cannot be considered supported
by a tiny unreplicated difference. Prefer an independently defined
future endpoint, source-vintage-preserving extracts, predeclared
performance and loss thresholds, seasonal/time-series and conventional
dynamic graph competitors, node-only ablation, randomized-link
controls, time-blocked grouped validation, source-lag audits, and
out-of-domain replication. Incorporating MTA/weather must first
justify spatial and temporal crosswalks. Do not conflate coincident
borough counts with causal propagation. If competent M0 still ties
or wins, keep the result negative and avoid adding complexity.

**Constitutional preflight:** Owner SFI MIHM Foundation;
script reuses existing research program and ordinary Node runtime
rather than another app, registry, agent or database. Authoritative
writer remains unchanged; source is read-only. UI/backend/DB changes:
NONE/NONE/NONE (standalone opt-in research script only). Rollback:
revert research script and this appended research note; all persistent
institutional datasets and formula contracts remain untouched.


### 2026-10-25 — FDNY INDEPENDENT-OUTCOME EXPLORATORY CONTRAST

Status: **EXPLORATORY / NOT_PREREGISTERED / NOT_SCIENTIFICALLY_VALIDATED**.
Owner remains SFI-MIHM-FOUNDATION-001, no external authorization, DB changes,
production mutation, new instrument registry, canon modification or real-world
intervention. This section specifies the experimental task and algorithm before
the first live FDNY query on the PR-specific CI run; it is not a third-party
preregistration or independent study.

**Independent institutional endpoint.** Official FDNY Fire Incident Dispatch Data,
NYC Open Data dataset 8m42-w767:
https://data.cityofnewyork.us/d/8m42-w767 . It contains records of dispatches
from Starfire CAD, not independently adjudicated physical failure or crisis.
The official October 5, 2026 publication is annually updated, so a retrospective
FDNY daily count available now **cannot** be treated as an actually issued
real-time forecast in each historical T0.

**Source/census:** bounded Socrata SoQL aggregate for event local date and
incident borough with inclusive lower event date 2025-07-01 00:00:00 and
exclusive upper date 2026-07-01 00:00:00. No raw incident locations, IDs,
personal or precise-address records are retrieved or stored. Manhattan,
Bronx, Brooklyn, Queens and Richmond/Staten Island borough labels must map to
five declared spatial groups. All 365 dates and 5 boroughs must have observed
rows, otherwise **ABSTAIN**: missing rows cannot silently be imputed as zero.
Record query URL, raw-result SHA-256, row count, total grouped dispatches,
code version and source last-update metadata.

**Predictand and split:** next-day Manhattan FDNY dispatch count, 365 dates
2025-07-01–2026-06-30. Training 2025-07-29–2026-03-07 (222 days),
validation 2026-03-08–2026-04-16 (40 days), evaluation
2026-04-17–2026-06-30 (75 days); all features for target day t use
historical day t−1 or earlier. A weekly FDNY t−7 naive predictor is
included.

**Competing algorithms:** all use log1p response with ridge and a
validation-selected regularization strength in [1,10,100,1000,10000].
All reference fitting, scaling and tuning use pre-evaluation rows only:
- M0: FDNY prior Manhattan history, weekly/monthly patterns, day of week.
- M1: M0 + five boroughs of NYC 311 daily lag-1, lag-7, trailing-7 counts.
  This measures value of an extra source, *not MIHM value*.
- M2: M1 + lagged prior 311 borough perturbation ratios, cross-borough
  dispersion, previous FDNY change × 311 change interactions.
  **M2 is MIHM-inspired only, not canonical MIHM; its engineered covariates
  are not proof of actual causal relations or cross-node flows.**
- Outcome contrast: M1 vs M0 (additional-data effect); M2 vs M1
  (interaction feature effect), using held-out MAE, RMSE, signed bias,
  candidate better/worse days, and exploratory 7-day-block resampling
  (1000 draws). Report null/inconclusive findings; no guaranteed gain.

**Pre-announced interpretation:** only if M2 improves a meaningful
out-of-time primary loss with robustness across competent alternative
temporal and graph baselines may it motivate a separately preregistered
MIHM instrument-specific validation. This pilot alone cannot establish
a universal mechanism, scientific originality or independent
cross-domain transfer. A difference smaller than its uncertainty range
or worse RMSE is reported as **no demonstrated superiority**, not success.

**Software/test gate:** scripts/research/mihm-nyc311-fdny-contrast.mjs.
Runs pure local synthetic QA with --self-test. Real data query is
--fetch, opt-in, bounded by source byte/time limits, no writes.
For this working draft PR only, the existing SFI Verify workflow
attempts one official aggregate query and reports results in CI logs.
External source failure is not suppressed as scientific evidence;
the step may be unavailable without invalidating the offline
code build. Sources are later-vintage; empirical prediction skills
are NEVER promoted to prospective results from this retrospective sample.

**Further required scientific controls:** independently dated incident
outcomes, verified publication vintages and lags, comparably rich
seasonal/count baselines and existing dynamic-network methods,
ablation of explicit typed edges vs randomized/permuted edges,
mechanism and admissible MIHM identity/constraint/lag semantics,
cost/error thresholds frozen ahead of a future untouched holdout,
and an independently replicated result before promotion.


#### FDNY RESULT 2026-10-25 — observed external-data contrast, negative incremental finding

**Executed, not merely specified:** SFI Verify GitHub Actions run
[40181990666](https://github.com/Aptymok/system-friction/actions/runs/40181990666),
job [121134783420](https://github.com/Aptymok/system-friction/actions/runs/40181990666/job/121134783420),
at 2026-10-25T09:46:47Z. Successful bounded official FDNY aggregate read,
successful synthetic guards, 1,825 (365 days × five boroughs) aggregate
FDNY observations and 1,825 NYC311 observations. The FDNY query covers
688,649 total Starfire dispatch records, **all boroughs combined**,
from 2025-07-01 through 2026-06-30 (not 688,649 Manhattan-only calls).
No source row or personal address was stored in this PR.

FDNY raw SoQL **response SHA-256**
0a266a1a1d58b8f51d2f12b56c9435da5cd288c3dba19714c1d911e5cc6e9b43;
NYC311 pinned blob SHA
2ba911001d0b17e3edc56b27384e395172fc6fb1.
Re-query later may give a different SHA because FDNY publishes/revises
data annually. The exact query URL and generation code are in the
read-only script and GitHub Actions logs. This note records the
observed result; it does not claim that the extracted aggregate is
immutably archived independently of the originating service.

**Held-out retrospective period:** Manhattan daily dispatch counts,
75 days 2026-04-17–2026-06-30. Ridge alpha chosen exclusively on
2026-03-08–2026-04-16 after train 2025-07-29–2026-03-07.
All models use prior-day or older covariates.

| Comparator | Features | Selected ridge alpha | MAE (dispatches/day) | RMSE |
|---|---:|---:|---:|---:|
| FDNY t−7 naïve | n/a | n/a | 52.0400 | 67.6602 |
| M0: prior FDNY + weekday | 12 | 1 | 38.1457 | 46.7596 |
| M1: M0 + lagged five-borough NYC311 | 27 | 100 | 36.8111 | 45.8792 |
| M2: M1 + proposed cross-source interactions | 45 | 100 | **37.5571** | **46.2933** |

**Incremental M1 − M0:** M1 lower MAE by 1.3346 dispatches/day;
exploratory seven-day block bootstrap interval for paired improvement
[−0.5786, +3.5288]; 44 days M1 better, 31 worse. Interval spans 0:
**new-source value not established robustly**.

**Incremental M2 − M1:** M2 higher (WORSE) MAE by 0.7460
dispatches/day, higher RMSE by 0.4140. Mean paired improvement in
MAE, defined positive for benefit, is **−0.7460**; exploratory
seven-day block bootstrap interval [−1.3457, −0.1611];
33 days M2 better, 42 worse. Interval excludes 0 under this
conditional exploratory resampling, but is NOT a confirmatory
significance result and does not include researcher decisions,
historical publication vintage uncertainty or data/target selection.

**Scientific disposition:** reject this particular M2 engineered
lag-shock/interaction feature set *for the evaluated task and data*;
do not promote it as an MIHM advance, change canonical Phi or infer
MIHM itself is refuted. M2 is not a full implementation of MIHM.
Keep M0/M1 as valid baselines for the *next* independently sourced,
mechanism-specific trial. Additional features and paper trails are
not sufficient progress; identify an actual declared constraint,
typed cross-system relation, observation lag or controlled
perturbation before adding feature complexity.

**Limits:** this is a retrospective, one-system, research-selected
period without formal prospective pre-registration; FDNY 311 daily
snapshots were obtained after their event dates; no historical
as-of-T0 publication timestamps can be reconstructed from this
snapshot alone. Request reports are not incident counts, and
incident dispatches are not physical failure adjudications. This
is meaningful empirical negative evidence about the **candidate
feature representation**, not proof of generalized scientific value
or failure of the complete MIHM program. No institutional RETURN,
commercial adoption, independent replication, production or
authority mutation occurred.

**Resource gate closed:** after this first bounded research run
the GitHub Actions auto-fetch was disabled; CI retains only
the offline synthetic scientific guards. An intentional source
re-extraction requires explicit running of the script with --fetch.


### 2026-10-25 — F2 capacity/response falsification protocol, before accessing new outcome

**Research class:** EXPLORATORY FOLLOW-UP, NOT PREREGISTERED, NOT EMPIRICAL MIHM VALIDATION. No normative claim of safety. This is a separate response-time outcome chosen after the negative count-prediction interaction study; its holdout is chronological, not a novel independent cohort. The hypothesis is a measured load/response proxy, not an actually identified personnel/equipment bottleneck.

**Object/boundary:** Fire Incident Dispatch Data, official dataset
https://data.cityofnewyork.us/d/8m42-w767, five declared NYC boroughs, 2025-07-01 through 2026-06-30. For each day/borough, a purely aggregated SoQL query reads total dispatch count. A second query reads count and mean incident_response_seconds_qy for records with valid_incident_rspns_time_indc='Y', response seconds within [60,7200]. This is a predeclared eligibility/quality filter, not a city certified performance standard. Both queries use event date and are bounded to 1 MiB and 5,000 grouped records; no addresses or incident IDs are downloaded.

**Quality/abstention:** require 365 complete consecutive days x 5 boroughs, unique day/borough, matching dates, finite valid response metrics and Manhattan eligible/total ratio in [0.30,1] throughout. Otherwise stop with diagnostic, never zero-fill or infer outcomes. Record two aggregate query URLs and SHA256. NOTE missingness could still be non-random and the ratio is not a confidence claim.

**End point:** Mean eligible first-on-scene incident response seconds for Manhattan on day t, predicted from prior-day-or-older observations of the same FDNY source. A change in daily average seconds is NOT proof of resource shortage, human injury, or resilience. Hypothesis F2: prior measured call pressure relative to a train-defined observation envelope and prior response state predict next-day response beyond an ordinary flexible nonlinear autoregressive competitor.

**Provisional operational envelope:** 90th percentile of Manhattan daily dispatch counts among the first 250 original dates (2025-07-01 through 2026-03-07), determined only with pre-test training data. Descriptive stress flag only. Eligible per-day response time is not allowed in same-day predictor.

**Comparison specified in research code BEFORE the first new FDNY response query:**
- Naive: previous week's eligible average response seconds, t-7.
- M0 (competent nonlinear statistical baseline): day of week; Manhattan eligible response lags t-1/t-7/t-14, trailing response average t-7; FDNY dispatch count lags t-1/t-7 and trailing load average t-7; squared log count, weekly log load difference and its square, count-times-response interactions. Log1p ridge with training-only feature normalization.
- M1 (MIHM-F2-inspired only): exact M0 plus four train-threshold-based proxies: yesterday's excess load above p90, 7-day mean excess load, positive load-stress release t-2 to t-1, and yesterday's load stress times prior response state.
- Both tune alpha in [1,10,100,1000,10000] on validation period only, then refit on train+validation before testing.
- Train: 2025-07-29–2026-03-07 (222 observations); validation: 2026-03-08–2026-04-16 (40); test: 2026-04-17–2026-06-30 (75). Exactly the same dates, source, normalization opportunities, outcome and target for both.
- Score: held-out MAE seconds (primary exploratory), RMSE seconds and signed bias, paired candidate better/worse days, fixed-seed 7-day block resampling 1500 iterations of MAE difference M0 minus M1. A positive MAE gain with uncertainty crossing zero is inconclusive; negative means M1 worse. No retroactive tuning on test; keep all unfavorable metrics.
- No cost utility/calibration claims: this is a continuous target, not a prediction of event probabilities.
- No causal conclusion from time precedence, no real perturbation performed, no claim of actual homeostasis or full MIHM validation, no canonical Phi.

**Runtime and governance:** script scripts/research/mihm-fdny-capacity-contrast.mjs, Node built-in only, pure stateless output. One intentional bounded external aggregate read can execute on this PR's CI for an exploratory result; subsequent automatic external reads must be disabled after result receipt. Tests must execute offline and reject present-day target leakage, source gaps and invalid coverage. Reuse MIHM Foundation program; no database, UI, pipeline, worker or registry addition; no automatic institutional RETURN or publication. Preserve old M2 as negative rather than optimizing it until it appears to win.

**Next scientific acceptance condition:** If empirical M1 does not surpass M0 on untouched dates with error costs and source vintage independently audited, the F2 proxy is unsupported in this setting. If it appears better, evaluate ordinary alternative threshold/control models and out-of-sample independent timing (not a single selected pilot) before elevating MIHM.


#### 2026-10-25 — F2 RESULT: threshold/load proxy did not improve prediction

**Executed external official FDNY aggregate read** in SFI Verify
[run 40183276572](https://github.com/Aptymok/system-friction/actions/runs/40183276572),
job 121138648316, at 2026-10-25T10:05:31Z.
Offline simulated QA PASS followed by two 1 MiB-bounded official Socrata
queries covering 2025-07-01–2026-06-30, 365 daily observations for each
of five boroughs per query (1,825 aggregate rows/query).

- Official dataset: https://data.cityofnewyork.us/d/8m42-w767 .
- Unfiltered 688,649 dispatches across all five boroughs; response-valid
  [60,7200] second observations 490,704, all boroughs, using provider validity flag.
- Full-count response SHA-256:
  0a266a1a1d58b8f51d2f12b56c9435da5cd288c3dba19714c1d911e5cc6e9b43.
- Filtered time-response aggregate response SHA-256:
  1e1ceeb7042b1e071602c04e0829006351b41ba442ba249692a67e279e58fd6b.
- Manhattan minimum eligible fraction observed 0.6009; mean 0.6800
  (eligible response subset, **not** proof of unbiased representative times).
- Training 90th-percentile daily Manhattan dispatch count = **536**, a research
  data-derived *stress proxy*, NOT an FDNY service-capacity threshold.
- Chronological train 222, validation 40 and retrospective test 75 dates.
  Neither original as-of-T0 publication provenance nor formal independent
  confirmation was available.

**Held-out test, Manhattan daily eligible first-unit mean response, seconds:**

| Candidate | MAE seconds/day | RMSE seconds/day | Interpretation |
|---|---:|---:|---|
| Last-week response naive | 13.3419 | 17.1893 | Basic seasonal comparator |
| Conventional nonlinear autoregressive ridge M0 | **9.1562** | **11.9252** | Same measured FDNY histories and pressures |
| F2 pressure-envelope/possible recovery candidate M1 | 9.2303 | 11.9907 | Adds four stress and lagged interaction proxies |

**F2 M1 versus M0:** MAE *worsened* by 0.07404 seconds/day and
RMSE worsened by 0.06555 seconds/day. M1 has lower per-day absolute
error on 29/75 dates, higher on 46/75. Mean MAE gain M0−M1
**−0.07404**; seven-day block bootstrap 95% exploratory interval
[−0.18496, +0.01022], crossing zero. Hence **no reproducible,
meaningful or statistically confirmed advantage demonstrated**.

**Scientific conclusion:** the proposed conditional load-stress
and response-state interaction features are **not empirically
supported as incremental predictors in this scope**. Do not
change thresholds post hoc or add more free-form interaction
features to rescue M1 on this retrospective test. No perturbation
was performed. Measured call volume alone is not actual
staffing/equipment availability, system resource constraint,
causal process, or homeostatic recovery. The aggregate response-time
endpoint also uses eligibility filtering and can change with
dispatch composition. F2 is not scientifically falsified globally:
we rejected an inadequate operational proxy, not a formal universal
law or the canonical MIHM method.

**Scientific program control:** three exploratory tests now exist:
(1) F1 topology comparator ties an ordinary graph detector in synthetic
fixtures; (2) FDNY count-prediction lagged cross-source interactions
were measurably worse than FDNY+311 without them; (3) FDNY response-time
F2 candidate did not improve matched nonlinear M0.
**Stop adding arbitrary topology/time interaction features to the
same hindsight sample.** Only resume external predictive testing
with a declared, independently observed mechanism: actual capacity
indicators such as unit availability/assignments or explicit
intervention and RETURN with time provenance, plus an independent
future prospective outcome, credible conventional controls,
ablation, pre-registered margin and no source-vintage leakage.

**Resource discipline:** one live F2 data read executed in CI;
the external call is now disabled from recurring CI checks.
The pure offline synthetic F2 self-test remains active. No source
row storage, institutional RETURN, new DB, API, deployment,
permission or canonical formula was changed. Outcome retained
unchanged, including negative findings.


## 2026-10-25 — Program correction: Manhattan MULTIPLEX, not FDNY-only

**Founder correction accepted:** Manhattan was selected as a convergent,
multi-instrument city-system research field, not as an excuse to
optimize a single emergency-dispatch series. Prior NYC311/FDNY and
F2 experiments remain valid as bounded, negative/inconclusive studies,
but they cannot define the scope of the MIHM scientific question.

**Foundational testable question:** within ONE declared urban boundary
and common time protocol, do changes in the interaction/constraint
structure of multiple independently observed systems anticipate
changes across more than one external outcome, beyond competent
time-series and multivariate statistical models supplied with the
same histories? Correlation alone is not a measured cross-domain
mechanism or a new operational identity.

**Restored observation plane:**
1. NYC311 erm2-nwe9 — citizen service-request activity, Manhattan borough,
   event-created local day; do not equate requests with incidents.
2. FDNY dispatch 8m42-w767 — dispatch load and eligible response-time,
   Manhattan borough; do not treat dispatches as resource availability,
   confirmed failure or causal propagation.
3. MTA hourly subway ridership 5wq4-mkjj — estimated station-complex entries
   at hour/fare grain, Manhattan station-complex borough only; same-day
   aggregate needs daylight-saving, station-complex and mode controls.
4. DOT EZ Pass Readers 6a2s-2t65 — speed observations of links;
   **NOT spatially admitted as Manhattan until verified link geometry/
   borough crosswalk and historical availability**.
5. NOAA Central Park GHCND USW00094728 — daily rainfall/temperature at
   a physical station, not automatically climate across all Manhattan;
   require actual observation and publication dates; observational covariate.
6. FDNY NYFIRS units-on-scene tm6d-hbzd — useful operational-resource
   *candidate* only; portal last updated 2025-10-10, cannot assume
   2026 event overlap, availability at historical T0 or real spare
   resource capacity. **QUARANTINE** pending temporal evidence.

All data-source URLs and join candidates must be checked with
scripts/research/mihm-manhattan-multiplex-preflight.mjs, using
--self-test (no network) or a single explicit --inspect (bounded
metadata only). All events must retain event date, extract date,
publication-vintage policy, spatial scope, aggregation grain,
source revision fingerprint, coverage, estimated/observed/derived
epistemic type, and missingness. A table with 4 numbers on one day
is **not** evidence that their causal networks converged.

**Scientific correction — calibration is required, not forbidden.**
Within training and calibration folds, revise features, thresholds,
parameter priors, network assumptions, candidate representations,
evidence admissibility, lags and failure models according to
actual outcomes. Keep complete versioned hypotheses and negative
controls. Do NOT optimize repeatedly using one evaluation segment
and then call that segment untouched independent evidence.
Once a new model version has been developed, freeze its version and
re-evaluate on later non-consulted time blocks or independent
systems. After seeing that evaluation, it may fuel the **next**
calibrated version, not retrospective certification of the old one.
This is active learning, not a permanent prohibition on improvement.

**Next bounded task — source-admission first, model afterward:**
(1) inspect schemas of 311, FDNY, MTA, DOT and historical FDNY
resource data without downloading incident/station rows;
(2) reject inaccessible/misaligned spatial and time joins;
(3) before extracting a common panel, freeze intended endpoints
(daily Manhattan FDNY response, NYC311 volume, MTA entries, DOT
traffic speed) and a multi-target conventional M0 and
well-calibrated multivariate M1; only then introduce separately
specified MIHM-like source interaction/viability terms as M2;
(4) compare across outputs and disturbances with full negative
controls and abstention, not simply choose whichever metric improves;
(5) reserve future temporal block for genuine out-of-time evaluation
and report dates of real data publication as unknown where unknown.

**Operational preflight:** Authoritative MIHM Foundation project stays
owner. Data access is read-only; no case, ROOT authority, commercial
instrument, new database, API service, privileged agent, production
deployment or canonical Φ modification is authorized or performed.
All previous results remain preserved. Reversal: revert source
feasibility script and this appendix. Follow existing Method Lab
registration, permissions and scientific-admission gates for any
future real-world monitoring or formal evidence record.

### 2026-10-25 — First observed four-domain Manhattan daily panel

A **read-only aggregated source execution** produced seven aligned Manhattan days
(2026-03-01 to 2026-03-07) for NYC311 service-request counts, FDNY
dispatch counts, MTA estimated subway entries and DOT arithmetic mean of
link-sample median speeds in feet per second. All four sources returned
7/7 calendar days without missing or invalid aggregate values.

Execution: https://github.com/Aptymok/system-friction/actions/runs/40188171235 .
Immutable-in-Git review copy with source-response SHA-256 fingerprints:
docs/research/evidence/MIHM-MANHATTAN-FOUR-SOURCE-2026-03-01.json .
Repeatable, explicitly opt-in query:
scripts/research/mihm-manhattan-four-source-week.mjs --collect .
Offline fixture integrity test stays in SFI Verify. External automatic
queries were removed after execution.

**Limits:** This is a seven-day observation for pipeline admission, not
sufficient training data or a claim of model improvement. DOT aggregates
are nonrepresentative unweighted averages of link samples pending
link/exposure audit. Dates of original availability at each T0 are
unknown; source snapshot publication can occur after events.
No retrospective cross-domain causation, recovery mechanism or
canonical MIHM validation is established by this panel.

**Next:** extend provider-consistent daily coverage through the
preselected development/calibration periods using bounded aggregations,
evaluate source-vintage and source-lag bias, and keep later dates outside
calibration. Only then compare M0, M1, M2 and equal-complexity placebo
for each target, preserving negative outcomes.


### 2026-10-25 — March source expansion: bounded negative data-quality finding

**Attempted extension to 31 aligned Manhattan daily dates (2026-03-01–2026-03-31):**
official read-only aggregation was invoked in existing SFI Verify branch CI:
[run 40190221769](https://github.com/Aptymok/system-friction/actions/runs/40190221769),
[run 40190635996](https://github.com/Aptymok/system-friction/actions/runs/40190635996)
and [run 40190948687](https://github.com/Aptymok/system-friction/actions/runs/40190948687).

- In the **first run**, NYC311, FDNY and MTA all returned **31/31 daily aggregate rows**;
  source SHA256: 311 `f720fef985823598165dc4b4caea3fd892d28a3ceb6580ed597792229c137aa0`;
  FDNY `7aea7193b6ac97a00dfd01f7dbf05c701e4e06c9e2370d998b0fea1a3c555c9d`;
  MTA `193cb65a17d47c8bbc8de125c1762466208392b12ceca04483a96735038bb613`.
  The DOT month-wide `avg(median_speed_fps)` plus sample-count-weighted speed,
  observation counts and `n_samples` query timed out at the declared 45-second cap.
- In the second run, bounded weekly DOT weighted sample queries also timed out.
- In the third run, simpler DOT unweighted weekly queries **and MTA** timed out,
  despite MTA having succeeded earlier. Do not infer data absence from these
  source/server/request-limit failures. The calculation returned
  `INDETERMINATE_DO_NOT_CALIBRATE`, even though the GitHub step exit status was
  success (the source experiment intentionally reports abstention without
  failing the entire SFI build).
- **Actual preserved partial data:** 31 days of NYC311 and FDNY daily counts in
  `docs/research/evidence/MIHM-MANHATTAN-PARTIAL-MARCH-2026.json`,
  independently cross-checked against the original seven-day four-source
  observation fixture by offline QA. MTA full-month coverage is recorded by
  source-response SHA and run log but raw aggregate values from that first
  read were **not persisted**. Do not manufacture them from the checksum.
- The original 7/7 **four-source observed week** remains available separately:
  `docs/research/evidence/MIHM-MANHATTAN-FOUR-SOURCE-2026-03-01.json`.
  No complete **31-day four-source panel** or scientific MIHM predictive
  improvement has been demonstrated. DOT simple link-sample averages are
  not yet population representative; weighted estimates were never admitted.

**Method response:** stop retrying the failing external aggregation in CI.
The repeated March source probe is disabled; offline QA and a versioned partial
read remain. The next data step should be a separately reviewed, resource-bounded
extraction strategy (source-provided daily extracts, provider-side cached view,
or much tighter time/link sampling with explicit coverage/representativeness
tests), rather than successively increasing timeout/cost. No new DB, spending,
source record ingestion, production intervention or canonical MIHM adjustment.
An independent future evaluation cannot proceed without sufficient
aligned and documented data.


### 2026-10-25 — Alternative fixed-link DOT acquisition: observed 7-day segment

After three bounded citywide/weekly DOT timeout attempts, the research
used the existing official E-ZPass Readers July 2024-current
dataset [6a2s-2t65](https://data.cityofnewyork.us/d/6a2s-2t65)
but **fixed road SID** and read only aggregate speeds of that link.
Evidence:
[CI run 40194831381](https://github.com/Aptymok/system-friction/actions/runs/40194831381),
job 121173319059,
\`docs/research/evidence/MIHM-MANHATTAN-DOT-SID4001-2026-03-01.json\`.

- Source candidate search was first 40 matching positive-sample Midtown
  readings dated 2026-03-02, a deterministic convenience sample
  (not statistically random or representative).
- SID **4001**, official link description
  **42nd Street — Westbound — 3rd Ave to Lexington Ave**,
  returned all **seven** dates 2026-03-01 to 2026-03-07,
  from **8,533 link-level aggregate reader observations**.
- Its daily provider \`median_speed_fps\` has both an
  arithmetic mean of link-sample speeds and a
  count-weighted mean using \`n_samples\` per observed record.
  Correct unit is feet/second; this is neither an entire Manhattan
  speed nor a vehicle-weighted corridor travel-time estimate.
- Response SHA-256:
  \`707a96696f87fa0914d158e7bbba9e266f29ca41304cda939ef0dfc9546746a5\`.
  Source selection fingerprint and query URL are saved verbatim
  in the evidence fixture.
- Second candidate SID **2001** timed out after bounded request.
  Treat it as unavailable from that query route, not as a day of
  zero speed, closure or no traffic. Overall probe status
  INDETERMINATE for the two-link attempt; the **first link's
  seven-day observations are valid within their scoped provenance**.
- No promoted four-domain citywide inference. The original
  seven-day Manhattan-labeled DOT citywide unweighted statistic
  and one-link weighted statistic have incomparable spatial
  support. Do NOT splice them as one longitudinal series.
- No MIHM causal propagation, prospective forecast, novel model
  advantage or intervention can be concluded from this source
  acquisition experiment. Historical as-of-T0 revision status
  remains unknown.

**New lower-cost road-demand alternative under separate audit:** the
official MTA Daily Ridership and Traffic (dataset sayj-mze2) contains
daily \`date,mode,count\` and may include Central Business District /
Congestion Relief Zone vehicle counts. A corresponding March 2026
mode-specific probe is scoped to source semantics before admitting it.
MTA's systemwide bridges/tunnels traffic must NOT be relabeled as
traffic confined to Manhattan and vehicle entries are NOT speed.
The fixed-link probe is disabled from future automatic CI requests.


### 2026-10-25 — Official MTA CBD / CRZ daily road-demand admission (31 days, observed)

Official <https://data.ny.gov/d/sayj-mze2>, **MTA Daily Ridership and
Traffic: Beginning 2020**, supplies daily date/mode/count, including
**CBD Entries** and **CRZ Entries**. A single strictly March 2026
(2026-03-01 through 2026-03-31) read obtained 279 aggregated
day/mode records and **31 of 31 dates** for each of the two road-entry
measurements, response SHA256
\`81a33b315281be8e849ff1d2af71d38650a6dd4a59c73132829000d1b04ba68a\`.
Actual observed query:
[CI run 40195066391](https://github.com/Aptymok/system-friction/actions/runs/40195066391),
job 121174020945. Source read-only, 18,960 bytes, explicit
\`scripts/research/mihm-mta-cbd-traffic-probe.mjs --probe\`.

**Provider semantics:** CRZ entry count excludes excluded-roadway
entries within CBD. CBD entry count includes them, per MTA's
Congestion Relief Zone Vehicle Entries dictionary. Accordingly
\`CBD Entries - CRZ Entries\` is recorded as a definitional
derived number; **never sum CBD+CRZ as distinct traffic**
because of the overlapping/nested catchments. BT mode is
MTA systemwide bridges/tunnels, not borough-specific Manhattan.
Neither CBD nor CRZ is mean road speed. Counts represent daily
vehicles entering the provider's defined zones, not individual
unique vehicles, network flow on all streets, or travel times.

**Materialized retrospective development-only panel:**
\`docs/research/evidence/MIHM-MANHATTAN-NESTED-TRAFFIC-MARCH-2026.json\`
preserves **31 days x four metrics**:
1. Manhattan borough daily NYC311 request count (NYC311 agency);
2. Manhattan borough daily FDNY incident dispatch count (FDNY);
3. MTA daily CBD vehicle entries (subborough CBD spatial support);
4. MTA daily CRZ vehicle entries (nested subborough tolling zone).

This is **three original data agencies and four indicators**,
not four statistically independent data systems. The panel explicitly
tags spatially different boundaries, provider response fingerprints,
the missing original as-of-T0 release evidence, observed-vs-derived
epistemics and no verified cross-system causal link. A new offline QA
verifies 31 exact dates, identity with previous March NYC311/FDNY
observations, nonnegative MTA counts and the CBD–CRZ inclusion invariant.

This data route is much smaller and faster than the 331M-row DOT
source. It is a **road-demand** alternative for the urban observatory,
not a substitute for citywide DOT speed or a claim of measured
capacity. The separate 7-day local DOT SID4001 sample-weighted
road-speed evidence remains valid only for that one road segment.
The MTA public live query was disabled from recurring GitHub Actions
after the successful read.

**Scientific admission:** source/value availability only.
We have not run or validated M0/M1/M2 on these 31 observations.
The existing 365+ day multivariate calibration protocol requires
more aligned historical data and cannot be waived for an apparent
pattern. A next empirical experiment can predeclare how *lagged* CBD
entry changes might forecast a separately sourced endpoint, control
for day of week and same-source history, maintain source vintage
limits, and compare with conventional multivariate and equal-budget
placebo models. Continue updating MIHM hypotheses based on
observations, without treating a repeated consulted test as
independent confirmation.


### 2026-10-25 — Frozen next empirical gate: 365-day Manhattan urban signals

**Before a new source read:** investigate retrospectively whether prior-day
demand in three public institutional observation streams improves forecasting
of *separate* next-day outcomes. Window fixed 2025-10-01 through 2026-09-30
(365 contiguous local dates). First 28 days supply past lags.
Training target dates 2025-10-29 through 2026-04-30, calibration
2026-05-01 through 2026-06-30, audit 2026-07-01 through 2026-09-30.
Use no audit outcomes in fitting/scaling/tuning/feature selection.
Endpoints independently assessed: Manhattan daily 311 requests, Manhattan
daily FDNY dispatches, MTA daily CBD vehicle entries. CRZ nested-zone
daily entries retained as source context, **not additive to CBD**.

Three-source daily panel has heterogenous spatial support:
Manhattan borough (311/FDNY) vs a defined CBD road-entrance area (MTA).
Count outcomes represent reporting/dispatch/entries, not physical
failures, congestion speeds, capacity or real causal interactions.
Do not call it a four-system Manhattan citywide causal model.

Primary descriptive task: next-day counts using only day t-1 and older.
Baselines: weekly-naive and regularized autoregression M0 with weekday,
annual cyclic calendar, own lags and own trailing history.
M1: M0 plus same source-vintage lagged histories of other institutional
signals (an ordinary multivariate ridge competitor, not MIHM).
M2 exploratory MIHM F3-inspired: M1 plus specified lagged
cross-source shocks and interactions. Compare M2 to a same-size
placebo built from 28-day displaced historical shocks, never future
rows, and report each independent target. Both tuned only on
calibration; held-out MAE, RMSE and paired better/worse days in
the later 92-day audit. Include a block-bootstrap uncertainty range.
**The observed advantage, if any, does not establish MIHM** because
M2 is only a proxy and this trial is not independent preregistration.
No post-hoc selection of only winning targets or of a revised holdout.

One explicit bounded read per official API, only **daily aggregated
counts**; records/addresses/IDs/station rows not downloaded. Allow
max 60 seconds and <=256 KiB per source response. Require exactly
365 dates per series, no zero-filling or out-of-window data.
Output source SHA-256, coverage and source-vintage caveats.
FDNY 8m42-w767 last refreshed 2026-10-05; NYC311 erm2-nwe9
updated frequently; MTA sayj-mze2 refreshed after event dates.
**As-of-T0 historical data availability and revisions not proven;
retrospective test is not a forecast issued during those months.**
Source error, timeout, coverage gap or incompatible unit means
**ABSTAIN** (no fabricated full panel). No automatic retry.

Reuses the existing MIHM Foundation research program, GitHub draft PR
and read-only SFI Verify. No production, database, credentials,
institute authority, canonical Phi, irreversible action or new spend.


### 2026-10-25 — Completed 365-day Manhattan source/forecast contrast: no distinctive M2 win

**Observed source admission:** 365 daily aggregates on each 2025-10-01 through
2026-09-30 for NYC311 Manhattan, FDNY Manhattan, and MTA daily CBD/CRZ
vehicle-entry series, obtained in one bounded research job:
https://github.com/Aptymok/system-friction/actions/runs/40196382569
(official SoQL data snapshots, one source request per agency).
Exact source-response SHA-256 and all 365 rows:
\`docs/research/evidence/MIHM-MANHATTAN-365D-2025-10-2026-09.json\`.
311, FDNY and MTA daily counts respectively had 365, 365 and
730 date/mode aggregated source records; none missing or imputed.
MTA CBD and CRZ are geographically nested, **not two independent
institutions** and **not measured road speeds**.

**Experiment executed:** SFI Verify run
https://github.com/Aptymok/system-friction/actions/runs/40196827713 ,
job 121179357153, pure offline evaluator
\`scripts/research/mihm-manhattan-365d-contrast.mjs --evaluate\`,
scientific receipt:
\`docs/research/evidence/MIHM-MANHATTAN-365D-MODEL-CONTRAST-2026-10-25.json\`.
Held-out 2026-07-01–2026-09-30 (92 dates) never used by regression
fitting/feature standardization/hyperparameter selection; training
2025-11-12–2026-04-30 (170 target dates), May-June calibration
(61 dates). These retrospective results were calculated in October
from subsequently published/possibly revised snapshots; they
are NOT forecasts actually issued then.

**Four comparators:** M0 ordinary regularized own-history
autoregression + calendar; M1 M0 plus other institutional histories;
M2 M1 plus six lagged historic cross-source shock/interactions inspired
by an MIHM F3 idea; PLACEBO is same feature count and 28-day-displaced
historical cross-source shocks. The placebo is **a meaningful
alternative older-lag predictor, not a random independence
distribution**. Model tuning by validation MAE, independent per model;
evaluation of each of three targets, no cherry-picking.

**92-day test MAE** (lower is better, in daily target units):

| Outcome | Weekly naive | M0 | M1 | M2 candidate | Equal-size older-lag control |
|---|---:|---:|---:|---:|---:|
| NYC311 Manhattan requests | 170.022 | 144.787 | 151.939 | 142.007 | **136.903** |
| FDNY Manhattan dispatches | 53.511 | **35.416** | 37.327 | 37.265 | 37.450 |
| MTA CBD vehicle entries | 21891.935 | **16538.321** | 18812.356 | 19952.259 | 19015.595 |

For NYC311, M2 beats M1 by 9.932 daily requests MAE,
exploratory 7-day block resampling interval [1.519,20.437], BUT
the equal-complexity older-lag control improves on M2 by
5.104 MAE requests/day, so **unique F3/M2 mechanism not identified**.
For FDNY and CBD, M0 outperforms the added-source variants;
in CBD M2 worsens M1 by 1,139.903 daily vehicles MAE.
FDNY M2−M1 difference is practically negligible (+0.062 MAE
benefit), with an uncertainty interval crossing zero.
Uncertainty estimates are conditional exploratory resampling, not
a confirmatory significance assessment.

**Mechanism judgement:** M2 is NOT canonical MIHM, not tested with
measured cross-system constraints, intervention, resource saturation
or independently identified propagation. Adding unrelated data
or free-form historical shocks is not MIHM validation. This trial
does not establish superiority, causation, real-time predictive
availability, or independent preregistration; the observational
nested CBD boundaries differ from the entire Manhattan borough.
Do NOT tune against these 92 now-consulted days and call them an
independent new test. Preserve all competing results and
the original hypothesis.

**Consequence:** in the next genuinely independent evaluation,
select/refine candidate structure solely via development and
calibration; permit negative evidence to eliminate expensive
or ineffective extra-source routes. Prioritize a mechanism with
grounded constraint, temporal delay and measurable RETURN, and
a competent baseline/older-lag control at equal input access.
Do not promote M2, do not change Phi, do not deploy this research,
do not create new databases or invoke agents unverified.


### 2026-10-25 — Externally dated perturbation: NYC blizzard and travel restrictions, 2026-02-22/23

**First targeted, real-world, multi-system event reconstruction**
using the admitted Manhattan daily panel, under
\`scripts/research/mihm-manhattan-feb-blizzard-case.mjs\`.
**SELECTION WARNING: EX POST**. The 2026-02-23 date was chosen
**after inspecting the lowest CBD daily observation**, not before
looking at its outcomes; this is hypothesis generation and reconstruction,
NOT an independently preregistered forecast or causal effect estimate.

**Separately attested, dated public authority/observations:**
- 2026-02-21 NYC Emergency Management advisory for severe snowfall
  February 22–23:
  https://www.nyc.gov/site/em/about/press-releases/20262102_pr_nycem-issues-hazardous-travel-advisory.page
- Emergency Executive Order No. 3, citywide non-essential road travel
  restricted **from 21:00 Sun February 22 to noon Mon February 23**,
  with emergency/essential exemptions:
  https://www.nyc.gov/mayors-office/news/2026/02/emergency-executive-order-no--3
- NYC February 23 public statement lifted the road restriction at noon,
  with hazardous weather advisory continuing:
  https://www.nyc.gov/mayors-office/news/2026/02/mayor-mamdani-announces-lift-of-travel-ban--nyc-public-schools-t
- Emergency order No. 3.1 terminates declared emergency effective
  00:00 February 24:
  https://www.nyc.gov/mayors-office/news/2026/02/emergency-executive-order-no--3-1

**Observed parallel deviations**, descriptive medians for the *same
weekday* from January 1 through February 21, 2026 (52-day reference,
includes another January snowstorm, no causal counterfactual).
Units and geographic support remain distinct:
- Feb 23 CBD entries 72,721 (−84.8% vs Monday reference 477,323);
  CRZ entries 64,681 (−84.5% vs 417,850), nested, not additive.
- Feb 23 FDNY Manhattan dispatches 684 (+58.3% vs 432).
- Feb 23 NYC311 Manhattan requests 1,844 (−23.2% vs 2,400).
- Feb 24 CBD −22.4%; FDNY +16.0%; 311 +17.4%;
  temporal divergence worthy of reporting-lag investigation, NOT
  automatically delayed real-world incident propagation.
- Feb 26 CBD −2.2%; FDNY −1.5%; 311 +2.8%;
  near these weekday reference levels but not an institutionally
  verified HOMEOSTATIC RETURN or proof of recovery to capacity.

**Research mechanism candidate:** identify an externally bounded
stress episode affecting transport activity, emergency dispatch and
citizen reporting on different response/return clocks.
Snow intensity, citywide travel restriction, business/school closure
and service operations are concurrent confounders, and the first two
cannot be isolated from observational counts alone. Neither FDNY
dispatch numbers nor 311 requests measure resilience, incident
severity, available responders, physical damage or reporting
backlog directly. **No canonical MIHM causal relation, prediction
advantage, intervention-response functional, return receipt or
causal effect established**.

**Falsification conditions for next test** must be defined before
looking at new held-out event dates: independent dated external weather
and travel-policy timeline; objectively recorded service disruptions
and reporting vintage; comparison storms and no-storm days matched
by calendar/exposure; competent event-study, dynamic temporal-network
and placebo timing controls. An observation that other weather
events or calendar closures produce the same cross-domain sequence
without a governing stress mechanism would weaken this candidate
explanation. Maintain the original institutional research objective,
not a single favorable mobility chart.

This case is strictly READ ONLY on the MIHM Foundation draft branch.
No authority, user case, database, procurement, autonomous agent,
production publish or canonical code has been changed.


### 2026-10-25 — Four NWS-anchored perturbation episodes; matched calendar falsification

**Status:** Exploratory follow-up after reviewing complete year and February 23 outcome.
**Not independent, blinded, prospective, or preregistered.** Before executing this
specific comparison, select four event onsets by the **NWS New York 2026 severe
weather event archive**, not by scanning the dependent-variable extrema:
- E1 Jan 25, 2026; NWS Jan 25–26 major winter storm;
  official Central Park storm snow report 11.4 in:
  https://www.weather.gov/okx/20260125_26
- E2 Feb 6, 2026; NWS Feb 6–8 cold/snow/wind episode;
  Central Park snowfall reported 0.1 in Feb 7, with much larger
  snowfall to east; do **not** label a major Manhattan snowfall:
  https://www.weather.gov/okx/20260206_08
- E3 Feb 22, 2026; NWS Feb 22–23 NYC blizzard;
  official Central Park snow report 19.7 in Feb 23:
  https://www.weather.gov/okx/20260222_23
  Citywide nonessential road traffic restricted Feb 22 21:00
  through Feb 23 12:00 per city executive order No. 3:
  https://www.nyc.gov/content/dam/nycgov/mayors-office/downloads/pdf/executive-orders/2026/eeo-3.pdf
- E4 May 20, 2026; NWS severe thunderstorm/flash flooding event,
  **reported flash flooding concentrated in Queens and Brooklyn**.
  Use as a **spatial-specificity challenge**, not assumed
  comparable Manhattan flood or travel-ban shock:
  https://www.weather.gov/okx/20260520

**Frozen exploratory contrasts (all dates prior to reading this
specific analysis, but the entire historical panel was inspected in
earlier work):**
- For every calendar day t with >=56 previous days of observations,
  estimate same-weekday median among the prior 56 dates for each
  field (CBD, CRZ, 311, FDNY); no same-day or post-day denominator.
- Event window t,t+1,t+2; compute contemporaneous day-by-day
  percentage deviations separately and the **maximum**, with its
  offset, of the defined joint traffic/emergency divergence
  \`max(0, -CBD_pct) * max(0, FDNY_pct)\`; report raw CBD and FDNY
  deviations and 311 changes at day0/day+1 to assess reporting lag.
  Composite is descriptive and dimensionless (percentage-squared),
  not an MIHM canonical observable.
- Compare each event score to all eligible 3-day windows from the
  same year, **excluding within ±7 calendar days of any selected
  event**, to report placebo tail frequencies. Placebo days can
  include other independent shocks and holidays: limitations must
  be preserved. No cherry-picked "quiet days."
- Check post-event return: earliest day t through t+7 where both
  CBD and FDNY absolute deviations are <=10% of prior-weekday median,
  or mark **NOT_OBSERVED**. This is descriptive return of *proxies*
  only; no institutional RETURN or proven capacity recovery.
- Report all four NWS events, even failures. Compare whether large
  snowfall + travel restriction shows greater Manhattan shock than
  tiny-snow/cold and non-Manhattan flood episode; competing models
  include holiday/calendar changes, reporting latency, severity,
  citywide travel authority, spatial mismatches, and source revisions.
  These NWS event dates were discovered after an earlier evaluation
  of the same year: exploratory falsification, not unbiased
  empirical significance or proof of causality.
- No outside source rows, intervention, production/DB write,
  agent authority, canonical Phi promotion, or expense.

**Decision rule:** If January and February strong-snow events do not
show reproducible opposite traffic/dispatch deviations—or if the
same joint pattern is common on generic matched weekdays—the
proposed cross-system response law is unsupported on these data.
If patterns recur, they justify a **new independent event cohort
with actual measured weather/exposure and pre-event publication
vintages**, not claims that MIHM already wins.


### 2026-10-25 — Factual outcome of four external NWS episodes vs 240 temporal controls

**EXECUTED** via GitHub SFI Verify:
https://github.com/Aptymok/system-friction/actions/runs/40203570776 ,
job 121199660953; exact replayable source/derived results:
\`docs/research/evidence/MIHM-MANHATTAN-FOUR-NWS-EVENT-CONTRAST-2026-10-25.json\`.
All NWS source URLs and 365-day urban panel source fingerprints
are preserved, with no new external dataset read.

The fixed exploratory comparison uses the prior 56 calendar days'
*same-weekday* median for each outcome and takes the **maximum**
opposite CBD/FDNY deviation score across dates t,t+1,t+2.
Score = \`max(0, -CBD change %) × max(0, FDNY change %)\`;
descriptive percentage-square units, not a canonical MIHM observable.
The score is compared with all 240 eligible 3-day windows excluding
any within ±7 days of a selected NWS date. The controls are not
independent of each other and can include other storms/holidays.
\`1/241=0.00415\` is the **finite sample tail floor**, NOT a valid
confirmatory randomization p-value. The annual data and February 23
outcome had been consulted before these event dates were selected.

**Results** (largest opposite CBD/FDNY response in each 3-day window):

| Event anchor | strongest date | CBD deviation | FDNY deviation | Joint score | Control windows at least as high | Return of CBD and FDNY to ±10% prior-weekday proxy |
|---|---|---:|---:|---:|---:|---|
| Jan 25 major Manhattan snow (11.4 in Central Park) | Jan 25 | −72.451% | +19.704% | 1427.575 | 0/240 | NOT OBSERVED within 7 subsequent days |
| Feb 6 cold, almost no Manhattan snow (0.1 in Central Park on Feb 7) | Feb 6 | −4.275% | +12.145% | 51.920 | 31/240 | Feb 12 |
| Feb 22/23 NYC blizzard (19.7 in) and nonessential travel restriction | Feb 23 | −84.996% | +49.508% | 4207.982 | 0/240 | Feb 26 |
| May 20 storm/flash flooding especially Brooklyn/Queens | May 22 | −4.288% | +8.520% | 36.534 | 35/240 | May 20 (baseline-like immediately) |

**Interpretation:** major Manhattan snowfall days show an extreme
**opposite-direction traffic-demand and dispatch-count combination**
not reproduced at comparable magnitude by Manhattan low-snow/cold
or predominantly outer-borough flash-flood events. The two
distinct heavy-snow episodes pass a *descriptive replication*
and spatial specificity challenge. This is not evidence that
transport decrease *causes* FDNY dispatch increase, and calendar,
closures, emergency-authority action, recorded storm intensity,
source coverage/vintage and service reporting confound this result.
Jan 25 shows **no return within the specified +7-day window**,
while Feb 22/23 meets a baseline-like proxy condition on Feb 26.
The **universal fast-RETURN hypothesis fails**; return cannot be
assumed from an event type or automatically marked COMPLETE.

**An explicit falsification:** the citizen-reporting trace does NOT
follow a single stable lag law across the two strong snow episodes.
On Jan 25, 311 requests are +41.170% vs their weekday reference
on the primary stress day; on Feb 23 they are **−19.809%**, with
Feb 24 **+25.710%**. Thus a blanket MIHM claim of
"311 always drops during storm then rebounds next day" is
**NOT SUPPORTED**. Additional mechanisms for reporting channels,
weather exposure, service closures and request category composition
would require independent measured evidence.

**Scientific conclusion:** the perturbation class and spatial
exposure clearly matter in the observed panel. This narrows a
candidate *conditional* systems hypothesis while ruling out
a universal synchronous response-and-return law. It still does
not demonstrate unique predictive advantage over conventional
event studies, leading indicators, change-point/dynamic-network
methods, or canonical MIHM. No independent prospective storm
cohort or historical as-of-T0 row publication provenance was tested.
The next discriminating experiment should evaluate matched weather
severity/exposure and city policy, verify request-type
composition, and test predefined conditional response envelopes
on new outcomes. Keep strong competing conventional baselines and
date-placebo controls and do not choose dates after seeing them.

**No external or irreversible intervention:** work stays in
the existing MIHM Foundation draft PR. No authority, database,
new background worker, production deployment, user case,
canonical Phi, or commercial assertion is changed.


### 2026-10-25 — Pre-query 311 category decomposition of inconsistent major-snow reports

**Exploratory scientific question**: the NWS Jan 25 and Feb 23 severe
snow episodes show strongly similar low CBD / high FDNY direction,
but markedly different overall 311 reporting. Is the **mix of 311
service-request problem categories** also different, or can the
overall sign differences be explained by a common snow/transport
signal offset by unrelated request categories?

Before requesting category counts, fix four target dates and their
two preceding same-weekday comparators:
- Jan 25 (Sun): Jan 11 and 18; Jan 26 (Mon): Jan 12 and 19;
- Feb 23 (Mon): Feb 9 and 16; Feb 24 (Tue): Feb 10 and 17.
**No source-selected top dates**. Source 311 erm2-nwe9 Manhattan,
daily \`created_date\`, \`complaint_type\`, count(*) only, no unique
IDs, addresses, individual records, request text or coordinates.
Two bounded official reads, Jan 10–27 / Feb 8–25, read-only.
Keep **ALL category counts** for each of 12 selected dates, not
merely categories that fit the theory; source-day totals must be
reconciled against the already admitted annual 311 panel, and
any revisions must be disclosed. Unknown/new categories remain
included in the \`OTHER\` grouping.

Primary diagnostic: for each focal date, difference between category
count and mean of the two preceding same-weekday counts. Additive
decomposition across every 311 category should reconcile exactly to
the difference in observed request totals. Predeclare coarse problem
groups **WINTER_OR_STREET_ACCESS** (problem name regex
snow|ice|plow|street condition|sidewalk|blocked driveway|parking),
**HEAT_OR_HOT_WATER** (heat|hot water|boiler),
**NOISE** (noise),
**OTHER** (all remaining). Apply groups exclusively in order
HEAT_OR_HOT_WATER > WINTER_OR_STREET_ACCESS > NOISE > OTHER.
These are exploratory proxies, not a verified taxonomy of incidents.
Display positive and negative contributors separately (minimum top
eight each) and the four fixed group contributions, even when they
refute a winter-access explanation.

**Falsification boundary:** If winter/access request changes do not
account for a substantial share of both storms' direction of 311
deviations, reject the proposed single snow complaint-channel
mechanism; identify observed category differences instead and preserve
nonresponse/reporting-policy confounders. If they explain much of
the difference, independent and properly vintage-tracked service
composition outcomes are still needed before claiming MIHM
superiority or verified causal propagation. These episodes are ex
post selected after consulting their total counts, so this is
**hypothesis refinement, not independent prediction**.

Stop if source timeout, aggregate-size limit, truncated groups,
missing comparator day or inconsistent data. No source retry by
default; never turn absent category rows into fabricated source
observations. No live backend, agent execution, production, DB,
permissions, canonical Phi or new expenses.


### 2026-10-25 — Empirical 311 observation-channel finding: snow episodes do not share a universal reporting signature

**Source experiment COMPLETED, read-only:** SFI Verify [GitHub Action
40217151455](https://github.com/Aptymok/system-friction/actions/runs/40217151455),
job 121240662600, official NYC311 from 2020 dataset \`erm2-nwe9\`.
Two **bounded source aggregates** (2026-01-10–26, 2026-02-08–24),
1,539 and 1,581 aggregate date/category rows respectively.
These are aggregated groups, **not 3,120 individual source requests**.
No individual request IDs, addresses, location data or free text were downloaded.
Source-response SHA256:
- January \`afd4323e8ddf8858d9a360110430781cba0211f4c62339944617e8a6075847bc\`
- February \`90c7a10e210b0ba9d2bec18e9941ac5d453f10df327fb8b71a6ea79fe4b70cd3\`

All **12 predeclared event and same-weekday comparator dates** had complete
category counts, totaling 1,071 selected date/category cells.
Sum of ALL 311 \`complaint_type\` counts matched each date's
previously archived 365-day request total **exactly**, 0 historical
snapshot revisions on these 12 days.

Provider-level source receipt (all 12 full category vectors):
\`docs/research/evidence/MIHM-311-JAN-FEB-SNOW-COMPOSITION-OBSERVED-2026.json\`.
The initially declared broad group classifier had a taxonomy
collision: \`Noise - Street/Sidewalk\` fell into the
\`WINTER_OR_STREET_ACCESS\` class because of \`sidewalk\`.
**Corrected AFTER inspecting the data**, retained the original
unaltered record, and explicitly prioritized NOISE categories:
\`docs/research/evidence/MIHM-311-JAN-FEB-COMPOSITION-CORRECTED-2026.json\`.
Offline QA proves complete grouping decomposition adds exactly to the
total counts and reproduces the corrected source evidence. Reclassification
does **not** transform this study into an independent test.

**Total and corrected source-category change** versus average of two
earlier days of the *same weekday*, all measurements in daily request units:

| Day | 311 total change | HEAT / HOT WATER group | WINTER / ACCESS group | NOISE group | Distinct actual category |
|---|---:|---:|---:|---:|---|
| Jan 25 storm onset | +921.5 | **+992** | −40 | −82.5 | \`HEAT/HOT WATER\` 1,274 requests (53.0% of all requests; +977 vs category reference) |
| Jan 26 | +587 | +583 | +234 | −160 | \`Snow or Ice\` 374 requests, +335.5 vs category reference |
| Feb 23 blizzard/restriction | −485 | −213.5 | +2.5 | −142.5 | \`Damaged Tree\` 353 requests (19.1% of total), +352 vs category reference; \`Snow or Ice\` 146 |
| Feb 24 | +570 | −83 | **+773.5** | −113.5 | \`Snow or Ice\` 868 requests (31.1% of total), +840.5 vs category reference |

The four mutually exclusive group deltas sum exactly to the
corresponding 311 total change, including all OTHER service types.
The baseline is only two prior same-weekday observations; different
from the prior eight-week reference and not an independent causal
counterfactual. Changes of half a complaint reflect fractional mean
differences, never noninteger observed counts.

**Scientific finding / model correction:** the total 311 count is a
**mixture of heterogeneous reporting channels**, not one faithful,
instantaneous measure of physical disruption. The January total
rise was more than fully accounted for by heat/hot-water reports,
while February simultaneously showed a falling overall 311 total,
a striking damaged-tree signal and a next-day surge in snow/ice
reports. A single all-category \`311_count(t)\` cannot support
a universal snow→311(t) direction, reporting-delay or
cross-system return law. This is stronger evidence AGAINST the
overly coarse MIHM observational mapping, not proof that MIHM
already explains the storm.

**Revised, testable hypothesis (NOT implemented as canonical law):**
different request categories may have distinct event exposure,
reporting availability/agency rules and response delay kernels.
Formally consider observed requests
\`Y_{category,t}\` as the output of an as-yet-unidentified measurement
process driven by true conditions and reporting/collection context,
not a direct readout of a latent physical damage state.
Current counts alone cannot identify that process or its cause.
For future independent storms, define measurable external inputs
(NWS weather/snow severity, authority travel restrictions, actual
service/capacity signals), prospectively declare category-specific
day0/day1 responses and their uncertainty; compare against
competent category-specific seasonal/event-study/dynamic count
models with the **same inputs and timestamps**.
Check placebo calendar dates, out-of-area weather and
source-vintage/revision logs; report all predeclared outcomes.
If the new channel-specific model does not beat those controls,
do not promote it or call it a scientific victory.

**Resource + authority discipline:** exactly two official bounded reads
and no automatic retries; the one-time source action is disabled from
future GitHub CI. The reanalysis and preservation are offline,
branch-only. No production, database, ROOT authority, autonomously
active agent, deployed endpoint, spend or canonical Φ modification.


#### 2026-10-25 — Baseline-sensitivity falsification: total 311 polarity is not stable

After the complete source-category archive was saved, an additional
**offline, no-network** comparison used only the most recent
same-weekday date versus the mean of two previous same weekdays.
Exact per-category and total-day differences:
\`docs/research/evidence/MIHM-311-SNOW-BASELINE-SENSITIVITY-2026.json\`.

| Date | 311 count | Compared with 1 prior same weekday | Compared with mean of 2 prior same weekdays |
|---|---:|---:|---:|
| Jan 25 | 2,402 | +61.64% (Jan 18) | +62.24% (Jan 11,18) |
| Jan 26 | 2,592 | +43.13% (Jan 19) | +29.28% (Jan 12,19) |
| Feb 23 | 1,844 | **+3.07%** (Feb 16) | **−20.82%** (Feb 9,16) |
| Feb 24 | 2,787 | +35.23% (Feb 17) | +25.71% (Feb 10,17) |

**Crucial negative observation:** the 311 total's Feb 23 change
**FLIPS SIGN** solely by using the 7-day vs 14-day same-weekday
reference. Heat/hot water likewise flips (+188 vs −199 compared
with the respective category baseline). Therefore neither a
"universal observed reporting drop on severe blizzard day" nor a
fixed heat-channel sign has survived this robustness check.

By contrast, Feb 23 \`Damaged Tree\` remains +352 vs either
reference and \`Snow or Ice\` remains +135 (1-week)
or +124.5 (two-week). On Feb 24 \`Snow or Ice\` remains
+855 vs one-week or +840.5 vs two-week baseline.
These **source-specific contrasts are more stable within the
two tested definitions** than the 311 grand total. They do not
identify real-world damage, prospective causality or a uniquely
MIHM-generated forecast; the dates and categories were selected
after the earlier annual analysis, and historical as-of reporting
vintages remain unknown.

**Revised decision gate:** any new MIHM claim about direction,
latency or the timing of RETURN must publish sensitivity to
multiple predeclared weekday reference windows, use negative
controls, and be compared to conventional category-specific
dynamic-count and event-study models on future unconsulted
observations. A category contrast that changes sign with a
reasonable reference choice cannot be promoted as a stable
mechanism. The original source observations and previous
classifier's uncorrected record remain retained for audit.


### 2026-10-25 — MIHM observation-channel recalibration: HEAT/HOT WATER and delayed Snow or Ice

Follow-up to existing **official aggregated 311 complaint composition**
\`docs/research/evidence/MIHM-311-JAN-FEB-COMPOSITION-CORRECTED-2026.json\`.
This particular sensitivity analysis was devised **after inspecting the
January and February category outcomes**, so its results are
post-hoc scientific diagnostics, not independent hypothesis confirmation.
No new source API request was made.

Executable:
\`scripts/research/mihm-311-channel-sensitivity.mjs\`, archived
machine-checkable outcome:
\`docs/research/evidence/MIHM-311-CHANNEL-SENSITIVITY-2026-10-25.json\`.
The code verifies full category decomposition against official
per-day 311 counts and preserves the already-corrected rule that
all Noise-* categories belong to NOISE, including
Noise - Street/Sidewalk.

**Observed event-day 311 versus mean of TWO earlier matching weekdays**
(different baseline than 56-day historical median; do not mix estimates):

| Episode | Whole 311 change | HEAT/HOT WATER change | Excluding all HEAT/HOT WATER change | Snow or Ice change on following day | Following-day remainder excluding heat + snow/ice |
|---|---:|---:|---:|---:|---:|
| January 25–26 snow event | +921.5 | +992 | **−70.5** | **+335.5** | **−331.5** |
| February 23–24 blizzard | −485 | −213.5 | **−271.5** | **+840.5** | **−187.5** |

**Two diagnostic facts:** (1) original aggregate 311 storm-day signs
**disagree** (+Jan, −Feb), but after removing heating/hot-water, the
remaining categories decline on both storm days. January's
+921.5 aggregate increase is more than explained by the
+992 heating-channel deviation, leaving −70.5 from all other
channels. February's −485 incorporates a −213.5 heating-channel
decline and −271.5 other-channel decline.
(2) both next days show Snow or Ice reporting increments
(+335.5 and +840.5), while the remainder excluding heating
and Snow or Ice declines in both episodes (−331.5 and −187.5).
All category sums are algebraically reconciled, with no hidden
projections or missing groups.

**MIHM implication:** undifferentiated 311 requests must not be used as
a single direct physical stress variable. A more plausible
observation layer admits **category-specific reporting channels**,
with differing responsiveness, censoring and submission latency,
and should compare baseline, event onset and post-event changes
separately. This is a **calibration of an observational representation**,
not permission to relabel reports as real-world incidents, causal
propagation, resource saturation or canonical Phi.

**Falsification next:** freeze the channel partition and predicted
same-direction non-heating event-day response and following-day
Snow or Ice increase *before* independent storm data is inspected.
Compare with the matched calendar/weather/event-study controls,
including non-snow cold days, other boroughs and no-storm periods.
The hypothesis fails to replicate if an independent severe-snow
event yields positive non-heating deviations or no elevated
next-day snow requests under comparable observation availability.
Only then evaluate whether MIHM adds measurable value beyond
equally informed conventional category-specific time series.
No historical as-of-T0 publisher snapshots have been reconstructed;
two selected snow events are insufficient for causal conclusions
or a claim of validated MIHM superiority.

All work remains read-only research on the existing draft PR;
no production deployment, DB writes, institutional execution,
human permission, recurrent source fetch, external purchase
or canonical MIHM change.


### 2026-10-25 — FROZEN BEFORE READ: new Dec 26–27, 2025 storm observation-channel challenge

**Independently date-anchored but NOT prospective** event:
official NWS New York winter storm December 26–27 2025;
Central Park reported **4.3 inches** of snow at 07:00 Dec 27.
Source: https://www.weather.gov/okx/20251226_27 .
Snow began evening Dec 26, not early on that day.
This episode was **not used to fit** the January/February
\`HEAT_OR_HOT_WATER\`, \`NOISE\`, \`WINTER_OR_STREET_ACCESS\`,
\`OTHER\` observation-channel classification; its unobserved
**category-specific** outcomes have not yet been inspected.
However, the original full-year daily 311 totals have previously
been in view, so this is only a **partially independent
outcome-channel challenge**, not blinded preregistration.

**Primary freeze before observing category rows:**
A. Onset **Friday Dec 26** non-heating request count
(\`311 total - all HEAT_OR_HOT_WATER\`) versus the **mean
of Dec 12 and Dec 19**, two earlier Fridays, will be tested
for a *negative change*.
B. Next-day **Saturday Dec 27** exact provider category
\`Snow or Ice\` versus **mean Dec 13 and Dec 20** (two
earlier Saturdays) will be tested for a *positive change*.
A and B are independent tests; do not retroactively substitute
a different weather onset or complaint label if either fails.
The primary pair passes only when BOTH A and B are observed
with the declared signs and both have full category/day coverage.
Only then call this a **limited within-sample replication**,
never superiority, causality or canonical MIHM proof.

**Predeclared sensitivity:** Report the same two signs against
the **one-week prior same weekday** (Dec 19 and Dec 20),
and explicitly label a direction as BASELINE_UNSTABLE if it
differs from the two-week primary decision. Report full 311
total, heat/hot water, all non-heating, exact Snow or Ice,
NOISE, winter/access, and all other channels for both event
dates. Never change the original corrected taxonomy to fit
the outcome. Daily category sums must agree exactly with
the previously archived annual 311 source total for all six
relevant dates or register SOURCE_REVISION and ABSTAIN from
original-vintage-free replication. Missing categorical counts
within a *present and otherwise complete day* may be treated
as zero only when the source's category aggregation reconciles
with the independently archived day's total. Missing complete
days or limited results are NOT zeros.

**Confounding challenge:** Dec 26 was immediately after
Christmas Day, Dec 27 was Saturday, the storm was of moderate
snow accumulation, and Dec 13–14 also had weather impacts.
Baseline requests may vary because of public holidays,
agency schedules, timing of snowfall, and data revisions.
Do not call a sign concordance unique MIHM skill. No causal
effect, measured delay mechanism, source publication at
historic T0, outcome intervention or institutional RETURN
can be inferred from these categories alone.
If A or B fails, explicitly weaken the generalized
storm-channel response hypothesis rather than retune the
reference periods or category definitions.

**Execution:** ONE bounded official read-only NYC311
date×\`complaint_type\` aggregation for 2025-12-12 through
2025-12-27 inclusive, <=4000 aggregate rows, <=800 KiB,
single <=45s source request, and 0 retries. No request IDs,
geolocation, addresses or free text. Keep external source
response hash, all six day/category vectors, baseline tests,
negative results and source publication caveats.
A source timeout, response truncation or source revision is
a source-quality stop, NOT a MIHM result. Existing GitHub
draft PR #841; no production, DB, agent activation, expenses
or canonical formula changes.


### 2026-10-25 — DEC 26–27 FROZEN-CATEGORY TRANSFER RESULT: BOTH signs observed, holiday confounded

The explicitly preregistered (within PR history, **before the
new Dec category API read**) two-category challenge was executed
on official NYC 311 data. NWS externally documents **4.3 inches
of snow in Central Park in the Dec 26–27 2025 storm**:
https://www.weather.gov/okx/20251226_27 .
The storm began the evening of Dec 26; the event day overlaps
the day after Christmas. Source category outcomes were uninspected
when the frozen decision rule was committed at
\`89c1c59fb1f162da516ce8ba2ecc248962b3763b\`.
Original daily totals of the annual panel had been seen, thus
this is **PARTIALLY INDEPENDENT channel-level replication**,
not fully blinded preregistration or a historical real-time forecast.

**Official executed source:** SFI Verify
https://github.com/Aptymok/system-friction/actions/runs/40220613481 ,
job 121251179701. One bounded GET of
https://data.cityofnewyork.us/d/erm2-nwe9
for 2025-12-12 through Dec 27, Manhattan \`created_date\`×
\`complaint_type\` aggregates; **1,442 aggregate rows spanning
16 calendar dates**, 114,829 response bytes, SHA256
\`d37426fe5c49ea90d8d09674e3f1f7331cd5f76ccf73a533b98fec54c0b77165\`.
No raw request IDs/addresses/texts or production records fetched.
Complete **six preselected day** source-category totals reconcile
exactly with the archived 365-day total counts; zero source
revisions on these six days.

**Frozen primary references:** mean of Dec 12 and 19
(two previous Fridays) for Dec 26, and mean of Dec 13 and
20 (two previous Saturdays) for Dec 27.
- **A. Dec 26 non-heating 311 requests:** observed **1,015**
  versus reference **1,685.5**, change **−670.5** (−39.780%).
  PREDICTED NEGATIVE direction **OBSERVED**.
- **B. Dec 27 exact \`Snow or Ice\` requests:** observed
  **44** versus reference **0.5**, change **+43.5** requests.
  PREDICTED POSITIVE direction **OBSERVED**. The
  percentage difference (+8,700%) is not a meaningful
  practical-effect estimate with a 0.5/day denominator.
- **One-week-only sensitivity:** Dec 26 non-heating **−658**
  vs Dec 19; Dec 27 Snow or Ice **+43** vs Dec 20.
  Both primary sign decisions are stable under the two
  predeclared reference definitions. The full 311 total
  declined on both event days, and heat/hot-water alone
  increased on both (Dec 26 +85 vs two-week reference;
  Dec 27 +241.5). This shows why total 311 is an
  inadequate single proxy for "urban physical stress."

**Reproducible observation receipt:**
\`docs/research/evidence/MIHM-311-DEC2025-SNOW-TRANSFER-OBSERVED.json\`,
containing all six preselected day group totals, exact
Snow-or-Ice counts, baselines, observed directions, source
response fingerprint, source query and declared caveats.
\`scripts/research/mihm-311-dec2025-snow-transfer.mjs --self-test\`
independently checks every saved total against the
previously archived 365-day official 311 data and
reconciles all four mutually exclusive source category groups.
**Limit:** full 1,442 date/category source rows were not
saved in the repo, so exact per-complaint-provider-category
replay needs a future explicitly authorized public source
read. No source requery was made to create the receipt.

**Scientific disposition:**
Two hypotheses generated from Jan/Feb source composition
**replicate in direction** during the *moderate* Dec snow
episode using a fixed category classifier and fixed comparator
days. This is modest cross-event observational evidence
for different reporting-channel clocks, **not** a universal
physical law or independent prospective MIHM improvement.
Christmas-week demand shifts, storm time of day, the earlier
Dec 13–14 winter weather, small expected Snow-or-Ice counts,
non-identical severity, source publication revisions,
and differing agency schedules all remain plausible
non-snow-specific explanations.
The next decisive test must include **non-snow Christmas/
holiday controls**, more external snow dates selected
without outcome scanning, and a matched seasonal/weather
category-specific conventional baseline. Do not simply count
two matching signs as causal MIHM validation.

No production, institutional RETURN, canonical Phi, DB,
permission, background agent, deployment or spending.
The one-time official read step was disabled after
completion; offline QA remains.


#### 2026-10-25 — Christmas-day negative control: multi-system aggregate decreases without snow

After the December 311 category transfer, an **ex-post holiday
confounding check** used the *existing* 365-day observed agency
panel, with no public source reads. Central Park daily snow
report is 0.0 in on Dec 24 and Dec 25, and 1.7 / 2.6 in on
Dec 26 / 27 respectively, according to the IEM NYC Central
Park climatological record (4.3-in two-day total confirmed by NWS):
https://mesonet.agron.iastate.edu/sites/hist.phtml?month=12&network=NYCLIMATE&station=NYTNYC&year=2025
https://www.weather.gov/okx/20251226_27

**Mean of two previous same-weekday baselines**, all percentages
are respective indicator deviations, not changes in the
underlying weather:
| Day | Recorded snow Central Park | NYC311 total change | CBD vehicle entries change | FDNY dispatch count change |
|---|---:|---:|---:|---:|
| Dec 24 (Christmas Eve) | 0.0 in | −30.968% | −13.057% | −14.477% |
| **Dec 25 (Christmas Day)** | **0.0 in** | **−44.218%** | **−33.639%** | **−36.202%** |
| Dec 26 (storm starts evening) | 1.7 in | −27.572% | −29.542% | −22.070% |
| Dec 27 (storm second day) | 2.6 in | −9.041% | −36.998% | −1.856% |

Christmas Day, **with no recorded snowfall**, exhibits a
larger all-311 and CBD decrease than Dec 26 and a larger
drop in FDNY dispatches. Hence the simplistic reading
"concurrent CBD and citizen-reporting contraction identifies
the snow perturbation" **FAILS an adjacent calendar-placebo
comparison**. Temporal snow impacts cannot be isolated from
holiday demand and other confounders by these aggregates.

This **does not negate** the fixed December non-heating decline
and delayed exact \`Snow or Ice\` rise: complaint-category
vectors for Christmas Eve/Day were not retrieved in the
one-time December source read. Do not manufacture them from
the whole-311 totals or generalize this total-population
control as category-specific causal falsification.
A stronger independent study must compare categories during
snow and nonsnow holidays and control local weather intensity,
reporting schedule, reference width and true source vintage.

Artifact:
\`docs/research/evidence/MIHM-DEC2025-HOLIDAY-NEGATIVE-CONTROL.json\`.
Automated offline QA reconstructs all 16 daily metric values
from the existing observed public-source annual panel and
checks the 1- and 2-week same-weekday references. This was
a no-network evidence reuse on draft PR #841, with no
production/DB/canonical model changes or recurrent source cost.


### 2026-10-25 — FROZEN category-specific Christmas/no-snow control, BEFORE source category read

Existing December snow transfer (Dec 26/27) yielded two **directionally
replicated** outcome signs: onset-day non-heating NYC311 requests decline
and next-day exact \`Snow or Ice\` complaints increase. Existing holiday
control Dec 25 (0.0 in Central Park snowfall) also has a greater drop in
*whole* NYC311 counts than the Dec 26 snow onset, but **Dec 25 category
counts have never been extracted into the official six-day category
receipt**. This is an explicit unresolved alternative hypothesis:
**holiday-specific agency/reporting suppression without fresh snowfall**.

**Freeze date identifiers and outcomes BEFORE new official source read:**

- No-snow negative-control dates: 2025-12-24 (Wednesday), 2025-12-25
  (Thursday); fixed same-weekday predecessors:
  Dec 24 compared only with Dec 10 and Dec 17;
  Dec 25 compared only with Dec 11 and Dec 18. Do not change
  comparators after observing categories. A one-week-only sensitivity
  compares Dec 24 with Dec 17 and Dec 25 with Dec 18.
- Same already-frozen mutually exclusive category classifier as Dec
  snow transfer: \`HEAT_OR_HOT_WATER\`, \`NOISE\`,
  \`WINTER_OR_STREET_ACCESS\` and \`OTHER\`. Exact \`Snow or Ice\`
  counted separately, and is included within winter/street group.
- **H1 nonsnow suppression:** Christmas Day **non-heating** complaints
  decline vs the mean of Dec 11 and 18, even with 0.0 in local snowfall.
  If true, a simple "drop in non-heating requests identifies snowfall"
  hypothesis is FALSIFIED on this negative-control day.
- **H2 snow-specific channel discrimination:** Christmas Day exact
  \`Snow or Ice\` count is **strictly lower** than the previously
  observed Dec 27 snow-day count (44) and does not increase
  over its two previous Thursdays' exact \`Snow or Ice\` baseline.
  If holiday itself has an equivalent or larger Snow-or-Ice spike,
  the proposed channel specificity is weakened. If it does not,
  results remain subject to pending old snow and notification lag.
- **H3 discrimination vs snow-onset day:** compare the **percentage**
  non-heating complaint reduction on no-snow Dec 25 against the
  **already preserved** Dec 26 onset reduction (−39.780%);
  no-snow suppression at least as strong as the Dec 26 drop would
  refute the argument that magnitude alone discriminates weather
  perturbation; otherwise holiday remains a meaningful confound.
- Report all observed category groups on Dec 24 and 25, even if
  these hypotheses fail. If official category sums differ from
  independent annual daily NYC311 totals for ANY of six selected
  dates, mark ABSTAIN_SOURCE_REVISION and **do not treat absent
  counts as zero**. An exact zero for a category is admissible
  only if the day has category observations and the **full sum**
  reconciles to the annual daily total.

**Source read:** one bounded public NYC311 SoQL query for **six
two-week-old same-weekday baseline/holiday dates only**,
2025-12-10/11, Dec17/18, Dec24/25; \`created_date\`,
\`complaint_type\` and count in Manhattan. Date-range filters for
the three two-day windows; no unique request IDs, addresses,
geolocation or free text. <=1200 day-category aggregates, <=200 KiB
response, <=40 seconds, zero retries, read-only.
Classify and preserve all six-date categories, per-day independent
annual source reconciliation, source SHA256, raw query and
negative/hypothesis result. Only one live run in the current
GitHub draft branch; disable the external step afterward.

**Inference restrictions:** snow and holiday calendar overlap in the
same week, and earlier precipitation can affect later reporting.
The source data were published/revised after the historic events,
with no archival T0 publication reconstruction. Category transfer
claim was formed after other storms had already been inspected:
this is **partially independent exposure-specific falsification**,
not a controlled causal intervention, unique MIHM performance or
prospective validation. No production, case admission, agent,
database, permissions, spending or canonical Φ changes.


### 2026-10-25 — CHRISTMAS CATEGORY-SPECIFIC NOSNOW NEGATIVE CONTROL: all three frozen criteria met

The research hypotheses and exact six official date controls were
frozen at commit \`f4de8e3a91a958f31914e5bcc99c7bac8ac867ed\` **before**
the new source category read. One bounded public NYC311 read on
\`created_date × complaint_type\`, in Manhattan, selected just the
six dates Dec 10,11,17,18,24,25. All observations were aggregated,
without request IDs or location/free text.

**Executed:** SFI Verify
https://github.com/Aptymok/system-friction/actions/runs/40222241580 ,
job 121256121952, 554 day/category aggregate rows, 44,099 bytes,
source-response SHA256
\`38700800b8bb126f79cd2a00d6dd187dd15a153d5cb7a3ffca13e0641abb60a7\`.
All **six complete date-level category sums exactly equal**
their independently preserved 365-day official Manhattan NYC311
source totals; no source-revision discrepancy. The query did not
retrieve individually identifiable NYC311 requests.

**Observed no-snow holidays vs prior two same weekdays:**

| Date | 311 non-heating count | Baseline | Change | Exact \`Snow or Ice\` count |
|---|---:|---:|---:|---:|
| Dec 24 2025, 0 in Central Park snow | 1,194 | 1,637.5 | −27.084% | **0** |
| **Dec 25 2025, 0 in snow** | **839** | **1,656.5** | **−49.351%** | **0** |
| Dec 26 2025 storm onset, previously observed | 1,015 | 1,685.5 | −39.780% | 6 |
| Dec 27 2025 after snowfall, previously observed | 995 | 1,400 | −28.929% | **44** |

1. **H1 confirmed in this retrospective observational contrast:**
   Non-heating 311 requests fell on Christmas **without freshly
   recorded snowfall**, directly contradicting a generic
   "non-heating report decline means snow" discriminator.
2. **H2 confirmed for these dates:** exact \`Snow or Ice\`
   remained **zero** on Christmas (vs Thursday prior-weekday
   mean 4 and subsequent storm day 44). It is possible to
   distinguish a snow-report *category* from mere total-report
   suppression, but not yet verify storm mechanism or reporting
   availability at historic T0.
3. **H3 confirmed:** Christmas no-snow day non-heating decline
   **−49.351%** was more pronounced than Dec 26 snow onset
   **−39.780%**. The magnitude of general report decline is
   NOT specific to weather stress.

The same ordinal Christmas suppression sign holds with one-week
reference: 839 non-heating vs 1,707 on Dec 18, change −868,
compared with two-week mean −817.5. The exact category
sensitivity uses small numerical denominators, so effect
magnitude must be reported in **counts** and not overstated as
relative percentage growth.

**Scientific consequence:** a single observation system has
heterogeneous channels. A low volume in one channel can mean
reduced reporting or holiday schedule rather than absence of
physical stress; exact snow complaints can rise while overall
service requests decline. Therefore, MIHM's **observation model**
must explicitly separate \`true disturbance\`, \`source reporting
availability\`, \`complaint type\`, \`calendar closure\`, and
\`delayed appearance\`; those are **separate hypotheses** not
measured latent truths. The two snowfall episodes/Christmas
comparison gives independent category-level falsification of
an overbroad proxy, NOT an empirically verified causal process
or distinctive MIHM prediction advantage.

**Observed receipt:**
\`docs/research/evidence/MIHM-311-CHRISTMAS-CATEGORY-NOSNOW-2025.json\`,
six source-category partitions and both no-snow control results.
Reproducer and archived-data QA:
\`scripts/research/mihm-311-christmas-category-control.mjs --self-test\`.
The initial official read was disabled from recurring GitHub
Actions after successful completion; one-time --collect is
explicit, not scheduled. Any added predictive channel classifier
requires future independent observations, measured access changes,
competent holiday/calendar models and source-vintage checks.
No production, databases, permissions, agents, canonical Phi,
user case or institutional external action altered.


### 2026-10-25 — Outcome test beyond volume: HEAT/HOT WATER 311 closed within 48h

**Scientific test predeclared before reading 311 closure outcomes in this
experiment**, while acknowledging that dates, storms and complaint
composition have already been studied. This does NOT establish independent
selection or preregistration of the whole research program.

**New independent measurement dimension:** the NYC Open Data provider
\`erm2-nwe9\` defines \`created_date\` as request creation and
\`closed_date\` as the responding agency's closure date. Administrative
closure means neither physical heat restoration nor objective
resource capacity; its timestamp can reflect case processing and later
updates. Source: https://data.cityofnewyork.us/d/erm2-nwe9 .
Use the provider-exact \`complaint_type='HEAT/HOT WATER'\`, not prior
regex groups, and select only \`borough='MANHATTAN'\`.

**Frozen 9 creation-date cohorts** (all dates already in archived daily total
series, but the per-request closed<=48h outcome is new):
- **Major snow Jan25 2026** (Sun), comparison Sundays Jan11 and Jan18.
- **Major snow/travel restriction Feb23 2026** (Mon), comparison
  Mondays Feb9 and Feb16.
- **Snow-free Christmas Dec25 2025** (Thu), comparison Thursdays
  Dec11 and Dec18, as a calendar-related NEGATIVE CONTROL.
For each date retrieve provider-side **daily aggregates only**:
number created, number with nonnull closed date, number administratively
closed from 0 through <=48h after creation, and number <=72h.
No incident/address/unique key/personally identifiable row is retrieved.
No intermediate rows stored. Source response <=80KiB, timeout 25s,
one request, no retries; require exactly nine date groups, integer
counts with \`0 <= closed48 <= closed72 <= everClosed <= requests\`.
Refuse incomplete or unsupported SoQL function; do not silently use
ever-closed-in-October as a substitute for closure within 48h.

**Primary comparison:** 48h closure fraction among all requests created
on each episode day vs simple mean of prior two matching weekdays,
measured in **percentage points**. Report 72h sensitivity and
denominators; no conditional selection on ultimately closed requests.
Define evidence of material slowdown as <= -5.0pp for each storm
individually vs its reference. If both fail that threshold, reject the
simple hypothesis that **both storms depressed this observed process
metric**. Even if both meet it, Christmas control could explain a
similar slowdown due staffing/calendar and storm effects remain
unidentified. Also evaluate if Jan/FEB differ in sign without asserting
why. Administrative closure is not a verified service SLA or field
RETURN. Report BOTH positive and negative outcomes without tuning
thresholds after consulting results.

**Epistemic controls:** the dashboard will not declare performance or
SFI autonomy from this comparison. Historical original source-vintage
unknown; 311 can revise status, \`closed_date\` and type.
No causal attribution to snowfall, emergency travel restriction, staffing
or institution. This is retrospective sensitivity of a provider
administrative channel. Subsequent independent prospective event
cohorts require verified historical availability and external
operational records. Run once in the MIHM Foundation research PR,
not in production, without new services, database, payments, or
modification to canonical MIHM/Phi.


#### 2026-10-25 — Amendment: 48h endpoint infeasible in official public SoQL 2.1

First bounded official source read in
https://github.com/Aptymok/system-friction/actions/runs/40223479967
returned HTTP 400. A bounded second diagnostic read in
https://github.com/Aptymok/system-friction/actions/runs/40223773101
confirmed provider error \`query.soql.no-such-function:
datetime_add_hh\`, arity 2. Consequently the 48/72 hour closure
test above was **NOT EXECUTED and has NO scientific result**.
The original hypothesis/threshold remain untested, not false.

A **separate**, prospectively frozen with respect to its as-yet
unread source outcome, weaker **same-local-calendar-day
administrative closure** test is admitted in this amendment,
without pretending that same-day equals <=48h:

- Same nine exact Manhattan, \`complaint_type='HEAT/HOT WATER'\`
  creation-date cohorts (Jan25 and prior two Sundays; Feb23 and
  prior two Mondays; Dec25 and prior two Thursdays).
- Provider-supported \`date_trunc_ymd(created_date)\`,
  \`date_extract_hh(created_date)\`, \`date_trunc_ymd(closed_date)\`
  and \`case()\` to count records with nonnegative closure
  timestamp on the same calendar date; grouped by creation date
  AND hour (no address, request ID, or individual row data).
- Primary endpoint: fraction of all requests created on each
  date, closed administratively on that same local calendar date.
  Compare each episode vs mean fraction of its two prior matching
  weekdays. Prespecify -5 percentage-point threshold for a
  meaningful slowdown in each storm. A universal two-storm
  slowdown claim requires BOTH pass. Christmas control can
  undermine snow-specific interpretation.
- Creation-hour mix can bias the raw endpoint: also calculate
  an hour-stratified standardization with fixed equal hour
  weights over hours represented in all three compared dates,
  explicitly report excluded hours/missing support. Raw
  rate remains the primary endpoint, hour-stratified rate
  sensitivity only, no post hoc preference for favorable one.
- Administrative same-day closure is NOT within 48h, heat
  restoration, a formal SLA, service-quality success, MIHM
  causal effect or institutional RETURN. Original source-vintage
  at historical T0 is unverified and dates are already familiar.
- One bounded read, <=80 KiB, 25 seconds, no retries, strict
  group coverage and integer denominator/numerators. If source
  rejects this simple query, ABSTAIN and stop—do not continue
  querying in a loop or infer results.

The difference between this exploratory alternative and the
failed 48-hour assay must remain explicit in reports and
versioned source evidence. No model/canon/production change.


#### 2026-10-25 — Observed administrative same-day 311 outcome: DIFFERENT storm effects, primary universal law fails

**Executed one official read** from NYC311 \`erm2-nwe9\` using
the source-supported date/hour/grouped \`case()\` query:
https://github.com/Aptymok/system-friction/actions/runs/40224324768,
job 121262368036. Read returned **215 provider day×creation-hour
aggregates across nine predeclared historical dates**, 21,329 bytes,
source response SHA256
\`4802e6e138d19ca0e637e48cd1c70af57064f4422ddf5a9bba6c0294d3b5e18a\`.
All nine daily cohorts have nonzero counts, valid
\`0<=sameDayClosed<=everClosed<=requests\`, and counts bounded by
previously observed annual 311 totals.

**Immutable-in-Git research receipt with source-hour aggregates:**
\`docs/research/evidence/MIHM-311-HEAT-SAME-DAY-CLOSURE-STORM-HOLIDAY-2026.json\`.
The source data were read only once for this protocol; the external
read step was **removed** from recurring CI. Offline replay QA
reconstructs all nine hourly cohort aggregates and verifies the
unchanged original results, including the failed primary condition.

Same-local-calendar-date closure fraction, provider-exact
\`complaint_type='HEAT/HOT WATER'\`, Manhattan; two prior same weekdays
used for simple average of fractional baselines:

| Predeclared date | Created HEAT/HOT WATER requests | Administratively closed same calendar date | Same-day closure fraction | Mean reference fraction | Difference (percentage points) | Equal-weight common creation-hour adjusted difference |
|---|---:|---:|---:|---:|---:|---:|
| 2026-01-25 major snow | 1,274 | 61 | 4.788% | 7.654% | **−2.866 pp** | −7.342 pp (23 common hours) |
| 2026-02-23 blizzard/travel ban | 489 | 30 | 6.135% | 20.352% | **−14.217 pp** | −16.070 pp (24 common hours) |
| 2025-12-25 snow-free Christmas | 285 | 23 | 8.070% | 7.648% | **+0.422 pp** | −0.412 pp (24 common hours) |

**Primary adjudication: FAIL / NOT SUPPORTED.** The predeclared
universal two-storm threshold required BOTH dates to show at least
a 5.000 percentage-point fall in **raw** same-day administrative
closure rate. January only had −2.866pp, so the condition fails;
February met it. Do not replace the primary result with the more
favorable equal-hour sensitivity: that is diagnostic evidence
that request arrival-hour mixture changes this endpoint. The
Christmas holiday control showed no comparable raw decline,
but single-day tests are not causal evidence for snow.

**Original 48h/72h endpoint remains UNTESTED** because official
Socrata endpoint rejected \`datetime_add_hh\`: do not silently
claim that same-calendar-date is within 48 hours or equivalent
to the original experiment. The outcomes describe agency
administrative closure of 311 records, not restoration of
heating, field productivity, objective queue saturation,
or institutional RETURN. All dates and general annual totals
were known from prior exploration; reporting/agency composition,
closure procedure, times of creation and publication revision
may confound the measured differences.

**Scientific consequence:** status transitions and reporting
channels require distinct observation models and a tested
definition of capacity and recovery. A universal fixed
storm-related operational slowdown cannot be inferred from
these three cases. To distinguish seasonality/administrative
calendar from physical response, obtain independently chosen
events and a source-grounded service-restoration measure
with genuinely prior-time data, and compare against
operational queue/service models, not generic graphs only.
The MIHM canonical theory, Φ and production remain untouched.


### 2026-10-25 — Sensitivity of snow response to legitimate past-only reference windows

**Executed source-backed offline** from the existing annual Manhattan panel,
under \`scripts/research/mihm-nws-baseline-sensitivity.mjs\`, GitHub
[CI run 40226003536](https://github.com/Aptymok/system-friction/actions/runs/40226003536).
Raw calculations in
\`docs/research/evidence/MIHM-MANHATTAN-NWS-BASELINE-SENSITIVITY-2026-10-25.json\`.
For each previously selected NWS date we recompute the maximum 3-day
traffic down / FDNY dispatch up joint score, while varying the past
same-weekday baseline over **28, 42, 56 and 70 previous days**. No
target-day/future data are used in its reference medians.

| Historical reference | Jan25 major snow score | Feb22–23 blizzard score | Feb6 light NYC snow/cold | May20 mostly outer-borough flooding |
|---|---:|---:|---:|---:|
| Previous 28 days | 1405 | **1068** | 55 | 12 |
| Previous 42 days | 1405 | 4152 | 0 | 11 |
| Previous 56 days | 1428 | 4208 | 52 | 37 |
| Previous 70 days | 1457 | 4128 | 88 | 33 |

**What survives:** under every evaluated legitimate baseline both
major Manhattan-snow events exceed both low-snow/remote-impact events
on the predeclared descriptive joint indicator. In particular, the
Feb23 CBD travel collapse stays about −84% to −85% on each reference.

**What is unstable:** FDNY's estimated **percentage excess for Feb23**
is only +12.7% using the 28-day reference but +49% to +49.5% under
42–56-day reference, making the joint score vary by nearly 4x.
Prior January severe storm and contemporaneous changes in level may
alter shorter baselines. **Do not claim a fixed universal severity
ratio or MIHM scale-free shock coefficient.** Choosing a longer
window because it gives a better headline would be illegitimate
hindsight tuning.

**Scientific disposition:** a replicated direction/context-specific
observational finding passes one reasonable robustness challenge;
precise joint intensity and recovery claims remain baseline-dependent.
No prospective holdout, source publication vintage, causality, unique
MIHM model performance or official institutional RETURN is certified.
An independent severe weather event cohort with measured exposure,
policy effects, reporting categories and conventional controls is
required before any mechanism claim.
