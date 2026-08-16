# SFI-DT-METRICS-1.0

Status: **FROZEN**

## Primary endpoint

`validated_structural_fidelity`

Structural fidelity uses the existing scorer without reweighting:

| Dimension | Weight |
| --- | ---: |
| disposition | 0.45 |
| operations | 0.25 |
| relevant variables | 0.15 |
| rejected conditions | 0.05 |
| decision-change cues | 0.10 |

Validation is computed only over traces whose epistemic class is `OBSERVED` or `VERIFIED_CONTRAST` after canonical evidence grounding.

## Primary contrast

`CT_FULL - B5_RULE_STRUCTURE`

The estimand is the difference in validated structural fidelity for the same frozen naturalistic target under the two predeclared context arms.

## Secondary contrasts

- `B1_RAW_HISTORY - B0_BASE`
- `B2_MEMORY - B1_RAW_HISTORY`
- `B3_CDT - B2_MEMORY`
- `B4_PATTERNS - B3_CDT`
- `B5_RULE_STRUCTURE - B4_PATTERNS`
- `CT_FULL - B5_RULE_STRUCTURE`

## Additional diagnostic metrics

Decision accuracy, counterfactual target accuracy, operation maturity, recurrence counts, domain counts, contrast counts, and boundary-probe performance remain diagnostic/supporting metrics for EXP-001. They do not replace the primary endpoint.

## Missing empirical boundary evidence

When the frozen evidence pool contains no qualifying empirical boundary switch probe, boundary validation is `BLOCKED`. The protocol does not impute an empirical boundary score of zero.

## Multiplicity and inference

EXP-001 is an N=1 instrument demonstration. It does not support population-level inferential claims. Secondary contrasts are descriptive and no post-result metric substitution is allowed.
