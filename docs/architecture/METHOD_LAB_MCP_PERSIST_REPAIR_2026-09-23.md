# Method Lab MCP persist repair

## Implementation preflight

- Owner: institutional Method Lab, through the existing external gateway and authenticated MCP projection.
- Existing capability inspected: `/api/external/v1/lab`, `LabRequest`, manifest, authenticated gateway projection/dispatcher, external authorization, research-object reader and event writer.
- Absorb vs create decision: extend those owners; no new route, runtime, scope or database object.
- Authoritative writer: existing Lab `persist` delegates to `appendEpistemicEvent`; deterministic command event identity and fingerprint remain unchanged.
- Persistence/lineage impact: retain source, content, refs, metadata, actor authority and registration time; `report(commandId)` returns the stored receipt. Source conduct time remains metadata, never a backdated event timestamp.
- Front delta: none.
- Back delta: actionable tool errors over MCP, explicit persist input contract, reject object-to-string coercion, exact receipt read.
- DB delta: none.
- Redundancy removed: none created; existing writer and read lookup reused.
- Execution/ROOT boundary: unchanged OAuth user/client binding, tenant and per-operation scope checks, closed operation allowlist, queue and ROOT boundaries. No maintenance shell or arbitrary URL capability. Registration does not run an experiment or promote canon.
- Rollback: revert the code commit; preserve append-only evidence and source history.
- Verification: failing-then-passing dispatcher/route regression tests, existing authenticated-machine and Method Lab QA, canonical architecture audit, domain boundaries, typecheck, build; deploy with the existing canonical-main prebuilt workflow. Exercise and reread the actual source-derived registration only via authenticated MCP.

## Observed diagnosis

An authenticated MCP call with `operation=persist` and no title/content returned HTTP 400 with the canonical body `title_and_content_required`. This proves this rejection reaches the writer's validation, not an OAuth/scope denial. The previous conversation's four exact requests are unavailable; this reproduction alone does not prove those requests had identical causes.

The published `LabRequest` requires only `operation`, despite the writer requiring nonempty title/content for persistence. The MCP tool offers a generic body with no Lab field guidance. The dispatcher propagates canonical HTTP failures as MCP transport failures, hiding the actionable tool result from normal client handling. The writer also coerces objects into strings instead of rejecting invalid content. Finally, report omits a command receipt selector although persistence already supports idempotent command identifiers.

The source PDF is an experimental external method record. Reality Chain registration is retrospective, not preregistration or independent reproduction. RC-REPRO-001 remains PENDING. Tests use synthetic in-memory fixtures only; they do not write institutional evidence.

## Repository validation

22 dispatcher/route tests pass; five added regression cases failed against the original implementation. Authenticated-machine R4C QA, Method Lab convergence, canonical architecture, domain boundaries, typecheck and full production build passed. Existing source-text checks in the build require LF on Windows; formatting-only checkout changes and generated assets are excluded from the repair. A separate code review found no actionable issues and confirmed that build-time OpenAPI projections preserve the corrected requirements. This validates code only; deployment and authenticated MCP persistence/readback require separate observed receipts.
