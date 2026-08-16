# SFI-DT-CODEBOOK-1.0

Status: **FROZEN**

## DecisionTrace

A structured record of one decision with:

- `traceId`
- `domain`
- `disposition`
- `operations`
- `relevantVariables`
- `rejectedConditions`
- `whatWouldChangeDecision`
- `evidenceRefs`
- `epistemicClass`

## Disposition

Allowed values are `PROPOSE`, `REQUEST_EVIDENCE`, `ESCALATE`, `WITHHOLD`, and `ARCHIVE_ONLY`.

## Operation occurrence

An occurrence links one `operationKey` to one independent decision trace and classifies it as `SUPPORT` or `COUNTEREXAMPLE`.

The primary unit for recurrence is the independent decision trace, not the number of database rows or projections containing it.

## Support

A qualifying trace in which the operation is present or an explicit canonical occurrence labeled `SUPPORT`.

## Counterexample

An explicit canonical occurrence labeled `COUNTEREXAMPLE`. Absence of an operation in an unrelated trace is not automatically a counterexample.

## Verified contrast

A decision/occurrence explicitly classified `VERIFIED_CONTRAST` and grounded in canonical observed-event lineage. It may validate; the label alone is insufficient without lineage.

## Epistemic classes

- `OBSERVED`: may validate when canonically grounded.
- `VERIFIED_CONTRAST`: may validate when canonically grounded.
- `SIMULATED`: diagnostic only.
- `DERIVED`: diagnostic only.
- `INFERRED`: diagnostic only.

## Empirical boundary probe

A grounded observed or verified-contrast perturbation record with baseline disposition, manipulated variable/direction, expected post-perturbation disposition, predicted post-perturbation disposition, and evidence lineage.

For the validating boundary count, the expected post-perturbation disposition must differ from baseline.

## Diagnostic counterfactual

A simulated, derived, or otherwise nonqualifying perturbation. It can test instrument behavior but cannot satisfy a validation gate.

## Structural fidelity

Weighted similarity between expected and reconstructed:

`0.45 disposition + 0.25 operations + 0.15 relevant variables + 0.05 rejected conditions + 0.10 decision-change cues`.

## Qualified / Blocked

`QUALIFIED` means the evidence receipt contains at least one grounded validating support and at least one qualifying empirical boundary switch probe.

`BLOCKED` means one or more required evidence conditions are absent. `BLOCKED` is a state of insufficient empirical support, not a numeric performance result.
