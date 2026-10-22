# MEM-003 · Tenant Membership Historical Semantics (P0 Recovery)

Date: 2026-10-22
Status: IMPLEMENTATION CANDIDATE · not deployed · no authority changes authorized
Owner: existing `authorityJournalSupersession` and `continuityRecovery`

## Observable mismatch, not assumed permission drift

SFI_ROOT reports two `sfi_tenant_members` pending UPSERT journal images and a protected authority recovery gate. Independent read-only counts on Supabase and Neon showed exactly two live memberships in each provider. Role/status aggregates matched (one OWNER ACTIVE, one OPERATOR ACTIVE). A cross-provider semantic digest that excludes ONLY `created_at` and `updated_at` also matched. In Neon, both the current membership rows and the historical BEFORE/AFTER journal images agreed on role and status; source operations had zero replay attempts at observation.

These facts justify a *candidate* timestamp-only disposition, not a blanket authority override. Every specific row must still be compared independently by the governed runtime at execution time; prior aggregate digests are only diagnostic evidence.

## Exact invariant for a historical journal image

To classify `PENDING → SUPERSEDED_BY_PRIMARY`, require ALL:

1. One `UPSERT` journal entry with non-null BEFORE and unmodified original journal evidence.
2. Primary key is precisely `(tenant_id,user_id)`; both UUIDs are valid and consistent across journal BEFORE, AFTER, current PRIMARY and current Neon.
3. Exactly one current PRIMARY row fetched directly via the existing Supabase service credential; NO transparent Neon fallback, missing rows or ambiguous matches.
4. Exactly one current Neon row; compare all nonadministrative fields across four representations, including role and status. Only created/updated timestamps may differ.
5. The journal row remains PENDING and the current Neon stable-content hash is unchanged when performing its guarded status transition.
6. No role or membership row changes; no credentials, tenant permissions or scopes mutated. Record remains historical evidence with explicit supersession reason.
7. A later attempt to return to PRIMARY still needs empty protected journal, no conflicts, complete other journal replay and the independent all-table fingerprint gate.

Any mismatch, ambiguous identity, transport failure, unexpected field or role/status transition is grounds to abstain; no self-certified truth from semantic hashes.

## Public and private boundaries

No membership identifiers or journal images are exported to public research packages. The status change is a protected operational reconciliation receipt, not independent peer review, an authority grant, evidence promotion or scientific certificate.

## QA and RETURN

- Exercise the pure predicate against timestamp-only positive and counterexamples: role, status, tenant/user identity, extra field, malformed ID and missing BEFORE.
- Integrate with existing `qa-sfi-data-plane-scheduled-recovery.mjs`; do not introduce a scheduler or change the recovery API.
- Verify final outcome with SFI_ROOT: protected pending reduced, `authorityModified=false`, journal backlog progress, no conflict; then compare every table's fingerprint across Supabase and Neon.
- If any remaining material mismatch appears, remain in RECOVERY and demand authorized manual review. No forced PRIMARY, no direct SQL override.
