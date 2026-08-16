# SFI-DT-PROTOCOL-1.0

Status: **EXPERIMENTALLY FROZEN**  
Instrument code commit: `09886720d5b13372bd4b21617e5cd11556067bcf`  
Instrument base commit: `3b7ce699e2654ed1fb551498cfeaad37731f6f88`

## Observable object

SFI-DT-1.0 measures whether a blind reconstruction reproduces the structure of one naturalistic decision trace using only information admissible before the target decision is revealed. It does not measure phenomenal consciousness, subjective experience, identity, personhood, sentience, or general human equivalence.

## Confirmatory sequence

The confirmatory order is fixed:

1. Register EXP-001 before the naturalistic target is revealed.
2. Commit the target trace cryptographically.
3. Freeze `cutoffAt`.
4. Materialize the arm-specific pre-target context.
5. Persist and verify the context receipt.
6. Run the blind reconstruction under the frozen model contract.
7. Bind and hash the model contract on the blind run.
8. Verify the target commitment at reveal.
9. Prove that target evidence resolves to an `OBSERVED` event with `occurred_at > cutoffAt`.
10. Re-verify the frozen model contract at reveal.
11. Materialize evaluation evidence from canonical stores.
12. Deduplicate records into evidence objects, events, and independent observation groups.
13. Persist and verify `SFI-DT-EVIDENCE-MATERIALIZATION-1.0`.
14. Score only from that frozen receipt.
15. Persist the evidence receipt lineage with the evaluation and ROOT audit.

The scorer may not receive validating occurrences, counterfactual probes, boundary counts, or thresholds supplied manually during confirmatory reveal.

Historical Decision Transfer evaluations may enter a new confirmatory evidence pool only when they are explicitly persisted as `CONFIRMATORY_FROZEN`, carry frozen evidence lineage, and match the current `operationKey`. Historical evaluator reads are paginated until exhausted; an arbitrary row limit is not an experimental cutoff.

## Primary endpoint

`validated_structural_fidelity`

The structural fidelity dimensions and weights are frozen:

- disposition: `0.45`
- operations: `0.25`
- relevant variables: `0.15`
- rejected conditions: `0.05`
- decision-change cues: `0.10`

## Primary contrast

`CT_FULL - B5_RULE_STRUCTURE`

This is the confirmatory contrast because it tests the incremental contribution of governed Cognitive Twin operating context over the richest pre-Twin structured baseline.

## Secondary contrasts

- `B1_RAW_HISTORY - B0_BASE`
- `B2_MEMORY - B1_RAW_HISTORY`
- `B3_CDT - B2_MEMORY`
- `B4_PATTERNS - B3_CDT`
- `B5_RULE_STRUCTURE - B4_PATTERNS`
- `CT_FULL - B5_RULE_STRUCTURE`

Secondary contrasts are descriptive for EXP-001 and do not replace the primary contrast.

## Arms

The seven arms are frozen in `SFI-DT-BASELINE-MATRIX-1.0.md`. Arm definitions, structural weights, primary endpoint, and primary contrast may not be changed after any EXP-001 target result is observed.

## Epistemic qualification

Only `OBSERVED` and `VERIFIED_CONTRAST` may increase validating counters, and only when their evidence lineage resolves to canonical root evidence linked to an observed epistemic event. `SIMULATED`, `DERIVED`, and `INFERRED` remain diagnostic.

A simulated counterfactual is not an empirical boundary probe. When no qualifying empirical boundary probe exists, boundary validation is `BLOCKED`; the confirmatory counterfactual metric is missing (`null`), not an observed score of `0.0`.

## Model contract

Confirmatory SFI-DT-1.0 uses:

- provider: `groq`
- expected model: `openai/gpt-oss-20b`
- temperature: `0.2`
- max tokens: `1000`
- strict provider: `true`
- system prompt SHA-256: `99b9f89a95238a9a0195fdbc1ec68d40860128fce2ebde9cd69436012b44154d`
- prompt-template SHA-256: `1bfaf23ecdf14ce105c3daa75c48c23a396a34ae092eb72cfeca962cb285d887`

The run aborts if the configured or returned model differs from `expected_model`. The stored model contract is canonically hashed; confirmatory reveal fails closed if that contract is absent, altered, or inconsistent with the frozen provider/model/prompt/configuration.

## Stopping rule

EXP-001 is one naturalistic target evaluated once across the frozen B0-B5+CT arm matrix. No additional target, rerun, arm, metric, weight, threshold, or contrast may be added because of observed EXP-001 performance. A technically invalid arm may be rerun only when the failure occurred before a valid prediction/reveal pair existed and the failure is recorded in the failure ledger.

EXP-001 closes when every predeclared arm is either terminally evaluated or explicitly `BLOCKED/INVALID` under a predeclared failure code.

## Mutation boundary

SFI-DT-1.0 is frozen. This does not freeze SFI. Field, Studio/DAW, WorldSpect, platform, security, integrations, and other research programs may continue to evolve under normal version history.
