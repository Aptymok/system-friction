# ADR-SFI-AGENT-EXECUTION-003 — Execution-centric agent governance

**Status:** ACCEPTED FOR INCREMENTAL IMPLEMENTATION  
**Version:** 1.0  
**Date:** 2026-09-02  
**Migration control:** #347

## Context

SFI already has a converged cognitive-agent registry, Agent Passports, an observed runtime, a manual ROOT execution path, governed deterministic/LLM execution, Cognitive Spine, and an immutable epistemic event plane.

The current manual execution contract is nevertheless too generic: one agent + one target + a free-text instruction. The runtime can prove that an agent executed, but ROOT cannot yet reconstruct every run as a complete human-readable operational dossier: why it ran, on which exact objects, which context was merely supplied, which evidence was admitted, how much context was delivered, which authority applied, what epistemic class each output had, and what later object consumed the result.

Creating a second agent platform or a second execution ledger would violate the canonical reuse-before-build and single-writer rules.

## Decision

The fundamental unit of audit is the **execution**, not the agent.

SFI distinguishes four projections:

1. **Agent Passport** — who/what the agent is, why it exists, its domain, sources, executor binding and potential authority.
2. **Agent State** — current derived condition, kept multidimensional rather than collapsed into one status.
3. **Execution Contract** — typed preconditions, legitimate inputs, parameters, outputs and prohibited claims for a particular agent.
4. **Execution Record** — immutable trace of one concrete execution.

These are distinct projections over the same institutional architecture. They are not four applications and do not create four stores.

## Canonical ownership

- `/root` owns sovereign observability, authority review and the human operating dossier.
- `src/lib/sfi/cognitive-runtime` owns cognitive execution contracts and runtime execution semantics.
- Cognitive Spine remains the transversal reconstruction/projection/integration layer; it is not replaced or duplicated.
- `epistemic_events` remains the canonical immutable execution event plane through the existing event writer.
- A future execution read model may index the event plane for UX/query performance only if demonstrated necessary. It must not become a second authoritative mutation path.

## Execution identity and anchoring

Every run MUST have:

- `execution_id`;
- `agent_id`;
- `execution_contract_version`;
- declared purpose;
- at least one context anchor;
- one or more explicit targets as required by that agent contract;
- requesting actor/source;
- timestamp and lineage through the canonical event plane.

Allowed initial context anchors are `CASE`, `CYCLE`, `PROJECT`, `NODE`, and `ANALYSIS_SESSION`.

`ANALYSIS_SESSION` is a lineage anchor for legitimate analysis that does not yet belong to a Case. In this phase it is not a new surface, database table, application or authoritative store. Promotion from an analysis session to a Case is a later governed transition, never an implicit side effect of execution.

## Epistemic separation

The following separations are constitutional:

```text
RECORD != EVIDENCE
CONTEXT != ADMITTED EVIDENCE
EVIDENCE != INFERENCE
INFERENCE != DECISION
DECISION != EXECUTION
EXECUTION != RETURN
RETURN != CONTRAST
CONTRAST != LEARNING
LEARNING != CANON
SIMULATION != OBSERVATION
MODEL CAPABILITY != INSTITUTIONAL AUTHORITY
```

A selected object may be supplied as execution context without becoming evidence. An existing evidence object may be referenced without changing its prior admissibility or epistemic assessment. Public research remains a source candidate until admitted through the evidence-governance path.

LLM interpretation remains `INFERENCE` even when the model is highly capable or highly confident.

## Agent state is multidimensional

A later read-model/UI slice MUST keep at least these dimensions distinct:

- infrastructure: `OPERATIONAL | GATED | DEGRADED | MISSING`;
- work: `IDLE | RUNNING | WAITING_EVIDENCE | WAITING_HUMAN | WAITING_RETURN | FAILED | COMPLETE | NOT_OBSERVED`;
- epistemic sufficiency for the selected run: `SUFFICIENT | PARTIAL | CONTRADICTED | INSUFFICIENT | NOT_OBSERVED`;
- authority: `ALLOWED | ANALYSIS_ONLY | APPROVAL_REQUIRED | BLOCKED | NOT_OBSERVED`.

`NOT_OBSERVED` is preferred over fabricating state from absence.

Last interaction, last execution and last current inference are separate timestamps/relations and MUST NOT be collapsed into one “last interpretation”.

## Agent-specific execution contracts

ROOT keeps one `EJECUTAR` action, but the request schema is selected by agent.

Examples:

- Evidence Hunter may receive a Case/claim/evidence context plus governed sources, time window, inclusion/exclusion criteria. It cannot auto-admit a found source as evidence.
- Cross Impact requires two or more legitimate objects/variables and may accept direction, range, baseline and hypothesis. It cannot declare causality merely from association.
- Risk Agent may assess a case/node/proposal/cycle/project, but risk estimation cannot become an executive decision by itself.
- Temporal Resolver may consume temporal objects plus timezone/calendar/SLA constraints. It cannot invent a missing timestamp.
- Trajectory Agent produces projection, not observation.
- Reality Calibration requires comparable observed return before claiming calibration.
- Social/Psychological simulation involving identifiable persons or groups activates contextual governance checks; system analysis is not silently converted into person scoring.
- Meta Orchestrator may coordinate only agents/actions within their own declared authority.

Every registered cognitive agent must resolve to exactly one Execution Contract: a specific override where required, otherwise a conservative registry-derived default.

## Execution record minimum

The event trace for a run must be capable of reconstructing:

- purpose;
- requester/trigger;
- anchors;
- targets;
- time scope;
- context supplied;
- existing evidence references;
- source candidates;
- methods/parameters;
- governance disposition;
- authority boundary;
- deterministic and LLM errors/degradation;
- provider/model where observed;
- context coverage/truncation where observed;
- epistemic outputs;
- downstream relations when later available.

Token counts, latency and provider cost MUST be recorded/displayed only when observed. If unavailable, the value is `NOT_OBSERVED`; SFI does not silently substitute an estimate.

## Context coverage

Agent-specific projection and prompt bounding remain valid defensive mechanisms. Their existence must be observable.

For each LLM-assisted run SFI should expose, when available:

- evidence available / delivered;
- hypotheses available / delivered;
- contradictions available / delivered;
- source candidates available / delivered where applicable;
- prompt source characters;
- bounded prompt characters;
- whether truncation occurred.

A bounded execution may still be valid, but must not present itself as an exhaustive analysis of material the agent did not receive.

## Governance preflight

The current coarse gate remains in force until expanded. The target design adds contextual preflight before execution:

```text
INTENDED PURPOSE
→ TARGET: SYSTEM / ORGANIZATION / PERSON / GROUP
→ JURISDICTION
→ DATA CATEGORIES
→ AFFECTED PERSONS/GROUPS
→ DECISION CONSEQUENCE
→ PRIVACY / IMPACT FLAGS
→ SFI AUTHORITY
→ AGENT AUTHORITY
→ ALLOW / ANALYSIS ONLY / APPROVAL REQUIRED / BLOCK
```

External standards/regulation are mappings and governance inputs, not sources of SFI truth or certification. SFI may state designed alignment only where evidence supports it. Certification/accreditation is never inferred from internal policy references.

## Reports and graph relations

No report claim may appear without either:

```text
REPORT → CLAIM → EXECUTION → EPISTEMIC OUTPUT → EVIDENCE → SOURCE/LINEAGE
```

or an explicit `INSUFFICIENT_EVIDENCE / UNSUPPORTED_CLAIM` status.

Relations between objects must preserve epistemic type. A visible A→B edge never silently means proven causality. Initial output classes are:

`OBSERVATION | DERIVED | INFERENCE | HYPOTHESIS | PROJECTION | RECOMMENDATION | NOT_EXECUTED`.

## Compatibility and removal condition

The legacy request shape:

`agentId + targetKind + targetId + instruction + optional URL/hypothesis`

is retained temporarily as an adapter into the typed execution request.

It MUST NOT remain the conceptual contract. It may be removed once all active ROOT/manual callers emit `anchors[] + targets[] + purpose` and contract-driven parameters, and the relevant integration QA proves no external client depends on the legacy fields.

## No DB migration in the foundation slice

The repository already contains the canonical `sfi_projects` migration; this ADR does not recreate it.

The foundation slice adds no `sfi_executions` table and no second execution writer. If later UX/query requirements justify a durable execution read model, that decision must identify its owner, derive it from canonical events, and preserve single-writer semantics.

## Rollback

The foundation implementation is additive and backward compatible. Reverting its commits restores the prior request surface. Existing epistemic events are never rewritten or deleted as part of rollback.

## Verification gates

Before merge:

- every registered cognitive agent resolves to one Execution Contract;
- Cross Impact rejects fewer than two targets;
- request validation rejects missing purpose, anchor or invalid target kind;
- legacy requests normalize into the canonical request shape;
- execution event metadata contains execution identity, contract version, anchors and targets;
- `check:boundaries`, typecheck, relevant runtime/convergence/execution QA and Root capability QA pass;
- full build passes before promotion to `main`.

## Consequence

SFI keeps its current architecture and gains a typed execution plane that can be expanded into the complete ROOT/Cognitive Spine operating dossier without creating a parallel agent system. The system becomes auditable at the point that matters: one concrete execution, on concrete objects, under concrete authority, with visible epistemic limits.