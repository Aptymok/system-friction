# 09 · Method Lab and Simulation

**Status:** CANONICAL  
**Version:** 2026-08-06.method-lab.v1

Method Lab is an isolated experimental context. It may read authorized canonical state and produce candidate variables, methods, propositions, simulations, calibration results and promotion requests. It may not mutate canonical state directly.

Laboratory identifiers use the `LAB_*` namespace until promoted. A candidate variable is not available to production methods merely because a model extracted it from narrative.

Canonical simulation families are deterministic rules, historical replay, Monte Carlo, controlled perturbation, graph propagation, system dynamics, agent-based and counterfactual. Each run records method version, dataset hash, parameters, seed, code commit, provider/model when used, timestamps and result hash.

Simulation output is always `SIMULATED`. It may validate internal consistency or estimate sensitivity; it does not become observed evidence.

Validation levels are structural, logical, simulation, retrospective and prospective. The interface must state the achieved level and never imply that simulation validation equals reality validation.

Promotion from the lab requires a complete contract, reproducible run, evaluation evidence and ROOT/ACP decision.