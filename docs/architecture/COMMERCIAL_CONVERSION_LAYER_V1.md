# Commercial Conversion Layer v1

## Purpose

This layer converts approved institutional analysis into a governed commercial record without reusing `action_proposals` as a sales table.

`action_proposals` remains an internal operational/governance artifact.

`commercial_proposals` is a client-facing commercial artifact with explicit scope, price, validity, versions, and lifecycle.

## Canonical flow

```text
PUBLIC OR FIELD SIGNAL
→ CLIENT FINDER / IFNORM
→ COMMERCIAL CLIENT
→ COMMERCIAL OPPORTUNITY
→ COMMERCIAL PROPOSAL
→ INTERNAL REVIEW
→ APPROVAL
→ HUMAN-RECORDED SEND
→ NEGOTIATION
→ ACCEPT / REJECT / EXPIRE
→ CONVERT
```

No external outreach, email, publication, or document delivery is executed by this module.

## Tables

- `commercial_clients`
- `commercial_opportunities`
- `commercial_proposals`
- `commercial_proposal_versions`
- `commercial_proposal_events`

## ROOT surface

- Page: `/root/commercial`
- API: `/api/root/commercial`
- Existing source agent: `/api/root/agentic/client-finder`

## Governance

Every mutation requires ROOT authentication and produces:

1. the commercial domain record;
2. a `commercial_proposal_events` record;
3. a ROOT audit event and epistemic event through `auditRootAction`.

The `sent` state records a human-confirmed external send. It does not send anything.
