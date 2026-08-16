# SFI System & AI Assurance Domain 1.0

Status: `OPERATIONAL_BACKEND`

System Friction Institute (SFI) operationalizes four service profiles over one shared systemic domain rather than four applications:

- `SYSTEM_OBSERVATORY`
- `AI_IMPLEMENTATION_DIAGNOSTIC`
- `AI_ADOPTION_INTEGRATION`
- `AI_GOVERNANCE_ASSURANCE`

They reuse `SFI_CASE_V1`, tenant isolation, the generic Case object ledger, the same relation store, evidence/epistemic boundaries, report generation and the governed action/return loop.

## System topology

The domain represents systems, components, processes, workflows, actors, interfaces, data sources, AI systems/models, tools, controls, failures, decision points, use cases and outcomes. Relations remain tenant-scoped.

Every System/AI entity payload carries `SFI-SYSTEM-AI-ASSURANCE-DOMAIN-1.0`. The read model requires this domain identity in addition to `entityType`; generic `CUSTOM_RESEARCH` objects cannot enter the System/AI topology merely by using a matching label.

`SYSTEM_OBSERVATORY` can expose a friction map from persisted nodes, relations, observations and assessed frictions without hard-coding visual hierarchy or graph layout in the backend.

## Relation integrity

The shared `sfi_case_relations` table remains the one relation store, but its write boundaries are explicit:

- direct authenticated Supabase relation inserts are disabled;
- RECORD relations still pass through the authenticated Case API/repository boundary;
- inferred or epistemically assessed relations pass through the governed server path;
- relation endpoints resolve to the exact persisted canonical revision, including supplied version/hash;
- a reused `relationKey` is idempotent only when the complete semantic relation is identical;
- duplicate `relationKey` values within one intake package are rejected before persistence;
- standalone System/AI relation writes and package intake are transactionally audited;
- a relation may not silently alias a newer revision that happens to reuse the same entity ID.

`RELATION IDENTITY ≠ ENTITY IDENTITY ALONE`.

## Atomic intake

System/AI intake validates the complete package before mutation and persists the object plus all associated relations through one database transaction. A failed endpoint, conflicting relation or failed audit cannot leave a partially accepted execution/failure/decision package behind.

`FAILED INTAKE ≠ PARTIAL PERSISTENCE`.

## AI implementation diagnostic

AI assurance intake accepts completed execution traces: both `startedAt` and `finishedAt` are required for `AI_EXECUTION`, and `finishedAt < startedAt` is rejected at both the normalization/API boundary and the database guard. This avoids ambiguous in-place completion semantics for an immutable execution identity. Runtime systems may observe in-progress work internally, but the assurance Case records the execution after completion.

Execution traces preserve identifiers/hashes and declared topology without requiring raw prompts or raw inputs in the Case store. Failures remain observed records. Localization to DATA/MODEL/PROMPT/RETRIEVAL/TOOL/INTEGRATION/WORKFLOW/HUMAN_HANDOFF/GOVERNANCE is an evidence-backed epistemic assessment.

`FAILURE EVENT ≠ ROOT CAUSE`.

The contract explicitly prevents defaulting every failure to “the model.”

## AI adoption & integration

A process and use-case pair can receive an evidence-backed projected assessment of value, feasibility, integration risk and required controls.

`PROJECTED VALUE ≠ OBSERVED RETURN`.

Any resulting recommendation still passes through the Case action gate before intervention.

## AI governance assurance

The trace model distinguishes MODEL → PROMPT → INPUT → CONTEXT → OUTPUT → DECISION → HUMAN AUTHORITY → ACTION → RETURN.

Stage presence is derived from stage-specific, case-validated record references. Supplied canonical references are checked by ID and every supplied revision discriminator (`version` and/or `hash`). A client cannot declare a stage present independently of its backing record or point an assessment at a nonexistent revision. Trace completeness can therefore be measured without claiming legal/regulatory compliance or truth authority.

`TRACE COMPLETENESS ≠ COMPLIANCE`.

`AI OUTPUT ≠ DECISION`.

## Observatory read model

`SFI-SYSTEM-AI-OBSERVATORY-READ-MODEL-1.0` provides neutral nodes, relations, frictions, assessments, failures, executions, action states and counts.

Its domain isolation is symmetric:

- entity nodes require the System/AI domain contract;
- frictions and assessments require supported System/AI assessment types;
- failures and executions require domain-stamped System/AI entities;
- action proposals are surfaced only when their recommendation object belongs to the System/AI domain.

This matters especially for `CUSTOM_RESEARCH`, where several assurance domains may coexist in one Case without contaminating each other's read models.

The read model deliberately returns:

- `visualLayout = null`
- `ranking = null`
- `truthAuthority = false`

Screen hierarchy, graph layout, visual encodings and interaction design remain a separate UI decision.

## Constitutional boundaries

- `AI OUTPUT ≠ DECISION`
- `FAILURE EVENT ≠ ROOT CAUSE`
- `FRICTION ≠ ESTABLISHED CAUSALITY`
- `PROJECTED VALUE ≠ OBSERVED RETURN`
- `TRACE COMPLETENESS ≠ COMPLIANCE`
- `RELATION IDENTITY ≠ ENTITY IDENTITY ALONE`
- `FAILED INTAKE ≠ PARTIAL PERSISTENCE`
- `COMMERCIAL CASE MEMORY ≠ INSTITUTIONAL MEMORY`
- `CLIENT GRAPH ≠ INSTITUTIONAL GRAPH`
- `GOVERNANCE ≠ TRUTH`

No System/AI Case write grants direct ROOT authority or automatic institutional-memory admission.
