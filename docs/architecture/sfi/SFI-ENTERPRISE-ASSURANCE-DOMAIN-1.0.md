# SFI Enterprise Assurance Domain 1.0

Status: `OPERATIONAL_BACKEND`

The System Friction Institute (SFI) does not implement Help Desk, Warranty Assurance and Tender Assurance as three independent products. They are service profiles over one tenant-scoped longitudinal domain graph.

```text
TENDER
  ↓
BIDDER / SUPPLIER
  ↓
CONTRACT
  ↓
OBLIGATION
  ↓
ASSET / SERVICE
  ↓
TICKET
  ↓
SLA
  ↓
WARRANTY / WARRANTY EVENT
  ↓
RETURN
  ↓
SUPPLIER PERFORMANCE
  ↓
NEXT TENDER
```

## Mesa de Ayuda / Service Observability

A ticket is persisted as a record and may be related to an asset, service, SLA and supplier. Ticket recurrence can be represented, but ticket count is not treated as problem count and the intake layer does not infer cause.

## Contract & Warranty Assurance

Warranty events remain records. A warranty event does not automatically constitute contractual breach. Contractual or legal conclusions require an epistemic assessment with determinability and evidence lineage.

## Tender Assurance

Requirements are frozen as source-backed records before evaluation. Requirement-by-bidder assessments are institutional analytical objects, not client assertions. PASS/FAIL requires source + page locator + evidence. Missing evidence yields `UNDETERMINED`, not an invented answer. The assessment has no winner-selection authority.

## Enterprise relation graph

Relations are tenant-scoped and never copied automatically into the institutional SFI graph.

Client-declared relations are `RECORD` only. An inferred relation requires evidence references. Internal analytical relations may be `INFERENCE` or `EPISTEMIC_ASSESSMENT`, but never inherit truth, governance, or institutional-memory authority.

## Supplier performance

Supplier performance may aggregate longitudinal operational evidence, but the domain contract deliberately does not define an automatic composite score or automatic future-bidder ranking. Any weighting/ranking policy must be explicit, governed and fit to the procurement context.

## Current boundary

This block provides persistence contracts, normalized domain records, relation APIs, tenant graph reads and internal tender-assessment semantics. It deliberately does not define Observatory screens, charts or dashboard hierarchy.
