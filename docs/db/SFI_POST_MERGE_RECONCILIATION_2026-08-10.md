# SFI Post-merge Reconciliation — 2026-08-10

The live database currently has an intentionally empty derived graph after cleanup. Do not run the legacy whole-table reset.

After this branch is merged and deployed:

1. Open ROOT as a sovereign actor.
2. Verify `EVIDENCIA` reports canonical object count independently from graph `N/E`.
3. Execute `RECONCILIAR GRAFO PERSISTIDO` once.
4. Verify the reconciliation response reports `canonicalEvidenceObjects > 0`, `nodesCreated > 0`, `edgesCreated > 0`, and no unexpected warnings.
5. Refresh ROOT and verify:
   - `EVIDENCIA` remains the canonical object count;
   - `GRAFO` has nodes and relations;
   - duplicate ROOT/ledger representations do not double the object count;
   - source URLs do not appear as graph nodes merely because they are provenance;
   - the Cognitive Twin panel shows Cognitive Twin memory/decisions/runs rather than Predictive Engine hypotheses;
   - placeholder prediction rows such as `x` are absent from the active predictive view.

Do not use `npm run db:reset:sfi` for this transition. The graph is a rebuildable projection; source-of-truth evidence remains preserved.
