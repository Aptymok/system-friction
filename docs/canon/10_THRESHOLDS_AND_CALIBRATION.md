# 10 · Thresholds and Calibration

**Status:** CANONICAL  
**Version:** 2026-08-06.calibration.v1

A threshold is part of a versioned method contract. It is not an arbitrary UI constant and must not be changed silently by a model or developer.

Each threshold declares variable, method, object scope, value or range, unit, decision effect, calibration mode, evidence window, error costs and version.

Calibration modes are expert-seeded, supervised empirical, unsupervised exploratory and longitudinal. Expert-seeded thresholds remain `THIN` until evaluated. Exploratory thresholds remain laboratory-only.

Evaluation must consider false positives, false negatives, precision, sensitivity, temporal stability, sensitivity to perturbation and institutional error cost. The selected threshold and rejected alternatives remain reproducible.

When a threshold changes, existing readings retain the version used at calculation time. Recalculation creates a new reading; it does not overwrite history.

Missing calibration does not authorize a plausible default unless the method contract explicitly permits a named default and marks the result `THIN` with a warning.