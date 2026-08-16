# SFI-DT-EVIDENCE-MATERIALIZATION-1.0

Status: **FROZEN**

## Purpose

The evaluation evidence materializer removes manual evidence counts from confirmatory reveal. It produces the exact evidence pool consumed by the Decision Transfer scorer and freezes that pool before scoring.

## Canonical source stores

No new table is introduced. The materializer may read:

- `sfi_cognitive_twin_runs`
- `root_evidence_entries`
- `epistemic_events`

It persists its receipt as a run envelope in `sfi_cognitive_twin_runs` with role `DECISION_TRANSFER_EVIDENCE_MATERIALIZER`.

## Confirmatory provenance

Historical evaluator output is admissible only when the originating evaluator run is explicitly `CONFIRMATORY_FROZEN`, carries `SFI-DT-EVIDENCE-MATERIALIZATION-1.0` lineage, and matches the current `operationKey`. Legacy/manual diagnostic evaluator runs are excluded even when their payload shape resembles confirmatory evidence.

Historical evaluator reads are paginated until the closed-run history is exhausted. Page size is an implementation detail, not a scientific cutoff.

## Identity levels

The materializer reports four distinct quantities:

- `recordsSeen`: source records inspected.
- `uniqueEvidenceObjects`: distinct canonical root evidence objects.
- `uniqueEvents`: distinct epistemic events reached through lineage.
- `independentObservationGroups`: independent decision observations after collapse.

These are not interchangeable denominators.

## Deduplication

A repeated `DecisionTrace` is one decision observation even when represented by multiple evaluator runs. A single observed event represented through multiple projections or evidence records remains one event. Independence grouping is conservative: traces sharing the same observed event are collapsed to one independent observation group.

Conflicting duplicate labels are demoted from validating status instead of being counted optimistically.

## Epistemic grounding

A nominal `OBSERVED` or `VERIFIED_CONTRAST` record validates only when at least one referenced canonical root evidence object resolves to an epistemic event whose class is `observed`. If that grounding is absent, the record is retained diagnostically as `DERIVED`.

`SIMULATED`, `DERIVED`, and `INFERRED` never increase validating counters.

## Boundary probes

`empiricalBoundaryProbes` contain grounded `OBSERVED` or `VERIFIED_CONTRAST` probes. `diagnosticCounterfactuals` are stored separately.

A qualifying boundary probe must represent an expected disposition switch. If none exists:

`boundaryValidationStatus = BLOCKED`

and the receipt includes `EMPIRICAL_BOUNDARY_PROBE_MISSING`. The corresponding confirmatory counterfactual accuracy is persisted as `null`; absence of empirical measurement is not represented as `0.0`.

## Receipt

The frozen receipt contains, at minimum:

- experiment, blind run, target and operation identifiers
- context receipt hash
- target timing proof hash
- frozen model-contract hash
- materialization timestamp
- record/evidence/event/independence counts
- occurrences, supports, counterexamples and contrasts
- empirical boundary probes and diagnostic counterfactuals
- evidence/event identifiers and source stores
- epistemic classes
- qualifying counts
- validation and boundary status
- evidence pool hash
- receipt hash

`receiptHash` is computed over canonical JSON excluding the receipt hash itself.

## Model-contract integrity

Confirmatory materialization fails closed unless the blind run contains the frozen SFI-DT-1.0 model contract and that contract re-hashes correctly. Provider, actual model, expected model, temperature, max tokens, system-prompt hash, and prompt-template hash must all match the frozen protocol. `modelContractHash` is included in the evidence receipt.

## Execution order

The confirmatory route enforces:

`MATERIALIZE -> PERSIST -> RE-READ -> RE-HASH -> SCORE`

The frozen receipt lineage is passed into the evaluator as part of the scoring call and persisted with the evaluator run, evaluation record, Lab projection, blind reveal envelope, and ROOT audit. This avoids a second critical post-score write being required to establish scientific lineage.

A receipt from a prior identical attempt may be reused only when blind run, operation, target timing proof, context receipt hash, and model-contract hash match and the stored receipt re-verifies.

## Manual path

Manual occurrences, counterfactual probes, boundary counts, or thresholds are permitted only through the legacy diagnostic evaluator. That endpoint strips any claimed frozen evidence lineage, forces `NON_CONFIRMATORY_DIAGNOSTIC`, and cannot constitute SFI-DT-1.0 confirmatory evidence.
