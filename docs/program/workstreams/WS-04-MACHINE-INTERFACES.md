# WS-04 · MACHINE INTERFACES

**Mission:** expose SFI to autonomous tools and AI clients through a public read-only discovery interface plus governed authenticated execution adapters, without duplicating the existing external gateway or weakening SFI authority.

**Initial baseline:** `565ac410fceb56d86ff9d6eaec85b901d0d77248`  
**Integration authority:** SFI-00  
**Self-merge:** FORBIDDEN

## 1. Existing owners to inspect

Before implementation inspect:

- `/api/external/v1/manifest`;
- `/openapi.json` and merge/build scripts;
- OAuth/scopes/external-client contracts;
- existing observe/propose/lab/studio/cases/execution routes;
- current public `llms` / AI index entry points;
- any existing MCP-related packages/routes/docs;
- current ChatGPT/OpenAI integration artifacts if present.

Do not create a second authenticated agent backend.

## 2. Target architecture

```text
PUBLIC MCP / DISCOVERY
READ PUBLIC ONLY
       │
       └─ canonical public SFI objects

AUTHENTICATED MCP / APP ADAPTER
       │
       └─ existing governed external gateway
             ├─ observe
             ├─ evidence
             ├─ propose
             ├─ lab
             ├─ studio
             ├─ cases
             └─ execute (only where scoped/authorized)
```

`DISCOVERY != EXECUTION`.

## 3. Public MCP contract

Reserved server identity:

`org.systemfriction/public`

Initial tool/resource contract:

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

Rules:

- public READ only;
- no authentication secret required for truly public objects;
- no ROOT;
- no private cases;
- no write/propose/execute;
- no private Twin state;
- output references canonical URLs/IDs;
- machine output remains representation, not new institutional evidence.

## 4. Authenticated adapter

Do not replace OAuth/scopes.

Map authenticated machine tools to existing canonical gateway owners.

Tool capability must be constrained by:

```text
principal
client
scope
resource
authority ceiling
TTL where applicable
confirmation policy
provenance
RETURN expectation
```

A richer model/client never gains broader scopes automatically.

## 5. MCP registry publication

Prepare the public MCP package/metadata for the Official MCP Registry only after:

- server works against real public objects;
- public/read-only gate passes;
- stable canonical identity is present;
- package/version metadata is complete;
- security review passes.

Do not claim registration before an actual registry receipt/entry exists.

## 6. ChatGPT/Codex app/plugin path

Prepare an app/plugin surface backed by MCP/external gateway contracts.

Canonical user-facing name:

`System Friction`

Functional description:

`Observe complex systems, distinguish evidence from inference, construct rival hypotheses, and preserve a governed RETURN path.`

Initial workflows:

```text
Observe a system
Inspect a public SFI method
Evaluate an AI-agent claim
Create a governed evidence plan
Compare prediction with RETURN
Open a Method Lab experiment
```

Do not promise unsupported writes/execution.

Submission to a directory/store is an external state and requires real receipt.

## 7. Hugging Face interface dependency

WS-04 may coordinate with WS-07/WS-03 for:

- public Observatory Space adapter;
- public/synthetic Cognitive Twin demonstrator;
- public datasets.

No private Twin or internal case data.

## 8. Postman/API discovery

When API surface stabilizes, prepare real public documentation/examples for:

```text
manifest
public read
observe
propose
OAuth/scopes
errors
epistemic contract
examples
```

Examples must be executable or clearly marked schema examples; never fabricated as successful live responses.

## 9. SDK boundary

Only create npm/Python SDK packages when a stable API warrants them.

SDKs must remain thin adapters around OpenAPI/gateway contracts rather than duplicate governance logic.

Potential names are not considered owned until registry availability/ownership is confirmed.

## 10. Dependencies

Consumes:

- WS-03 canonical object public read contract;
- WS-01 capability/passport authority contract for adaptive authenticated execution;
- existing external OAuth/gateway.

Public MCP implementation can start once canonical object contract is stable even before all discovery objects exist.

Authenticated adaptive capability exposure must wait until WS-01 contracts are stable.

## 11. Forbidden outcomes

- public MCP with write authority;
- second OAuth implementation;
- second OpenAPI authority source;
- unscoped execution;
- client/model-selected authority expansion;
- fake registry/plugin listing;
- private state in public resources;
- machine surface with stale institution naming;
- provider-specific business logic embedded in the SFI core.

## 12. QA gates

Required:

```text
SFI-PUBLIC-MCP-READONLY-1.0
SFI-PUBLIC-EPISTEMIC-BOUNDARY-1.0
```

Retain external OAuth and API hardening gates.

Tests must prove:

1. public server cannot invoke write/ROOT routes;
2. public outputs only include public canonical objects;
3. authenticated operations enforce current scopes;
4. denied scope remains denied even when requested by a high-capability model;
5. manifest/OpenAPI/MCP capability descriptions remain synchronized;
6. private Twin/case material cannot leak through public MCP;
7. external directory state is not fabricated.

## 13. Definition of done

WS-04 is complete when SFI has a working public read-only MCP interface over canonical public objects, an authenticated MCP/app adapter over existing scoped gateway capabilities, synchronized manifests/docs, and publish-ready artifacts for appropriate directories without misrepresenting external registration state.

## 14. Handoff

```text
BASE SHA
BRANCH
PUBLIC MCP VERSION
AUTHENTICATED ADAPTER STATE
TOOLS/RESOURCES
OPENAPI/MANIFEST CHANGES
EXTERNAL SUBMISSION STATE
QA
KNOWN DEFECTS
DEPENDENCIES
PR
NEXT SAFE ACTION
```

---

# COPY-PASTE DISPATCH PROMPT

You are **SFI-04 · MACHINE INTERFACES**.

Start from fresh `Aptymok/system-friction`. Read the program control-plane files and `docs/program/workstreams/WS-04-MACHINE-INTERFACES.md`. Inspect the existing external manifest, OpenAPI, OAuth/scopes and all existing external routes before adding anything.

Implement a real public READ-ONLY MCP interface over canonical public SFI objects and a governed authenticated adapter over the existing external gateway. Prepare synchronized machine manifests and real app/plugin/registry artifacts without claiming external listing until a receipt exists. Preserve `DISCOVERY != EXECUTION`, public/private separation and all current scope/authority boundaries.

Coordinate dependencies through SFI-00 with WS-03 and WS-01. No duplicate OAuth/backend, no mocks, no fabricated registry success. You may branch/commit/open PRs but not merge. Execute all required QA/typecheck/build and record durable handoff state.

Proceed from actual repository state now.
