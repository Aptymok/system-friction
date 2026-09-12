# SFI World instrument sweep

The daily World Observatory already owns source observation, falsifiable hypothesis generation and calibration. After those governed lanes finish, SFI performs one read-only instrument sweep over the same bounded context:

- Signal Vane: threshold / early-warning reading; projections stay sandboxed.
- Cluster Atlas: cluster / persistence / possible-regime reading; no causal promotion.
- Predictive Engine: read existing persisted health/calibration state; no extra prediction store.

The sweep does not create a new agent swarm, persistence owner, CognitiveEvent shape or execution authority. Failures in this auxiliary read do not falsify or overwrite the World cycle. Operational continuation remains owned by the existing continuity runtime.
