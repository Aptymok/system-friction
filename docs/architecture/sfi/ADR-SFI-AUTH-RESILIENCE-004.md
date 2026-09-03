# ADR-SFI-AUTH-RESILIENCE-004 — Session resilience and truthful data surfaces

**Status:** ACCEPTED FOR IMPLEMENTATION  
**Version:** 1.0  
**Date:** 2026-09-03

## Context

Production observation showed a failure mode in which transient Supabase Auth or database timeouts were translated into `Unauthorized`, while the underlying SFI data and universal-cycle runtime remained present. The same incident also exposed two amplification paths: repeated `/auth/v1/user` verification from concurrent server reads, and profile provisioning after an indeterminate profile read.

The public live FIELD/Observatory was additionally routed through browser-session middleware even though its read models are explicitly public, service-backed projections of persisted SFI observations.

## Decision

1. A missing or invalid session and an unavailable authentication service are different states.
   - Missing/invalid session → `401 AUTH_REQUIRED`.
   - Auth verification unavailable → `503 AUTH_UNAVAILABLE` / degraded state.
   - A transient transport/database failure must never be represented as proof that the user is unauthorized.
2. Server authorization verifies the session JWT before using the persisted session user. Remote `/auth/v1/user` is a bounded compatibility fallback, not the default read path for every API request.
3. Profile provisioning may occur only after a successful profile read proves absence. A failed or timed-out profile read is indeterminate and may not trigger an insert.
4. Institutional profile reconciliation is change-driven. Read requests do not rewrite `profiles` merely to prove that the user exists.
5. `/field` is the public live Observatory and does not require a browser session. ROOT and Studio retain their governed authentication/authorization boundaries.
6. Public or internal surfaces must render persisted data as persisted. An unavailable read is a degraded/unavailable state, not a synthetic zero and not an inferred absence.
7. Display names and institutional titles are presentation metadata only. They do not grant ROOT, governance, execution, publication or canonical-promotion authority.

## Constitutional compatibility

This ADR extends `ADR-SFI-ARCHITECTURE-001` and `ADR-SFI-DURABLE-UNIVERSAL-CYCLE-002` without adding a second identity store, event store, execution writer, Case system or epistemic authority. Existing Supabase Auth, `profiles`, institutional membership registry, service-backed read models and ROOT gates remain the owners of their respective responsibilities.

## Operational identities

The institutional presentation layer currently declares:

- **Juan Antonio Marín Liera** — `Founder — System Friction Institute`.
- **Edwing Peredo Guadarrama** — `Director de Dominio — SFI Studio`.

These labels are non-authoritative UI metadata. Existing role, membership, tenant, module and ROOT checks remain independently enforced.

## Failure semantics

- If Auth is unavailable, protected APIs return a retryable degraded response and preserve the session cookies.
- If a profile read is unavailable, SFI does not fabricate absence or attempt duplicate provisioning.
- If a public Observatory read fails, the presentation layer must preserve the difference between `0` and `unavailable`.
- No authentication or display-label failure changes universal-cycle identity, RETURN, CONTRAST, closure or learning state.

## Acceptance criteria

- `/field` can be opened without an authenticated browser session.
- A transient Auth failure is not returned as `401 Unauthorized`.
- Concurrent internal reads do not require one `/auth/v1/user` request each under the normal verified-session path.
- A profile-read timeout cannot create a duplicate `profiles` insert attempt.
- ROOT and Studio access remain governed by their existing authorization gates.
- The two institutional display identities render from persisted/profile metadata without changing authority.
- Existing persisted Observatory, Case and universal-cycle data remain the source of truth.
