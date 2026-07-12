# SFI-DT-INSTRUMENT-01 — Operational Gate Contract

This implementation does not claim historical calibration.

## Prediction entry gate

A Studio object may enter the predictive layer only when:

1. Phase 1 is complete: MIHM status is `VALID` and core coverage is complete.
2. Phase 2 is complete: field coverage is at least 0.667, WorldSpect confidence is at least 0.25, and persisted evidence exists.
3. If the object class is `person`, `organization`, or `movement`, explicit consent is documented in `studio_objects.metadata.amvConsent` or `metadata.consent`.

Required consent shape:

```json
{
  "amvConsent": {
    "documented": true,
    "evidenceId": "optional-evidence-id",
    "evidenceNote": "Explicit consent and scope declaration"
  }
}
```

## Gate outputs

- `READY_PROVISIONAL`: prediction may run, but remains `PROVISIONAL_NO_HISTORICAL_CALIBRATION` unless the model reports `CALIBRATED`.
- `EXPERIMENTAL_INSUFFICIENT_EVIDENCE`: no predictive number is produced by the Studio adapter.
- `CONSENT_REQUIRED`: no predictive number is produced and the case remains blocked.

A structural route may still be returned when prediction is gated, but it is labelled `STRUCTURAL_RECOMMENDATION_NOT_PREDICTIVE_INTERVENTION`.

## Non-claims

- The gate does not turn compatibility into acceptance probability.
- The gate does not treat missing values as zero.
- The gate does not promote expert priors to historical calibration.
- The gate does not authorize an intervention; ROOT confirmation remains required.
