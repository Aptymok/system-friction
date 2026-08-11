# SFI Canonical Evidence QA — Acceptance Criteria

The change is acceptable only if all of the following remain true:

- One shared `evidence_hash` across ROOT and ledger resolves to one canonical evidence object.
- Provenance retains both persistence surfaces without representing them as duplicate evidence nodes.
- Reconciliation never deletes source rows from `root_evidence_entries` or `sfi_evidence_ledger`.
- Reconciliation produces explicit relations for declared module/case context instead of arbitrary evidence-to-evidence same-module links.
- ROOT reports canonical evidence objects separately from graph nodes and graph edges.
- Cognitive Twin UI reads `sfi_cognitive_twin_*` state.
- Predictive legacy placeholders are excluded from active prediction display without deleting forensic history.
- Nodes without relations are not reported as a healthy functional graph.
- ROOT read remains non-mutating; reconciliation remains an explicit sovereign POST action.
