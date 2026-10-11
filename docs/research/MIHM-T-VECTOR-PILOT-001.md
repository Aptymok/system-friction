# MIHM-T Vector & Temporal Transfer Pilot 001

**State:** `EXPERIMENTAL / SYNTHETIC_QA_ONLY` — NOT a preregistration or scientific validation.  
**Parent:** [SFI-MIHM-T-EXP-001-PREREGISTRATION](./SFI-MIHM-T-EXP-001-PREREGISTRATION.md) (`DRAFT_UNFROZEN`).  
**Cross-study context:** [Three-Experiment Convergence](./SFI-THREE-EXPERIMENTS-CONVERGENCE.md).  
**Code:** [src/lib/mihm/experimentalTemporalVectorPilot.ts](../../src/lib/mihm/experimentalTemporalVectorPilot.ts), [QA](../../src/lib/mihm/experimentalTemporalVectorPilot.test.ts).  
**Date:** 2026-10-10. **Language:** English.

## 1. Purpose

Make an **existing** experimental SFI concept executable in a small, *pure* function: `MIHM-DIMENSIONAL-TRANSFER-MODEL-0`, already defined in `src/core/contracts/system.ts`.

The pilot tests whether a proposed *cross-dimensional vector coupling* produces different **synthetic conditional risk readings** when a fictional latent dependency or fictional temporal lag is removed. It does not estimate real-world causal influence, identify a validated cross-domain invariant, or run the confirmatory MIHM-T experiment.

**Do not create a new Φ.** The full set of canonical `PHI_H`, `PHI_S`, `PHI_F`, `PHI_W`, `PHI_SFI` remains in its existing instrument-specific contracts. These pilot values are synthetic unitless risk components, not Phi values.

## 2. Objects and timing

Inputs are explicitly `SYNTHETIC_ONLY`, case IDs prefixed `LAB-SYN-`, readings with distinct `occurredAt` and `knownAt`, `T0`, forecast horizon, a `SIMULATION` dimensional-transfer tuple, a fictional latent-mechanism strength, and a **proposed** intervention intensity. No actual intervention is executed.

A dimension may be used only when it has a reading with BOTH `occurredAt <= T0` and `knownAt <= T0`. A fictional mechanism and intervention also must be declared before `T0`. If data required for the mechanism is missing, the analysis must `BLOCK`, **never substitute a plausible value**.

For this **conditional simulation**, the hypothetical intervention is assumed to activate at `T0` if it were performed; `proposedAt` only proves that a candidate proposal existed in the fictional case, not execution. Transfer lag is measured from that *counterfactual T0 activation*, **not** from the observation timestamp of the source variable. Reuse under a different temporal semantics requires a new explicit and tested design.

### Computational demonstration (not a fitted scientific model)

Let `b` be a fictional target-domain risk reading; `s` a fictional source reading; `g` coupling gain; `m` magnitude; `a` attenuation; `h` latent-dependency strength; `u` candidate intervention intensity; `tau` lag in hours; `H` forecast horizon.

- `interaction = s * g * m * (1-a) * h * u`.
- `M1_candidate = clamp01(b + 1[tau <= H] * interaction)`.
- `M_ablated_interaction = b`.
- `M_ablated_latent = b`.
- `M_ablated_clock = clamp01(b + interaction)`.

This does **not** constitute a calibrated probability model. It is a falsifiable software hypothesis: under declared fictional conditions, changes to `tau`, `h`, `u` and cutoff eligibility must modify the output exactly as specified. **Ablated interaction is NOT MIHM-T's scientifically competent M0.** The eventual M0 must incorporate conventional incident, safety and causal analyses with equal admissible evidence.

The test fixture uses `b=0.2`, `s=0.9`, `g=0.75`, `m=0.8`, `a=0.1`, `h=0.8`, `u=1`, `tau=6h`. For `H=12h`, M1 = **0.5888** vs ablated = **0.2**. For `H=4h`, M1 = **0.2** while no-clock candidate = **0.5888**. These values were **constructed** as a fixture: they are not derived from institutional evidence and do not measure model validity.

## 3. A bounded PEMS diagnostic

The input includes `predeclaredEquivalenceDelta`. The QA fixture uses `0.01` only as an easily testable mathematical boundary, **not an acceptable universal or calibrated loss threshold**.

A candidate minimum-required list is computed by comparing full M1 to only two explicit ablations. The list is *not* a proof of global or causal minimality; it cannot prove that an organization, Cognitive Twin, person or causal structure has retained its identity.

**Distinguish:**
- *Functional reconstruction sufficiency* = results remain within a task-defined tolerance under the tested ablations.
- *Epistemic provenance invariants* = require declared timestamps, source types, operator identity and no invented evidence.
- *Scientific individuation* = requires different controls, subject histories and independent observations; not tested here.

## 4. Outcome contrast

`scoreSyntheticOutcome()` is called separately **after** a prediction has been made. It accepts an explicitly `SIMULATED` binary outcome bound to the same case ID and computes Brier **demonstration loss**, not a fitted forecast skill or independent RETURN.

Nothing in the scorer proves the predicted risk is calibrated, prospectively valid or better than a competent M0.

## 5. Evidence, authorization, and Reality Chain exclusions

- `SYNTHETIC_ONLY` input, `epistemicClass=SIMULATED` output.
- `transfer.epistemicClass=SIMULATION` and `transfer.evidenceRefs=[]` are mandatory.
- `realExecution=false`, `observedReturn=null`, `realityChainEligible=false`, `canonicalPhi=false`, `canPromoteCanon=false`.
- No network, DB, REST/MCP persistence, external effect, institutional execution, authority expansion, Case Platform writing, governed root evidence admission or graph mutation.
- A synthetic score is not canonical evidence, nor does an informational analysis become true by being calculated.
- The real 2012 **Knight Capital** case remains a *retrospective calibration candidate*, not a clean prospective holdout. Famous LLM-learned incidents cannot be represented as unknown to the model by a textual cutoff alone.
- The separate AI Week NYC exercise remains a `LAB-SYN` reconstruction; **this pilot does not consume its fictional RETURN as empirical evidence**.

## 6. How to run and interpret

```sh
node --import tsx --test src/lib/mihm/experimentalTemporalVectorPilot.test.ts
```

The checks cover: correct example numbers, cutoff filtration, post-cutoff knowledge exclusion, missing data abstention, missing transfer parameters, latent-history eligibility, evidence/authority prohibitions, non-execution, and separated post-prediction synthetic scoring.

This code runs inside the existing MIHM area; the existing `SFI Verify` CI can run the test. No UI dashboard, competing computation service, new persistent table or alternative source register is created.

## 7. What is STILL missing for MIHM-T EXP-001

1. A precise scientific response variable, units and independent observed outcome (not these simulated outputs).
2. A competent same-information **M0** baseline, including safety/system analysis and standard statistical controls where appropriate.
3. An empirically defensible mechanism/gain/lag estimation protocol fixed before outcome reveal.
4. A predefined loss, uncertainty/abstention treatment, cost of false alarms, stopping rules and hypothesis-discriminating threshold.
5. Cases with admissible historical vintages at T0, blinded/outcome-independent evaluation and negative episodes.
6. External timestamp attestation, qualified source custody and real independent RETURN where confirmatory claims are sought.
7. Registration/freeze of MIHM-T under the canonical Method Lab experiment contract; no changes to LCI or frozen SFI-DT.

**Conclusion:** `VECTOR/TRANSFER CODE = IMPLEMENTED PILOT`; `EXPECTED DIFFERENCES = SYNTHETIC_QA`; `MIHM-T RESEARCH = UNFROZEN/NOT_VALIDATED`; `PEMS = CROSS-EXPERIMENT PROPOSED PROPERTY`.
