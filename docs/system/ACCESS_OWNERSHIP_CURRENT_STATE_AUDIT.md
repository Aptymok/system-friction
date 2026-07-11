# Access, Ownership and RLS Current-State Audit

Date: 2026-07-11
Branch: `codex/system-access-ownership-foundation`
Base: `main` after PR #96 and PR #97
Scope: ROOT, OBSERVATORY, FIELD, shared authentication, ownership, RLS, storage, publications and audit.

## Executive finding

The repository already contains reusable identity and governance primitives, but it does not yet provide a canonical FIELD ownership model or a publication boundary between ROOT and OBSERVATORY.

Existing reusable structures:

- Supabase SSR authentication through `src/proxy.ts` and `src/runtime/supabase/server.ts`.
- `profiles`, `accounts`, `account_members`, `root_audit_events` and `root_evidence_entries`.
- ROOT route gating in `src/proxy.ts` by profile role or configured root email.
- Public `/observatory` page using a cached server adapter.
- Existing `/field` surface, currently public/static and not an authenticated case system.
- Private Studio storage and authenticated Studio API routes.

Critical gaps:

1. `/root` is gated in middleware, but `src/app/root/page.tsx` reads the complete governance state without a second server-side founder assertion.
2. ROOT founder identity is implemented through several role/email conventions instead of one canonical helper.
3. `/field` is static and public; it does not establish authenticated ownership, cases, consent, evidence isolation or longitudinal records.
4. Existing `accounts/account_members` model represents account membership, not user-owned FIELD cases.
5. Existing RLS-enabled tables do not provide the required FIELD case policies.
6. No canonical `Publication` state machine restricts OBSERVATORY to founder-approved public payloads.
7. `root_audit_events` exists but does not expose a shared typed audit helper or canonical before/after contract.
8. Studio objects lack a proven owner column in the current production schema.
9. `/field` currently links to a ROOT prediction route, crossing the intended access boundary.
10. Public Observatory adapters must be audited to ensure that only snapshots/publications are returned and that no service-role payload reaches the browser.

## Route audit

| Surface | Current state | Authentication | Ownership | Decision |
| --- | --- | --- | --- | --- |
| `/root` | Server page mounts `RootGovernanceConsole` and reads full governance state. | Middleware role/email gate. | Not applicable; founder-only. | Preserve UI; add canonical `requireFounder()` inside server page before data access. |
| `/observatory` | Public cached server page. | Public. | Public data only. | Preserve public access; introduce canonical public-state boundary for future publication reads. |
| `/field` | Static public landing/Mini MOP-H surface. | None. | None. | Preserve as temporary presentation only until FIELD workflow PR; remove cross-boundary ROOT link now and mark authenticated workflow as pending. |
| `/campo` | Must be treated as possible legacy alias. | Unknown until full route inventory. | Unknown. | Choose `/field` as canonical; redirect `/campo` in a later route reconciliation if present. |
| `/studio` | Auth-gated. | Middleware and route checks. | Schema does not prove owner. | Add shared owner-compatible schema only where non-destructive; do not redesign Studio in this PR. |

## Authentication audit

### `src/proxy.ts`

- Creates a Supabase SSR client with request cookies.
- Calls `auth.getUser()` only for ROOT and Studio paths.
- ROOT authorization accepts profile roles `root` or `system`, or `SYSTEM_ROOT_EMAIL` equality.
- Studio authorization accepts ROOT users or `STUDIO_AUTHORIZED_EMAILS`.
- `/field` does not currently require a session.
- Unauthorized ROOT users are redirected to `/field`, which obscures a 403 condition.

Decision:

- Retain middleware as early gate.
- Add canonical server helpers as authoritative enforcement.
- Use an explicit founder ID allowlist (`SFI_FOUNDER_USER_IDS`) with legacy role/email compatibility documented.
- Do not rely on hidden navigation or redirect alone.

### `src/runtime/supabase/server.ts`

- `createServerSupabaseClient()` correctly uses the anon key and cookies.
- `createServiceSupabaseClient()` is server-only and must remain server-only.
- Service-role access must never be imported into client components.

## Database audit

### Existing identity and governance tables

- `profiles`: keyed by `auth.users.id`; roles currently constrained to observer/operator/controller/root/system.
- `accounts`: account identity and metadata.
- `account_members`: account membership and role.
- `root_audit_events`: actor/action/target/payload/ip/user-agent.
- `root_evidence_entries`: founder evidence ledger.

Reuse decisions:

- Reuse `profiles` as the authenticated profile source.
- Reuse `accounts/account_members`; do not create duplicate account systems.
- Preserve `root_audit_events` for legacy ROOT consumers.
- Introduce `sfi_audit_events` as the cross-surface canonical audit event because FIELD and publication auditing require target type/id and before/after values.

### Missing FIELD entities

No compatible user-owned longitudinal case contract was confirmed. Add non-destructive tables:

- `field_profiles`
- `field_cases`
- `field_case_evidence`
- `field_moph_runs`
- `field_mihm_readings`
- `field_hypotheses`
- `field_interventions`
- `field_returns`
- `field_outcomes`
- `field_lessons`

All private FIELD rows must have `owner_id` directly or inherit through a mandatory `case_id`, with RLS using `auth.uid()`.

### Missing publication entities

Add:

- `sfi_publications`

Only sanitized `public_payload` may be read publicly, and only when status is `PUBLISHED`.

## RLS audit

RLS is enabled on several existing governance tables, but enablement alone does not prove complete policies. This PR must add explicit FIELD and publication policies.

Required policy properties:

- User-owned SELECT/INSERT/UPDATE/DELETE.
- Client-provided `owner_id` cannot grant access because policies validate `auth.uid()`.
- Public users cannot read FIELD tables.
- Public users may read only `PUBLISHED` rows from `sfi_publications`.
- Founder access occurs through authorized server routes using a service client after `requireFounder()`.

## Storage audit

Studio already uses a private storage pattern. FIELD requires an explicit private bucket and canonical path:

`field/{owner_id}/{case_id}/{object_id}/{filename}`

This PR may create the private bucket and storage policies, but no public bucket or unrestricted signed URL route.

## Public/private boundary

### ROOT

Private, founder-only, noindex, complete governance visibility after server authorization.

### OBSERVATORY

Public, read-only, snapshot/publication data only. It must not query FIELD cases directly.

### FIELD

Authenticated and private by default. A user may only access their own profile, cases and dependent rows.

## Immediate implementation decisions

1. Create shared system contracts.
2. Create server-only access helpers.
3. Add non-destructive FIELD/publication/audit migration with RLS.
4. Add server-side founder assertion to `/root` before reading governance state.
5. Remove FIELD-to-ROOT navigation crossing the access boundary.
6. Add public Observatory state reader contract without rebuilding Observatory UI.
7. Document required environment and migration application.

## Deferred work

- Complete FIELD UI and account lifecycle.
- MOPH/MIHM execution and hypothesis generation.
- ROOT field oversight modules.
- ROOT publication UI.
- Observatory visual reconstruction.
- Studio ownership backfill and account migration where existing rows have no owner.
- Authenticated A/B browser QA requiring two real Supabase users and applied migrations.
