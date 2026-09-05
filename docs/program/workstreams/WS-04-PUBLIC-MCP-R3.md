# WS-04 · R3 PUBLIC MCP READ-ONLY ADAPTER

**Baseline:** `0b97fdb277eb4af0a537a60837ceb76658199c20`  
**Owner:** SFI-04 · MACHINE INTERFACES  
**Integration authority:** SFI-00 · CONTROL ROOM  
**Self-merge:** FORBIDDEN  
**Server ID:** `org.systemfriction/public`  
**Endpoint:** `/api/mcp/public`  
**Protocol revision:** `2026-07-28`  
**Authority:** `PUBLIC_READ_ONLY`

## Slice

This bounded R3 slice adds a stateless public MCP adapter over existing authoritative public readers. It does not create another application backend, OAuth implementation, canonical object registry, event store, persistence owner, model router, Capability Broker, or authority plane.

## Reused owners

- canonical institution projection: `src/lib/public/institutionProfile.ts`;
- canonical public object/publicability owner: `src/lib/discovery/canonicalObjectRegistry.ts`;
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
get_public_return
get_public_research
get_epistemic_contract
get_public_world_state
```

Canonical search/read tools consume only objects admitted by `SFI-CANONICAL-OBJECT-1.0`. An authoritative valid empty registry is represented as available with zero results; it is not represented as unavailable.

## Explicitly unavailable tools

```text
get_public_evidence      UNAVAILABLE · PUBLIC_EVIDENCE_CAPSULE_OWNER_NOT_AVAILABLE_AT_BASELINE
get_public_capabilities  UNAVAILABLE · NO_AUTHORITATIVE_PUBLIC_CAPABILITY_PROJECTION
```

The first is deferred rather than relabeling an observation as accepted evidence. The second is deferred because the current Capability Broker and Cognitive Passport registry are internal governed runtime owners, not a public capability projection.

## Resources

```text
sfi://institution
sfi://epistemic-contract
sfi://canonical/objects
sfi://research
sfi://world-state
sfi://mcp/status
```

`sfi://mcp/status` exposes the public server identity, authority ceiling, available tool names, and explicit unavailable-tool reasons without exposing internal runtime topology.

## Epistemic and privacy boundary

- machine output remains an external representation;
- `MODEL OUTPUT != OBSERVATION`;
- `SIMULATION != OBSERVATION`;
- `MISSING` remains explicit;
- `UNAVAILABLE != ZERO`;
- private/review-required canonical objects cannot enter MCP projections;
- public world state is read through the existing governed publication gate;
- no private Twin, private case, ROOT state, governance internals, or internal capability/passport metadata is exposed.

## Authority and execution boundary

The adapter exports only `POST` for MCP JSON-RPC transport. Its catalog contains no mutation or institutional-action capability. It does not import the external authenticated gateway, OAuth, `externalAuth`, Capability Broker, Cognitive Passport registry, or service-role client.

Unknown or deferred tool names fail closed. The adapter never maps a model/tool name to authority.

## Persistence

`NONE`.

The modern MCP core is stateless and this slice requires no session store, migration, table, RLS policy, or new event persistence.

## Contract delta

`NONE` to frozen cross-workstream contracts.

This slice instantiates the already-reserved `org.systemfriction/public` server identity and the already-reserved gate name `SFI-PUBLIC-MCP-READONLY-1.0`.

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

The gate verifies public-only catalog metadata, private-object filtering, explicit MISSING preservation, UNAVAILABLE-not-zero behavior, header/body routing agreement, deferred-tool fail-closed behavior, absence of action-capable tool names, absence of ROOT/Twin/private runtime dependencies, no service-role path, no persistence mutations, and reuse of canonical owners.

## Deferred by scope

- authenticated MCP execution;
- external OAuth expansion;
- Official MCP Registry submission;
- ChatGPT/Codex directory listing;
- Evidence Capsule exposure until an authoritative public owner exists;
- public capability projection until a dedicated public contract exists;
- audio MCP.
