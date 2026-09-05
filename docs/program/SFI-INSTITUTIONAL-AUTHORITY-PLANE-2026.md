# SFI · INSTITUTIONAL AUTHORITY

**Round:** bounded Institutional Authority Plane  
**Baseline:** `f5fe1d7c715a7ea00508ba20b5dd97f9486ff646`  
**Integration authority:** SFI-00 · CONTROL ROOM  
**Status:** PR-BOUND / NO MERGE BY THIS ROUND

## PRECHECK

Fresh repository and CI evidence was inspected before implementation.

- `main` resolved exactly to `f5fe1d7c715a7ea00508ba20b5dd97f9486ff646`.
- R2-A canonical object plane (#372) and governed capability broker (#373) are integrated.
- R2-B identity coherence (#377) and refreshed Research Graph projection (#375) are integrated.
- R2 convergence dispositions are recorded in `main`; no R2 pull request remains open.
- `SFI Verify` run #2412 on the baseline completed `SUCCESS`.
- `SFI Main-Only Convergence` run #285 on the baseline completed `SUCCESS`.
- repository branch inventory contained only `main` before this bounded branch was created.
- PR #374 is `CLOSED / NOT MERGED`.
- comparing #374 HEAD `47f08308a0bc98ab6eabaabc49f892b1e8e7a98d` with the baseline returns `diverged`; its merge base predates the #374 branch commits. No #374 commit is in the `main` ancestry.
- the earlier sovereign disposition on #374 remains preserved in PR history.
- the later sovereign supersession remains the active disposition: `ARCHIVED — SUPERSEDED FOR AUTHORITY REFACTOR`.

Fresh repository/CI evidence therefore establishes R2 release convergence as complete for purposes of opening this separately bounded post-R2 authority round, notwithstanding the older `CURRENT-STATE.md` narrative snapshot.

## Sovereign boundary consumed by this round

```text
ROLE DEFINITION != PERSON APPOINTMENT
AUTHENTICATION != AUTHORIZATION
ROLE != PERSON
ROLE != APPOINTMENT
PERSON != APPOINTMENT
AUTHORITY CEILING != AUTHORIZATION
APPOINTMENT != SOVEREIGN AUTHORITY
ORGANIZATIONAL HIERARCHY != PERSONAL DATA ACCESS
INSTITUTIONAL DIRECTOR != ROOT
INSTITUTIONAL DIRECTOR != CANON
DOMAIN DIRECTOR != INSTITUTIONAL DIRECTOR
VACANT ROLE != INVALID ROLE
MISSING APPOINTEE != FOUNDER FALLBACK
EXTERNAL GPT != HUMAN APPOINTMENT
ACCOUNT ADMINISTRATION != CONSTITUTIONAL SUCCESSION
```

## Owner

Existing access/authentication owner remains:

```text
src/lib/system/access/institutionalMembers.ts
src/lib/system/access/server.ts
src/runtime/supabase/server.ts
Supabase Auth / auth.users
public.profiles
```

Existing audit owner remains:

```text
public.sfi_audit_events
```

`public.sfi_audit_events` already has RLS enabled, is intended for service/server writes, and exposes authenticated reads only to the matching `actor_id`.

This round creates only the missing logical institutional-authority owner inside the existing access boundary:

```text
src/lib/system/access/institutionalAuthority.ts
src/lib/system/access/institutionalAppointments.ts
```

No second identity store, authentication owner, event store, canonical owner, publication owner or ROOT owner is created.

## Existing capability inspected

- `institutionalMembers.ts` current member bootstrap;
- `server.ts` authentication/profile provisioning, SFI member and Founder gates;
- Supabase Auth as credential identity owner;
- `profiles` coarse technical role constraint and `module_access` metadata;
- `sfi_audit_events` schema and RLS;
- canonical `SfiAuthorityClass` order from the frozen cognitive passport contract;
- PR #374 role/account-admin design and migration strictly as provenance/source material;
- current SFI Verify topology.

## ABSORB vs CREATE

**Decision: ABSORB + CREATE BOUNDED.**

ABSORB:

- Supabase Auth for authentication/identity;
- `profiles` for existing coarse technical profile state;
- `institutionalMembers.ts` for the existing human status assertion currently used by runtime bootstrap;
- `SfiAuthorityClass` for authority ceilings;
- `sfi_audit_events` for later appointment/account-admin audit lineage.

CREATE:

- a pure role-definition owner independent of persons;
- a pure appointment contract/validator/resolver independent of authentication;
- deterministic authority-integrity and appointment-separation gates.

No account administration product surface is created in this slice.

## Role model

The bounded owner defines:

```text
founder_root
institutional_director
domain_director
```

A role definition contains function, scope mode, maximum authority ceiling, appointment policy, account-administration ceiling and forbidden inherited surfaces. It contains no person, principal, account, email, user id or incumbent.

### Founder / ROOT

Founder / ROOT remains constitutional and outside generic appointment/account administration. The role definition preserves the existing ceiling but creates no Founder, replacement Founder, succession path or sovereign mutation API.

### Institutional Director

The role definition exists independently of any person.

Current office state:

```text
role: institutional_director
state: VACANT
incumbentAppointmentId: null
appointmentDisposition: PENDING_SOVEREIGN_APPOINTMENT
```

Maximum role ceiling is `EXECUTE_EXTERNAL`, not `IRREVERSIBLE` or `CANON`. Even lower-authority requests remain forbidden when their target surface is ROOT, ROOT observation, CANON, sovereign actions, PERSONAL cross-user, Founder-private Cognitive Twin, Founder-private AMV, or constitutional succession.

### Domain Director

A Domain Director is structurally mandate-bound to one non-institution-wide domain. Its role ceiling is `EXECUTE_REVERSIBLE`. The definition itself grants nothing.

Current repository status for Edwing Peredo Guadarrama remains exactly the pre-existing assertion:

```text
Director de Dominio — SFI Studio
```

No promotion, Institutional Director appointment, fallback or new durable person record is introduced by this round.

## Appointment model

An appointment is an independent object and requires:

```text
appointmentId
human principal identity
roleId
state
mandateId
domainId
scope
appointment authority ceiling
mandate authority ceiling
appointing authority + authorityRef
effectiveAt
reviewAt
optional expiresAt
resolution provenance
RETURN requirement
```

Lifecycle vocabulary:

```text
VACANT  (office state; no appointment object exists)
PENDING
ACTIVE
SUSPENDED
EXPIRED
REVOKED
```

A real appointment cannot authorize unless it is independently present, valid, HUMAN, ACTIVE, effective, not expired, not review-due, within role ceiling, within appointment ceiling, within mandate ceiling, within domain and within explicit scope.

Institutional Director appointments additionally require `SOVEREIGN_RESOLUTION` provenance and an institutional mandate. Generic account administration cannot create an appointment.

Founder / ROOT cannot be created through this appointment contract.

## Authorization chain

```text
ROLE DEFINITION
→ independent APPOINTMENT
→ ACTIVE/effective/review validation
→ ROLE CEILING
→ APPOINTMENT CEILING
→ MANDATE CEILING
→ DOMAIN/SCOPE
→ protected-surface boundary
→ AUTHORIZED ACTION
```

Any missing or invalid element fails closed.

## RETURN

This round creates no real appointment and therefore no fake RETURN.

The contract requires future appointments to carry a RETURN requirement and review date. The intended observation chain is:

```text
RESOLUTION
→ APPOINTMENT
→ AUTHORIZED ACTIONS
→ OBSERVED ACTIVITY
→ RETURN
→ REVIEW
→ RENEW | AMEND | REVOKE | EXPIRE
```

## Persistence / lineage decision

**DB delta: NONE. Migration: NONE.**

The rejected #374 migration is not restored or reproduced.

Reason:

- Auth already owns identity;
- `profiles` already owns coarse technical profile/access state;
- `sfi_audit_events` already owns account/authority audit lineage;
- current `profiles.module_access` JSON lacks relational integrity sufficient to become authoritative sovereign appointment state without conflating account/profile facts with appointment facts;
- forcing appointments into that JSON would violate `ACCOUNT != APPOINTMENT` and `AUTHENTICATION != AUTHORITY`;
- creating a new appointment table in this same slice would prematurely select a durable sovereign writer/RLS mutation protocol before the first actual appointment resolution exists.

The pure contract is therefore frozen first. A later persistence slice may create or absorb durable appointment storage only after SFI-00 names its authoritative institutional-resolution writer and exact RLS mutation policy.

## RLS impact

NONE in this PR.

Future persistence must remain server/service governed, preserve audit lineage and provide no browser service-role secret. It must not make organizational hierarchy a PERSONAL reader.

## PERSONAL / INSTITUTIONAL boundary

```text
PERSONAL != INSTITUTIONAL != SHARED_LAB
```

The new resolver never consumes existing `workspace`, module flags, authentication success or organization membership as an appointment.

Institutional Director and Domain Director definitions explicitly forbid inherited `PERSONAL_CROSS_USER` authority. ROOT currently aggregates sovereign and Founder-private state; this round does not solve that by granting any Director ROOT access.

The existing legacy member bootstrap still carries broad technical module/root-observe flags for Edwing. Those flags are **not** interpreted as institutional appointment or authority by the new plane. Partitioning the mixed ROOT reader remains a future dependency and must be handled by its owning reader/access slice rather than by authority elevation.

## Account administration boundary

This round does not create `/institution/access`, an invitation endpoint, account mutation API or browser console.

The policy owner explicitly returns false for:

```text
generic account admin → create appointment
generic account admin → alter Founder
generic account admin → constitutional succession
```

Future governed account administration may manage subordinate institutional account identity/state only after an independently valid appointment is resolved. It cannot mint institutional authority by creating an account.

## QA

Deterministic gates added to `SFI Verify`:

```text
SFI-INSTITUTIONAL-AUTHORITY-INTEGRITY-1.0
SFI-INSTITUTIONAL-APPOINTMENT-SEPARATION-1.0
```

They verify:

- role definition without person;
- vacant Institutional Director;
- Edwing remains Domain Director — SFI Studio;
- Edwing is not Institutional Director;
- Domain Director cannot inherit institution-wide authority;
- Institutional Director cannot inherit ROOT / ROOT observation / CANON / sovereignty / PERSONAL cross-user;
- role/account/authentication facts cannot create appointment;
- PENDING/SUSPENDED/EXPIRED/REVOKED cannot authorize;
- effective/expiry/review dates fail closed;
- role, appointment and mandate ceilings are independently enforced;
- generic Founder account administration cannot become constitutional succession;
- external GPT cannot become a HUMAN appointment;
- missing appointment fails closed;
- provenance and RETURN requirements remain explicit;
- future appointment fails closed when required independent resolution fields are absent.

QA fixtures are in-memory contract tests only. They are never persisted, exposed as current institutional state, or treated as real appointments/RETURNs.

## Front delta

NONE.

## Back delta

Two pure authority modules and two deterministic test gates. No existing access caller is silently reclassified.

## Redundancy removed

The architecture does not reuse the #374 coupling where institutional role assignment/profile reconciliation could itself create concrete authority. Role templates no longer materialize persons or appointments.

## Rollback

Revert this PR. No DB, Auth, user, credential, external platform, role appointment, mandate or sovereign compensation is required.

## Contract delta

NONE to the frozen program contract. The round reuses the canonical authority class order and implements the later sovereign #374 supersession as a bounded access-domain owner.

## Authority expansion

NONE.

Role ceilings are maxima for independently valid appointments, not grants. The current Institutional Director office remains vacant; no human principal receives new authority.
