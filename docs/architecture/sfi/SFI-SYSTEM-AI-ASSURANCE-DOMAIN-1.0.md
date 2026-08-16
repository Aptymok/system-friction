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

`SYSTEM_OBSERVATORY` can therefore expose a future friction map from persisted nodes, relations, observations and assessed frictions without hard-coding a visual layout in the backend.

## AI implementation diagnostic

AI execution traces preserve identifiers/hashes and declared topology without requiring raw prompts or raw inputs in the Case store. Failures remain observed records. Localization to DATA/MODEL/PROMPT/RETRIEVAL/TOOL/INTEGRATION/WORKFLOW/HUMAN_HANDOFF/GOVERNANCE is an evidence-backed epistemic assessment.

`FAILURE EVENT ≠ ROOT CAUSE`.

The contract explicitly prevents defaulting every failure to “the model.”

## AI adoption & integration

A process and use-case pair can receive an evidence-backed projected assessment of value, feasibility, integration risk and required controls.

`PROJECTED VALUE ≠ OBSERVED RETURN`.

Any resulting recommendation still passes through the Case action gate before intervention.

## AI governance assurance

The trace model distinguishes MODEL → PROMPT → INPUT → CONTEXT → OUTPUT → DECISION → HUMAN AUTHORITY → ACTION → RETURN. Completeness can be measured without claiming legal/regulatory compliance or truth authority.

`TRACE COMPLETENESS ≠ COMPLIANCE`.

`AI OUTPUT ≠ DECISION`.

## Observatory read model

`SFI-SYSTEM-AI-OBSERVATORY-READ-MODEL-1.0` provides neutral nodes, relations, frictions, assessments, failures, executions, action states and counts. It deliberately returns:

- `visualLayout = null`
- `ranking = null`

Screen hierarchy, graph layout, visual encodings and interaction design remain a separate UI decision.
