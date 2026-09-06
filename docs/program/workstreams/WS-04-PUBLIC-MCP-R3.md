# WS-04 · R3 PUBLIC MCP READ-ONLY ADAPTER

**Original baseline:** `0b97fdb277eb4af0a537a60837ceb76658199c20`  
**Refresh baseline:** `4c463f9359a3a1f36c8c2e4d7e4a93039a714182`  
**Owner:** SFI-04 · MACHINE INTERFACES  
**Integration authority:** SFI-00 · CONTROL ROOM  
**Self-merge:** FORBIDDEN  
**Server ID:** `org.systemfriction/public`  
**Endpoint:** `/api/mcp/public`  
**Protocol revision:** `2026-07-28`  
**Authority:** `PUBLIC_READ_ONLY`

## Slice

This bounded R3 slice adds a stateless public MCP adapter over existing authoritative public readers. It does not create another application backend, OAuth implementation, canonical object registry, Evidence Capsule contract, event store, persistence owner, model router, Capability Broker, or authority plane.

The branch was refreshed after SFI-00 integrated PR #383. The obsolete disposition `PUBLIC_EVIDENCE_CAPSULE_OWNER_NOT_AVAILABLE_AT_BASELINE` is removed. `get_public_evidence` now consumes the integrated WS-03 owner `SFI-EVIDENCE-CAPSULE-1.0` directly and does not reproduce its publicability or epistemic rules.

## Reused owners

- canonical institution projection: `src/lib/public/institutionProfile.ts`;
- canonical public object/publicability owner: `src/lib/discovery/canonicalObjectRegistry.ts`;
- Evidence Capsule/public semantic owner: `src/lib/discovery/publicSemanticProjection.ts`;
- governed public research projection: `src/lib/research/researchGraphProjection.ts`;
- governed public world-state reader: `src/lib/observatory/public/readGovernedPublicObservatoryState.ts`.

The authenticated external gateway remains unchanged and is not callable through this public adapter.

## Available tools

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
get_public_world_state
```

Canonical search/read tools consume only objects admitted by `SFI-CANONICAL-OBJECT-1.0`. An authoritative valid empty registry is represented as available with zero results; it is not represented as unavailable.

`get_public_evidence` accepts a canonical public-object identifier plus the Evidence Capsule request coordinates required by the WS-03 contract. The MCP adapter first refuses to reveal non-public canonical records, then delegates capsule disposition and construction to `evidenceCapsuleDisposition()` and `evidenceCapsuleForCanonicalObject()`. A WS-03 `BLOCK` is reflected as `BLOCK` with no capsule. The adapter never promotes, repairs, or reclassifies that result.

## Explicitly unavailable tools

```text
get_public_capabilities  UNAVAILABLE · NO_AUTHORITATIVE_PUBLIC_CAPABILITY_PROJECTION
```

Current main still has no authoritative public capability projection. Capability Broker and Cognitive Passport remain internal governed runtime owners and are not substitutes for a public capability contract.

## Resources

```text
sfi://institution
sfi://epistemic-contract
sfi://canonical/objects
sfi://research
sfi://world-state
sfi://mcp/status
```

`sfi://mcp/status` exposes the public server identity, authority ceiling, available tool names, the integrated Evidence Capsule contract identifier, and explicit unavailable-tool reasons without exposing internal runtime topology.

## Epistemic and privacy boundary

- machine output remains an external representation;
- `MODEL OUTPUT != OBSERVATION`;
- `SIMULATION != OBSERVATION`;
- `MISSING != EVIDENCE`;
- `UNAVAILABLE != ZERO`;
- `PRIVATE != PUBLIC`;
- private/review-required canonical objects cannot enter MCP projections;
- Evidence Capsule four-axis publicability, rights, governance, evidence identity, epistemic state and RETURN reality boundary remain owned by WS-03;
- public world state is read through the existing governed publication gate;
- no private Twin, private case, ROOT state, governance internals, or internal capability/passport metadata is exposed.

## Authority and execution boundary

The adapter exports only `POST` for MCP JSON-RPC transport. Its catalog contains no mutation or institutional-action capability. It does not import the authenticated external gateway, OAuth, `externalAuth`, Capability Broker, Cognitive Passport registry, or service-role client.

Unknown or deferred tool names fail closed. The adapter never maps a model/tool name to authority.

## Persistence

`NONE`.

The MCP core remains stateless. This refresh adds no session store, migration, table, RLS policy, evidence store, or event persistence.

## Contract delta

No new cross-workstream contract is created by WS-04.

Consumed upstream contract:

```text
SFI-EVIDENCE-CAPSULE-1.0 · WS-03 · integrated by PR #383
```

`SFI-PUBLIC-MCP-READONLY-1.0` remains the Machine Interfaces gate. `org.systemfriction/public` remains the reserved public server identity.

## QA

Dedicated deterministic gate:

```text
SFI-PUBLIC-MCP-READONLY-1.0
```

Implementation:

```text
scripts/qa-sfi-public-mcp-readonly.ts
.github/workflows/sfi-public-mcp-readonly.yml
```

The gate verifies direct reuse of the WS-03 Evidence Capsule owner, no duplicate owner/contract, non-public/private filtering, owner BLOCK propagation, SIMULATED/DERIVED not becoming observed evidence, MISSING not becoming evidence, authoritative empty result not becoming UNAVAILABLE, header/body routing agreement, public-capability UNAVAILABLE disposition, absence of action-capable tools, absence of ROOT/Twin/private runtime dependencies, no service-role path, no persistence mutations, and reuse of canonical owners.

## Deferred by scope

- authenticated MCP execution;
- external OAuth expansion;
- Official MCP Registry submission;
- ChatGPT/Codex directory listing;
- public capability projection until a dedicated authoritative public owner exists;
- audio MCP.
