# 14 · Governance and Promotion

**Status:** CANONICAL  
**Version:** 2026-08-06.governance.v1

Canonical state changes only through an attributable promotion decision. ROOT/ACP evaluates proposals for variables, methods, formulas, thresholds, evidence classes, agent capabilities and public representations.

A promotion request must include objective, proposed identifier and version, scope, contract, evidence, tests, reproducibility data, risks, migration plan, rollback plan and unresolved limitations.

Decisions are `ACCEPTED`, `REJECTED`, `NEEDS_EVIDENCE`, `FROZEN` or `SUPERSEDED`. Approval does not erase prior versions. Reversion creates a new governance event and restores an identified prior contract.

Models and submitting agents cannot approve their own proposals. High-impact, public, irreversible, privacy-sensitive or external-execution changes require explicit human authorization.

A document alone does not make a runtime behavior canonical. A runtime implementation alone does not make an undocumented concept canonical. Promotion requires agreement among documentation, executable contract, persistence semantics and validation.

Conflicts discovered after promotion are marked `CONFLICTED` and routed back to governance; they are not silently patched through aliases.