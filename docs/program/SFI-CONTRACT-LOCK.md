# SFI CONTRACT LOCK

**Contract:** `SFI-PROGRAM-CONTRACT-LOCK-1.0`  
**Baseline:** `565ac410fceb56d86ff9d6eaec85b901d0d77248`  
**Authority:** SFI-00 · CONTROL ROOM  
**Status:** FROZEN FOR PROGRAM BOOTSTRAP

This document freezes the shared cross-workstream contract surface. A workstream may extend owned implementation details, but it may not silently fork these names, meanings, authority boundaries or ownership rules.

## 1. Domain-neutral observation contract

### `ObservedSystem`

```ts
export type SfiObservedSystemKind =
  | 'DIGITAL'
  | 'PHYSICAL'
  | 'ORGANIZATIONAL'
  | 'SOCIAL'
  | 'ECONOMIC'
  | 'CULTURAL'
  | 'INFRASTRUCTURAL'
  | 'ECOLOGICAL'
  | 'HYBRID'
  | 'OTHER';

export interface SfiObservedSystem {
  systemId: string;
  name: string;
  systemKind: SfiObservedSystemKind;
  boundaries: Record<string, unknown>;
  actors: Array<Record<string, unknown>>;
  environment: Record<string, unknown>;
  observationModes: SfiObservationSourceKind[];
  temporalScope: { from: string | null; to: string | null; timezone: string | null };
  jurisdiction: string | null;
  ownerRef: string | null;
  declaredPurpose: string;
}
```

Digital is a domain adapter, not the SFI ontology.

### `ObservationSourceKind`

```text
API
DATABASE
LOG
DOCUMENT
DATASET
SENSOR
IMAGE
AUDIO
VIDEO
INTERVIEW
QUESTIONNAIRE
HUMAN_OBSERVATION
FIELD_MEASUREMENT
PUBLIC_RECORD
WEB_SOURCE
PHYSICAL_ARTIFACT
DERIVED_MEASUREMENT
```

`DERIVED_MEASUREMENT` must preserve derivation lineage and cannot inherit OBSERVED solely from the source object's observed state.

## 2. Epistemic invariants

Shared vocabulary must preserve existing canonical SFI semantics.

- `OBSERVATION`: admitted observation with provenance.
- `EVIDENCE`: admitted evidentiary object; admission is explicit.
- `SOURCE_CANDIDATE`: discovered but not admitted source.
- `INFERENCE`: derived claim.
- `HYPOTHESIS`: testable explanatory claim.
- `PROJECTION`: future/conditional modeled state.
- `SIMULATION`: model-generated scenario.
- `PREDICTION`: T0-frozen expected future observable.
- `RETURN`: later real-world observation linked to a prior prediction/intervention/question.
- `CONTRAST`: comparison between persisted prior state and RETURN.
- `LEARNING_CANDIDATE`: proposed learning not yet promoted.
- `MISSING`: required but absent.
- `NOT_OBSERVED`: explicitly not observed.

No workstream may create aliases that weaken these distinctions.

## 3. Cognitive passport contract

Canonical identifier: `SFI-COGNITIVE-PASSPORT-1.0`.

```ts
export interface SfiCognitivePassport {
  id: string;
  version: string;
  name: string;
  purpose: string;
  epistemicMode: 'OBSERVE' | 'RECONSTRUCT' | 'INFER' | 'SIMULATE' | 'PROJECT' | 'DECIDE' | 'LEARN';
  input: {
    required: string[];
    optional: string[];
    acceptedEvidenceClasses: string[];
    requiredEvidenceClasses: string[];
    sourcePolicies: string[];
  };
  output: {
    allowedEpistemicClasses: string[];
    schemaRef: string | null;
    confidencePolicy: string;
    missingPolicy: string;
    contradictionPolicy: string;
  };
  tools: {
    allowedToolClasses: string[];
    allowedResources: string[];
    forbiddenResources: string[];
  };
  modelRequirements: SfiOperationModelRequirements;
  authority: {
    ceiling: SfiAuthorityClass;
    confirmationRequirement: 'NONE' | 'POLICY' | 'HUMAN';
  };
  orchestration: {
    mayRequestCapabilities: boolean;
    requestableCapabilityIds: string[];
    requestableCapabilityClasses: string[];
    maxDepth: number;
    maxChildren: number;
    stopConditions: string[];
  };
  return: {
    required: boolean;
    condition: string | null;
    falsificationCondition: string | null;
  };
  security: {
    defaultTtlSeconds: number;
    sensitivityClass: string;
    loggingRequired: boolean;
  };
}
```

Existing 21 agent IDs remain valid historical/execution identifiers. Program evolution reinterprets them as governed cognitive automations/passports where appropriate; no history rewrite.

## 4. Capability request contract

Canonical contract: `SFI-CAPABILITY-REQUEST-1.0`.

```ts
export interface SfiCapabilityRequest {
  requestId: string;
  trajectoryId: string;
  parentStepId: string | null;
  requestedByCapabilityId: string;
  requestedCapabilityId: string;
  reason: string;
  requiredInputs: string[];
  availableEvidenceRefs: string[];
  requestedOutputs: string[];
  urgency: 'LOW' | 'NORMAL' | 'HIGH' | 'BLOCKING';
  requestedAt: string;
}
```

Disposition:

```text
ADMIT
DENY
DEFER
ALREADY_SATISFIED
HUMAN_AUTHORITY_REQUIRED
EVIDENCE_REQUIRED
```

A model/capability may request; only governed SFI runtime may admit.

## 5. Authority classes

Canonical order:

```text
READ
RECOMMEND
WRITE_INTERNAL
EXECUTE_REVERSIBLE
EXECUTE_EXTERNAL
IRREVERSIBLE
CANON
```

Higher model capability cannot increase authority class.

`EXECUTE_EXTERNAL`, `IRREVERSIBLE`, and `CANON` require explicit governing contracts and may require human confirmation.

## 6. Ephemeral capability grant

Canonical contract: `SFI-CAPABILITY-GRANT-1.0`.

```ts
export interface SfiCapabilityGrant {
  grantId: string;
  principal: string;
  trajectoryId: string;
  stepId: string;
  capabilityId: string;
  resource: string;
  allowedActions: string[];
  authorityCeiling: SfiAuthorityClass;
  issuedAt: string;
  expiresAt: string;
  confirmationRequired: boolean;
  sensitivity: string;
  parentGrantId: string | null;
  nonce: string;
  state: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
}
```

Default TTL target: 5–15 minutes unless a narrower contract requires less.

No browser/client receives service-role credentials.

## 7. Dynamic task graph contract

Canonical node states:

```text
PLANNED
ADMITTED
RUNNING
WAITING_EVIDENCE
WAITING_AUTHORITY
COMPLETED
SKIPPED
FAILED
SUPERSEDED
```

Canonical edge relations:

```text
REQUIRES
SUPPLIES
CONTRADICTS
CALIBRATES
GOVERNS
FALSIFIES
```

Node contract:

```ts
export interface SfiAdaptiveTaskNode {
  nodeId: string;
  trajectoryId: string;
  capabilityId: string;
  state: string;
  reason: string;
  requestedBy: string | null;
  prerequisites: string[];
  inputRefs: string[];
  outputRefs: string[];
  modelExecutionRef: string | null;
}
```

A node may be added adaptively. Existing lineage is never silently deleted.

Loop prevention requires:

- `capabilityRequestHash`;
- trajectory graph cycle detection;
- `maxDepth`;
- maximum invocations/cost/tokens/deadline;
- state-delta check.

Stop invariant:

```text
NO_NEW_INFORMATION
AND NO_NEW_STATE
AND NO_UNRESOLVED_REQUIRED_CAPABILITY
= STOP
```

## 8. Operation-level model requirements

Canonical contract: `SFI-OPERATION-MODEL-REQUIREMENTS-1.0`.

```ts
export interface SfiOperationModelRequirements {
  reasoning: 'LOW' | 'MEDIUM' | 'HIGH' | 'FRONTIER';
  structuredOutput: boolean;
  web: boolean;
  multimodal: boolean;
  computer: boolean;
  code: boolean;
  minContextTokens: number;
  latencyClass: 'INTERACTIVE' | 'NORMAL' | 'BATCH';
  costClass: 'ECONOMY' | 'STANDARD' | 'QUALITY' | 'FRONTIER' | 'PRIVATE_LOCAL' | 'SPECIALIST';
  privacyClass: string;
  providerAllowlist?: string[];
  providerDenylist?: string[];
}
```

Selection is by operation, not by permanent one-agent/one-model binding.

## 9. Canonical public object contract

Canonical contract: `SFI-CANONICAL-OBJECT-1.0`.

Object types:

```text
CONCEPT
METHOD
INSTRUMENT
OBSERVATION
DATASET
REPORT
PAPER
SOFTWARE
RELEASE
RETURN
PUBLICATION
```

Required fields:

```ts
export interface SfiCanonicalObject {
  id: string;
  objectKey: string;
  objectType: string;
  slug: string;
  canonicalUrl: string;
  title: string;
  summary: string;
  bodyRef: string | null;
  epistemicState: string;
  version: string;
  language: string;
  authors: string[];
  methods: string[];
  relatedObjects: string[];
  sourceRefs: string[];
  publicState: 'PRIVATE' | 'REVIEW_REQUIRED' | 'PUBLIC';
  license: string | null;
  createdAt: string;
  updatedAt: string;
}
```

External distribution projects this object; it does not own it.

## 10. Canonical institution identity

```text
name: System Friction Institute
abbreviation: SFI
domain: https://systemfriction.org
entity_id: https://systemfriction.org/#sfi
preferred_handle: systemfriction
secondary_handle: systemfrictioninstitute
avoid_name: Systemic Friction Institute
```

Current digital-facing descriptor:

`Evidence-governed observability and governed AI interaction for complex sociotechnical systems.`

Institution-level descriptor:

`System Friction Institute studies how friction becomes observable, persistent and actionable across complex systems through evidence, governed inference, intervention and RETURN.`

External identity must not use `SFI` alone as the only identifier.

## 11. Discovery Mesh contracts

### External node state

```text
UNCLAIMED
CLAIMED
VERIFIED
DEGRADED
LOST
```

### Representation state

```text
DRAFT
READY
PUBLISHED
FAILED
SUPERSEDED
REMOVED
```

### Required metrics

- UDR — Unbranded Discovery Rate.
- EIC — External Identity Coherence.
- IRD — Independent Reference Density.
- ACR-R — AI retrieval rate.
- ACR-A — correct attribution rate.
- ACR-C — canonical citation rate.
- ECR-NAME / DOMAIN / METHOD / ENTITY — collision rates.
- MPD — Multi-Platform Propagation Depth.
- ERR — Entity Reconstruction Rate.

## 12. Public URL namespaces

Reserved canonical namespaces:

```text
/institution
/concepts/[slug]
/methods/[slug]
/instruments/[slug]
/research/[slug]
/datasets/[slug]
/software/[slug]
/observations/[id]
/predictions/[id]
/returns/[id]
/releases/[id]
/press
/root/discovery
```

Existing canonical routes remain valid. New code must inspect/absorb before creating parallel routes.

## 13. Machine interface boundary

Public MCP discovery server:

```text
org.systemfriction/public
```

Authority: public READ only.

Initial conceptual tool names reserved:

```text
get_institution
search_concepts
get_concept
search_methods
get_method
search_instruments
get_public_evidence
get_public_return
get_public_research
get_epistemic_contract
get_public_capabilities
get_public_world_state
```

Authenticated execution remains on the governed external gateway / authenticated MCP adapter. Public discovery must not expose ROOT or write authority.

## 14. Material audio boundary

Canonical package: `SFI-ACOUSTIC-INSTRUMENT-PACKAGE-1.0`.

```text
samples: WAV 48 kHz / 24-bit
mapping: SFZ
manifest: JSON
optional room IR: WAV
performance interchange: MIDI
SFI controls: JSON
```

SFZ is the neutral canonical mapping format. Other engines are adapters.

`INSTRUMENT BANK` contains assets SFI is authorized to execute.

`CULTURAL REFERENCE BANK` contains observed/reference works and their lawful derived observations.

They must never be silently merged.

Raw source/audio bytes are not a default database persistence format. SFI persists authorized external refs, hashes, metrics, manifests and lineage; temporary render workspaces are ephemeral unless a governing storage contract explicitly says otherwise.

## 15. Shared event taxonomy

Reserved event names:

```text
SFI_CAPABILITY_REQUESTED
SFI_CAPABILITY_ADMITTED
SFI_CAPABILITY_DENIED
SFI_CAPABILITY_DEFERRED
SFI_MODEL_SELECTED
SFI_MODEL_EXECUTION_STARTED
SFI_MODEL_EXECUTION_COMPLETED
SFI_CANONICAL_OBJECT_PUBLISHED
SFI_EXTERNAL_REPRESENTATION_PUBLISHED
SFI_DISCOVERY_OBSERVED
SFI_ENTITY_COLLISION_OBSERVED
SFI_INSTRUMENT_REGISTERED
SFI_AUDIO_RENDER_STARTED
SFI_AUDIO_RENDER_COMPLETED
SFI_AUDIO_CANDIDATE_EVALUATED
```

Existing event names remain canonical owners of existing lifecycle events; these names extend rather than replace them.

## 16. Database ownership map

Potential new owners, subject to preflight against existing schema before migration:

```text
sfi_cognitive_passports        WS-01
sfi_capability_requests        WS-01
sfi_capability_grants          WS-01
sfi_canonical_objects          WS-03
sfi_external_nodes             WS-03
sfi_external_representations   WS-03
sfi_discovery_queries          WS-03
sfi_discovery_query_runs       WS-03
sfi_entity_collisions          WS-03
sfi_instruments                WS-06
sfi_cultural_references        WS-06
sfi_audio_render_runs          WS-06
```

These are candidate table names, not permission to create duplicates. Every migration must prove no existing authoritative table can absorb the function.

`epistemic_events` remains the transversal lineage/event owner where appropriate.

## 17. RLS classes

All new persistence owners require RLS unless a documented infrastructure reason proves otherwise.

Policy classes:

```text
PUBLIC READ
AUTHENTICATED MEMBER READ
ROOT READ
SERVICE WRITE
ROOT GOVERNED WRITE
```

No service credential in browser code.

## 18. Shared CI contract names

Program-level gates to implement/absorb:

```text
SFI-RUNTIME-ADAPTIVE-CAPABILITY-1.0
SFI-CAPABILITY-AUTHORITY-1.0
SFI-MODEL-INDEPENDENCE-1.0
SFI-DOMAIN-NEUTRAL-KERNEL-1.0
SFI-DISCOVERY-INTEGRITY-1.0
SFI-ENTITY-COHERENCE-1.0
SFI-PUBLIC-EPISTEMIC-BOUNDARY-1.0
SFI-PUBLIC-MCP-READONLY-1.0
SFI-DISCOVERY-NO-DUPLICATE-CANON-1.0
SFI-AUDIO-RIGHTS-SEPARATION-1.0
SFI-AUDIO-EPHEMERAL-ASSET-1.0
```

Existing gates, especially canonical preflight, runtime read-plane stability, zero interactive duplication, authority and epistemic boundaries remain mandatory.

## 19. Contract change procedure

A workstream that needs a shared change must provide:

```text
CONTRACT
CURRENT RULE
OBSERVED LIMITATION
PROPOSED DELTA
WHY ABSORB CANNOT SOLVE IT
AFFECTED WORKSTREAMS
MIGRATION IMPACT
AUTHORITY IMPACT
EPISTEMIC IMPACT
BACKWARD COMPATIBILITY
ROLLBACK
```

SFI-00 decides whether the contract lock changes. Until then the workstream must not fork it.
