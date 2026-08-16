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

and the receipt includes `EMPIRICAL_BOUNDARY_PROBE_MISSING`.

## Receipt

The frozen receipt contains, at minimum:

- experiment, blind run, target and operation identifiers
- context receipt hash
- target timing proof hash
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

## Execution order

The confirmatory route enforces:

`MATERIALIZE -> PERSIST -> RE-READ -> RE-HASH -> SCORE`

A receipt from a prior identical attempt may be reused only when blind run, operation, target timing proof, and context receipt hash match and the stored receipt re-verifies.

## Manual path

Manual occurrences, counterfactual probes, boundary counts, or thresholds are permitted only through the legacy diagnostic evaluator. That endpoint is marked `NON_CONFIRMATORY_DIAGNOSTIC` and cannot constitute SFI-DT-1.0 confirmatory evidence.
