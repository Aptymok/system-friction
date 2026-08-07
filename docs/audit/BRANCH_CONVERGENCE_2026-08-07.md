# SFI Branch Convergence · 2026-08-07

Status semantics: this document records repository convergence decisions. It does not claim deployment or production execution.

## Active integration path

- `main` is the only canonical integration target.
- PR #166 was squash-merged into `main` after SFI Verify and MIHM Contract Validation passed.
- `feature/sfi-institutional-final-convergence` / PR #167 is the sole active integration branch during this audit and must end in `main` only after CI passes.

## Closed historical PRs without merge

### #155 · ROOT attention director
Disposition: **FUNCTIONALLY SUPERSEDED / DO NOT MERGE BRANCH**.

Reason: the branch is more than one hundred commits behind current `main`. Its useful architecture was carried into `docs/ROOT_WORLD_CASE_AND_DISCOVERY_ENGINE.md` and the subsequent ROOT topology work. The old component depends on DOM button discovery, a hardcoded surface list and client-side route probes. Re-merging it would reintroduce a parallel navigation/health model. Current ROOT uses server readers, observed agent state, topologies I–III, explicit routes and the Project Execution Manager contract.

### #22 · refresh empty degraded WorldSpect snapshots
Disposition: **SUPERSEDED BY CURRENT WORLDSPECT ADAPTER / OBSERVATION PIPELINE**.

Reason: current runtime no longer depends on the old single refresh behavior as its canonical world loop. The four-daily GitHub workflow runs canonical WorldSpect adapters, World Observatory and the institutional cycle, with persistence and QA. Do not restore a stale compatibility implementation as a second truth path.

### #23 · WorldSpect Supabase import hotfix
Disposition: **SUPERSEDED / FIX PRESENT IN CURRENT TREE**.

Reason: the current code imports Supabase from the runtime layer rather than the removed compatibility path. No historical hotfix merge is required.

### #7 · `SystemFrictionMaster.json`
Disposition: **LEGACY DATA-ARCHITECTURE PROPOSAL / DO NOT REINTRODUCE AS AUTHORITATIVE MASTER**.

Reason: the current institution has canonical documents, database-backed graph/evidence, versioned runtime contracts, MIHM registries and source-specific provenance. Reintroducing one giant static JSON as the authoritative ecosystem would create a second source of truth and conflict with the evidence-before-inference runtime. Historical content should be migrated selectively only when a current canonical contract identifies a missing artifact.

### #4 · Data Liquidity Jekyll pipeline
Disposition: **LEGACY IMPLEMENTATION / CONCEPTS ABSORBED**.

Reason: extraction, normalization, evidence provenance, WorldSpect and MIHM now live in the Next/Supabase institutional runtime. The Jekyll-era extractor and generated data files are not the canonical application path.

### #3 · Fase 2 Jekyll/MIHM panel cleanup
Disposition: **LEGACY IMPLEMENTATION / DO NOT MERGE**.

Reason: the current Next.js UI, canonical MIHM registry, methodology surfaces and runtime state supersede the old Jekyll layouts/assets. Merging those files would create duplicate presentation and metadata systems.

## Convergence rule

A historical branch is not merged merely because its commits are not ancestors of `main`. It is merged only when it contains current, non-duplicated capability that survives the present canonical contracts. Superseded code remains in Git history; its useful architectural decisions are preserved in current docs/runtime rather than copied back as dead parallel implementation.

## Acceptance condition

Repository convergence is complete when:

1. PR #167 passes SFI Verify and MIHM Contract Validation.
2. PR #167 is merged into `main`.
3. no other open PR remains for the repository.
4. current `main` contains the canonical 15-contract manifest, 21-agent convergence, agent passports, Cognitive Twin, continuity runtime, institutional attractor/trajectory, automatic PPOI phenomenon registration, evidence intake and public SFI threshold.
5. deployment and database migration status are reported separately from repository status.
