# SFI INSTITUTIONAL AUTHORITY + ACCOUNT ADMINISTRATION 2026

**Contract:** `SFI-INSTITUTIONAL-AUTHORITY-ACCESS-1.0`  
**Corpus authority:** `SFI-CI-007` / `SFI-CI-008`  
**Status:** PROPOSED IN PR #374  
**Base inspected:** `main` after PR #373 merge

## Purpose

Make institutional roles executable without converting organizational hierarchy into sovereign or cross-user personal access.

## Role boundary

| Role | Institutional operation | Account administration | ROOT sovereign view | CANON | Cross-user PERSONAL |
|---|---|---|---|---|---|
| Founder / ROOT | full | subordinate roles | yes | yes | no by hierarchy |
| Institutional Director | broad | subordinate roles + Domain Directors | no | no | no |
| Domain Director | scoped domain | no by default | no | no | no |
| Operator / Researcher / Steward | assigned scope | no | no | no | no |
| External collaborator / Observer | assigned read scope | no | no | no | no |

## Identity ownership

- Supabase Auth owns credentials and invitation acceptance.
- `profiles` owns the durable institutional mandate projection.
- `sfi_audit_events` owns account-administration lineage.
- The browser never receives service-role credentials.
- Administrators never read or assign a user's final password.

## Founder ceiling

The generic account console may appoint an Institutional Director and subordinate roles. It may not create another `founder_root`, mutate the current Founder account, or treat account administration as a constitutional succession mechanism.

## Institutional Director ceiling

The Director may invite users, assign subordinate roles, and appoint Domain Directors. The Director may not:

- view or mutate Founder account metadata through the directory;
- change its own role or authority;
- create or edit another Institutional Director;
- create ROOT;
- promote CANON;
- grant sovereign actions;
- grant ROOT observation;
- grant cross-user PERSONAL access.

## ROOT / privacy boundary

The current ROOT state aggregates sovereign institutional state with Cognitive Twin and AMV state. Until these readers are partitioned by `PERSONAL` / `INSTITUTIONAL`, ROOT observation remains Founder-only. Director authority is projected through institutional surfaces, not the sovereign ROOT reader.

## External agent boundary

Edwing's human account may hold Institutional Director authority. His external GPT remains `institutional_operator`; human organizational authority is not inherited by an external model or OAuth client.

## Provisioning flow

```text
ADMINISTRATOR SESSION
  -> /institution/access
  -> governed API
  -> authority ceiling check
  -> Supabase Auth invitation
  -> profiles mandate
  -> sfi_audit_events
  -> user accepts invitation
  -> authenticated institutional session
```

## RETURN

After merge/deployment verify:

1. Founder can open `/institution/access`.
2. Institutional Director can open it.
3. Director response contains no Founder account row.
4. Director cannot assign `founder_root` or `institutional_director`.
5. Director cannot edit self.
6. Invitation creates Auth identity, profile mandate, and audit event.
7. Invited institutional profile satisfies `requireSfiMember` without hardcoded membership.
8. Edwing cannot observe ROOT.
9. External OAuth scopes remain unchanged.
10. Personal owner-scoped data remains inaccessible cross-user.
