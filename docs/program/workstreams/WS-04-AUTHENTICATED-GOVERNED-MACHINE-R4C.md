# WS-04 · R4-C · AUTHENTICATED GOVERNED MACHINE ADAPTER

**Issue:** #400  
**Owner:** SFI-04 · MACHINE INTERFACES  
**Integration authority:** SFI-00 · CONTROL ROOM  
**Base:** `127e2f7c5943bc7a4ad75d37c495b164cc5d1c31`  
**Branch:** `ws04/r4c-authenticated-governed-machine-adapter`  
**Self-merge:** FORBIDDEN

## Duplicate-owner / absorb-vs-create preflight

Decision: **ABSORB > CREATE**.

R4-C does not create a second OAuth server, Capability Broker, Cognitive Passport, Model Broker, router, orchestrator, Adaptive Task Graph, execution runtime, event store, grant table, nonce store, or public semantic owner.

| Concern | Existing owner consumed | R4-C action |
| --- | --- | --- |
| OAuth principal/scope | `src/lib/sfi/externalAuth.ts` + OAuth authorization-code flow | ABSORB; retain verified `client_id` in newly issued access-token claims so machine use can bind subject + client + scope |
| OAuth client registry | `src/lib/sfi/oauthClientRegistry.ts` | ABSORB unchanged |
| Capability request/Broker decision | `src/lib/sfi/cognitive-runtime/capabilityBroker.ts` | ABSORB persisted ADMIT lineage; request remains non-authorization |
| Ephemeral grant | `src/lib/sfi/cognitive-runtime/capabilityGrant.ts` | ABSORB `SFI-CAPABILITY-GRANT-1.0`; ACTIVE/TTL/revocation/replay/passport/parent semantics are revalidated |
| Cognitive Passport | `src/lib/sfi/cognitive-runtime/cognitivePassportRegistry.ts` | ABSORB authority ceiling and RETURN expectation |
| Cognitive execution | `executeManualCognitiveAgent -> runCognitiveAgent -> agentExecutionMap` | ABSORB; adapter exposes no new executor |
| Event/lineage persistence | `epistemic_events` via `eventStore` | ABSORB; authorization reservation, denial and execution receipts use the existing owner |
| Public semantic/MCP read | `SFI-PUBLIC-MCP-READONLY-1.0` | PRESERVE unchanged; authenticated execution is a separate endpoint and cannot be inherited into public read |
| OpenAPI | existing checked-in merge base + build merge pipeline | ABSORB; one WS-04 merge step adds only the authenticated endpoint description |

## Adapter contract

Local WS-04 interface contract:

`SFI-AUTHENTICATED-GOVERNED-MACHINE-ADAPTER-1.0`

Server:

- id: `org.systemfriction/authenticated`
- endpoint: `/api/mcp/authenticated`
- protocol: `2026-07-28`
- OAuth: existing SFI authorization-code/scoped gateway
- `tools/call`: requires `execute`
- static tokens: not accepted by this authenticated execution adapter
- tenant: institutional `sfi`

The adapter currently exposes one bounded executable tool:

`invoke_cognitive_capability`

This tool delegates to the existing canonical manual cognitive execution owner. The current slice does **not** expose material external side effects, queued proposal dispatch, irreversible actions, ROOT mutation, evidence acceptance, canonical promotion, publication authority, or external registry mutation.

This restriction is structural: integrated Cognitive Passports currently bound the relevant grant authority to READ/RECOMMEND. A machine grant cannot be interpreted as `EXECUTE_EXTERNAL`, `IRREVERSIBLE`, or `CANON` authority.

## Authenticated envelope

Every executable call binds:

- OAuth `subject_id` as machine principal;
- verified OAuth `client_id` retained in the signed access token;
- OAuth `execute` scope;
- institutional tenant `sfi`;
- `grantId`;
- grant capability principal (`grant.principal == grant.capabilityId` under the WS-01 grant contract);
- requested capability / execution `agentId`;
- trajectory + step lineage;
- resource;
- allowed action `INVOKE_CAPABILITY`;
- authority ceiling;
- ACTIVE effective state;
- expiry / revocation;
- parent grant when present;
- confirmation policy;
- Cognitive Passport RETURN expectation.

OAuth principal and grant principal are deliberately distinct coordinates. The former identifies the authenticated human principal; the latter remains the canonical capability principal defined by `SFI-CAPABILITY-GRANT-1.0`. WS-04 does not reinterpret the upstream grant field.

## Authorization order

1. verify existing OAuth/scoped gateway credential;
2. require user-bound OAuth plus verified client binding;
3. require the route scope (`execute` for `tools/call`);
4. load the persisted Broker request/admission/grant lineage from the existing event owner;
5. require persisted `ADMIT`, `executionAllowed=true`, `authorizationAllowedAtIssue=true`, and `SFI-CAPABILITY-GRANT-1.0`;
6. revalidate ACTIVE state, TTL and revocation;
7. bind principal/client/scope/capability/resource/action/trajectory/step;
8. revalidate grant authority against requester and requested Cognitive Passports;
9. if a parent exists, require ACTIVE parent and child <= parent across trajectory/resource/actions/authority/expiry/confirmation/sensitivity;
10. reject replay;
11. satisfy confirmation when required;
12. write a deterministic one-time authorization reservation into `epistemic_events`;
13. only after successful reservation call the existing canonical cognitive execution owner;
14. persist the execution receipt and preserve the Passport RETURN expectation without fabricating a RETURN.

## Replay boundary

The authorization reservation uses a deterministic `event_id` derived from the adapter contract + `grantId`. Because the existing event owner owns event identity, concurrent/repeated use cannot create a second successful reservation. A persistence conflict or outage fails closed before execution.

Existing `SFI_AGENT_EXECUTED` / `SFI_AGENT_SKIPPED` grant references and prior machine authorization/execution receipts are also treated as replay evidence.

No raw nonce is required, accepted, persisted, returned, placed in browser state, or passed into execution/model context.

## Receipts and lineage

The adapter reuses `epistemic_events` for:

- `SFI_MACHINE_AUTHORIZATION_DENIED`;
- `SFI_MACHINE_AUTHORIZATION_RESERVED`;
- `SFI_MACHINE_EXECUTION_OBSERVED`.

Receipts contain only bounded authorization coordinates, event references, grant id/public grant fields, authority ceiling and RETURN expectation. They do not contain OAuth bearer tokens, OAuth client secrets, service-role credentials, or raw grant nonce.

`SFI_MACHINE_EXECUTION_OBSERVED` observes that the bounded execution attempt/result occurred. It does not promote model output to observation, evidence, truth, RETURN, learning, or canon.

## Public/private boundary

`/api/mcp/public` and `SFI-PUBLIC-MCP-READONLY-1.0` remain unchanged.

The authenticated adapter is a separate machine surface. No private state becomes public by inheritance. The authenticated machine status resource contains only contract/boundary metadata and no grants, Twin state, Case state, ROOT state, credentials, internal evidence, or private runtime payloads.

## Manifest / OpenAPI / MCP synchronization

Synchronized only inside repository/application surfaces:

- external gateway manifest discovers `/api/mcp/authenticated` and records its authority boundary;
- build-time OpenAPI merge adds `/api/mcp/authenticated` using the already-defined OAuth `execute` scope;
- authenticated MCP tool/resource descriptions are defined by the WS-04 adapter;
- public MCP descriptions/resources are not altered.

No Official MCP Registry, ChatGPT/Codex directory, external app registry, deployment, or publication receipt is claimed. `externalRegistryReceipt = null` and `claimedPublished = false` remain explicit.

## Deltas

### Contract delta

- **CREATE local WS-04 interface:** `SFI-AUTHENTICATED-GOVERNED-MACHINE-ADAPTER-1.0`.
- **No frozen cross-workstream contract mutation.**
- Consumes unchanged `SFI-CAPABILITY-GRANT-1.0`, Cognitive Passport, Capability Broker, existing OAuth gateway, canonical execution and event owners.

### Authority delta

**NONE.**

The adapter can only reduce/intersect authority already granted by OAuth + Broker/grant + Passport. It cannot create, widen, promote, delegate, or infer authority from a model.

### Persistence delta

**NONE.**

No migration/table/RLS/storage owner is added. New receipt event names are records within the existing `epistemic_events` owner.

### Public/private delta

**New authenticated private machine surface; no public authority delta.**

### Execution delta

**New governed ingress only. No new execution plane.**

### Lineage delta

Adds machine authorization reservation/denial/execution receipt event types inside the existing transversal event owner and links them to request/admission/grant/execution lineage.

## QA

Dedicated exact-head gate:

`SFI-AUTHENTICATED-GOVERNED-MACHINE-1.0`

Files:

- `src/lib/mcp/authenticatedGovernedMachineAdapter.test.ts`
- `scripts/qa-sfi-authenticated-governed-machine-r4c.ts`
- `.github/workflows/sfi-authenticated-governed-machine-r4c.yml`

The dedicated workflow checks:

- canonical development preflight;
- OAuth principal/client/scope binding;
- active grant enforcement;
- Passport/Broker/parent authority ceilings;
- expiry/revocation;
- replay and deterministic reservation;
- confirmation;
- public/private separation;
- secret/raw-nonce boundary;
- model independence;
- upstream grant contract regression;
- existing OAuth regression;
- existing public MCP regression;
- OpenAPI materialization;
- typecheck;
- build.

The repository-wide `SFI Verify` workflow remains the integration-level exact-head gate on the PR.

## Invariants preserved

- `DISCOVERY != EXECUTION`
- `PUBLIC READ != AUTHENTICATED EXECUTION`
- `REQUEST != AUTHORIZATION`
- `BROKER ADMIT != EXECUTION AUTHORIZATION`
- `MODEL CAPABILITY != AUTHORITY`
- `GRANT AUTHORITY <= PASSPORT/BROKER CEILING`
- `CHILD GRANT <= PARENT GRANT`
- `EXPIRED/REVOKED GRANT != ACTIVE`
- `PRIVATE STATE NEVER BECOMES PUBLIC BY INHERITANCE`
- `EXTERNAL REPRESENTATION NEVER BECOMES CANON`
- `MISSING remains MISSING`
- `UNAVAILABLE != ZERO`
