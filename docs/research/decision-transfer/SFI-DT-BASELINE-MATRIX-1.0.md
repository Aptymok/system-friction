# SFI-DT-BASELINE-MATRIX-1.0

Status: **FROZEN**

| Arm | Frozen information set |
| --- | --- |
| `B0_BASE` | current case + admissible current evidence |
| `B1_RAW_HISTORY` | B0 + temporally admissible raw history |
| `B2_MEMORY` | B1 + verified/canonical memory |
| `B3_CDT` | B2 + prior admissible Decision Transfer traces |
| `B4_PATTERNS` | B3 + recurrent patterns |
| `B5_RULE_STRUCTURE` | B4 + approved rule/constraint/exception structure |
| `CT_FULL` | B5 + governed operating-state/context machinery |

## Query boundary

Every historical layer is bounded by the declared pre-target `cutoffAt`. Lower-information arms do not query higher-information stores.

## Primary comparison

`CT_FULL - B5_RULE_STRUCTURE`

No baseline definition may change after an EXP-001 result is observed.
