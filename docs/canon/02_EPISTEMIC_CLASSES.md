# 02 · Epistemic Classes

**Status:** CANONICAL  
**Version:** 2026-08-06.epistemic.v1

Every assertion, variable instance and result must declare one class:

- `OBSERVED`: directly supported by an identified source or measurement.
- `DECLARED`: stated by an identified actor but not independently verified.
- `IMPORTED`: copied from an external system with source identity preserved.
- `EXTRACTED`: obtained from source material without adding meaning beyond the source.
- `DERIVED`: deterministically calculated from identified inputs.
- `INFERRED`: interpretation whose premises and uncertainty are explicit.
- `SIMULATED`: produced inside a declared model or scenario.
- `PROPOSED`: candidate awaiting evidence or governance.
- `MISSING`: required information is absent.
- `DEGRADED`: information exists but fails a quality requirement.
- `CONFLICTED`: two or more qualified sources or contracts disagree.
- `REJECTED`: evaluated and not admitted.
- `CANONICAL`: promoted by the authorized governance process.

Confidence never changes class. A high-confidence inference remains inferred. A realistic simulation remains simulated. A declared statement remains declared until evidence changes its status.

Interfaces may simplify labels for users, but stored state must retain the canonical class.