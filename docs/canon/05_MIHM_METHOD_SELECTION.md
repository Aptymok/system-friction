# 05 · MIHM Method Selection

**Status:** CANONICAL  
**Version:** 2026-08-06.method-selection.v2

MIHM selects a method from the object, temporal scope, evidence modality and analytical purpose. It does not select a method from the variable name alone.

Canonical primary methods:

- `MOP_H`: identified person within an identified session.
- `SCOREFRICTION`: bounded object, artifact, signal or system.
- `PPOI`: longitudinal phenomenon with accumulated observations.
- `WORLD_VECTOR`: current world-context synthesis.
- `SFI_INSTITUTIONAL`: System Friction Institute as the observed institution.

Supporting methods may add context but cannot overwrite the primary method's reading. World Vector may contextualize ScoreFriction; it cannot replace it. MOP-H may describe human impact; it cannot calculate institutional state.

Selection outcomes are `READY`, `AMBIGUOUS` or `BLOCKED`. Required identifiers must be present before execution. A requested method that conflicts with object type must be rejected or sent to governance review.

Every method execution records method version, object ID, temporal window, inputs, formula or model version, output class and warnings.