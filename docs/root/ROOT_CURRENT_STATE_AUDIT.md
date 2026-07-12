# ROOT current-state audit

Audit date: 2026-07-11  
Branch: `codex/root-sovereign-functional-console`  
Scope: active `/root` route, ROOT visual families, ROOT libraries, governance runtime, agents, AMV, prediction registry, ROOT/governance APIs, persistence contracts and security boundaries.

## Executive finding

The active route is a single Gold presentation, but it is not yet a sovereign operational console. It renders a server-built aggregate that combines persisted observations with derived and synthetic representations. The active UI contains dead controls, literal `NULL` states, artificial geographic coordinates, an always-running animation loop, and categorical states represented as progress. A second legacy observatory console and a separate shell family remain in the repository but are not mounted by `/root`.

Two security defects block mounting a replacement console: `GET /api/root/neural-graph/live` has no ROOT gate, and `GET /api/governance/acp-seen` records presence while using a read verb. Several other ROOT routes also bypass the canonical `requireRootActor`/`auditRootAction` convention and require remediation or explicit deprecation.

## Active route and access boundary

- Active route: `src/app/root/page.tsx` with `dynamic = 'force-dynamic'`.
- Mounted read model: `readRootGovernanceState()` from `src/lib/root/gold/rootGovernanceAdapter.ts`.
- Mounted client surface: `RootGovernanceConsole` from `src/components/root/gold/RootGovernanceConsole.tsx`.
- Mounted component tree: `RootGoldHeader`, `RootAgentsRail`, `RootGovernanceField`, `RootProjectionsRail`, `RootLowerGovernanceModules`, `RootGovernanceEnginesBar`, and `RootMobileGovernance`.
- Current page does **not** call `requireFounderPage('/root')`; the repository contains no `requireFounderPage` implementation at audit time.
- `src/app/root/layout.tsx` wraps children in the client-side `RoleGate` for role `root`. That gate verifies `/api/root/me` after hydration and redirects anonymous users to `/login` and non-ROOT users to `/unauthorized`.
- The route segment defines no ROOT-specific metadata. Root application metadata currently permits indexing, so `/root` has no explicit `noindex` contract at audit time.

## Mounted and unmounted ROOT surfaces

### Mounted

Only `src/components/root/gold/**` is mounted by `/root`. The Gold adapter imports persisted and operational sources but normalizes them into a presentation-specific `RootGovernanceState`.

### Present but not mounted by `/root`

- `src/components/root/shell/**`: reusable shell, gauges and operational trigger. No active `/root` import. It contains a parallel visual language with nebula/star decoration, rounded panels and decorative scrolling.
- `src/observatory/components/root/RootDashboardClient.tsx`: legacy aggregate ROOT dashboard; imports `RootOperationsConsole` and `RootLiveGraphPanel` but is not mounted by the active route.
- `src/observatory/components/root/RootOperationsConsole.tsx`: real governance/evidence/mutation UI over ROOT APIs, reachable only through the unmounted legacy dashboard.
- `src/observatory/components/root/RootLiveGraphPanel.tsx`: live graph consumer, reachable only through the unmounted legacy dashboard.
- Other `src/observatory/components/root/**` panels: legacy VISOR, AMV, logbook, ACP, self-observability and diagnostics surfaces. They are not part of the active `/root` tree.
- `src/components/root/scene/**`, `src/components/root/engines/**`, predictions panels and topology models are not mounted by the active page.

This is duplication rather than three active ROOT routes: there is one active route and at least three competing component architectures (Gold, shell/scene, observatory).

## Current data sources

The Gold adapter currently reads or composes:

- `readGovernanceRuntime()` over `epistemic_events`;
- `buildAgenticRootState()` and provider/agent state;
- `buildWorldVectorOperationalState()`;
- `readRootNeuralGraphRuntime()`;
- `readOperationalConsoleState()`;
- `action_proposals`;
- `epistemic_events`;
- `root_audit_events`;
- `sfi_prediction_entries` / `sfi_prediction_verifications` through the current registry path;
- table-health reads for graph/evidence and operational tables;
- `ROOT_FUNCTIONS_CATALOG`, which is a catalog, not an executable tool registry.

The adapter uses service-role Supabase access, per-source `Promise.race` timeouts and a degraded-state fallback. It also uses `select('*')` in its generic row reader and table-health helper, erasing source-specific contracts and pulling payload-heavy rows.

## Persisted tables and permissions

Relevant persisted contracts found in migrations and code:

- Governance and audit: `action_proposals`, `logbook_mutations`, `root_audit_events`, `epistemic_events`, `policy_decisions`, `logbook_regime`.
- ROOT evidence: `root_evidence_entries`.
- Canonical graph: `graph_nodes`, `graph_edges`, `graph_history`.
- SFI evidence graph: `sfi_evidence_ledger`, `sfi_graph_nodes`, `sfi_graph_edges`, `sfi_attractors`, `sfi_ejectors`, `sfi_phenomena`, `sfi_phenomenon_evidence`.
- AMV: `sfi_amv_memory` plus operational memory readers in `src/lib/agents/amvAgent.ts`.
- Legacy predictions: `sfi_prediction_entries`, `sfi_prediction_verifications`.
- World Vector: `world_vector_cycles`, `world_vector_observations`, `world_vector_reports`, `world_vector_alerts`.

RLS is enabled for ROOT audit/evidence, canonical graph and SFI convergence tables. The convergence migration grants authenticated read policies to SFI graph/evidence/AMV tables; ROOT APIs use service-role access behind application gates. The ROOT audit/evidence migration enables RLS without defining broad authenticated policies in that file, so direct client access is not the intended contract.

The requested predictive-engine tables (`sfi_predictive_models`, `sfi_predictive_runs`, `sfi_predictive_evidence_requests`, `sfi_predictive_outcomes`, `sfi_predictive_learning_events`) do not exist in repository code or migrations at audit time. No formula or probability implementation can be inferred safely from the current repository. They must remain `SIN CONTRATO` unless a canonical migration/runtime is added without inventing formulas.

## API inventory

### Canonical reads already gated

- `GET /api/root/governance` -> `requireRootActor('root.governance.read')`; returns the Gold read model.
- `GET /api/root/state` -> `requireRootActor('state.read')`; read-time audit is skipped by suffix policy.
- `GET|HEAD /api/root/me` -> server ROOT identity verification.
- `GET /api/root/agentic-state` -> `requireRootActor('agentic-state.read')`.
- `GET /api/root/founder-state` -> access checked inside the founder read model, but not through the canonical gate helper.

### Canonical mutations already gated and audited

- `POST /api/root/evidence` -> records evidence, epistemic event, graph node/optional edge, mutation and ROOT audit. Duplicate observations are audited.
- `POST /api/root/mutations/:id/close` -> closes `logbook_mutations` and writes ROOT audit.
- `POST /api/root/predictions/approve` -> gated, validates a human probability contract and audits approval.

### Gated mutations missing explicit ROOT audit at route level

- `POST /api/root/agentic/amv` (`search` and `ingest` share one mutation-labelled gate; search should use a read suffix, ingest must audit).
- `POST /api/root/agentic/neural-graph` (query/interpretation, currently no route audit).
- `POST /api/root/agentic/report` (generation/persistence path, currently no route audit).
- `POST /api/root/agentic/client-finder` and `name-scout` (outside the seven-module target, gated but no route audit).

### Unsafe or non-canonical routes

- `GET /api/root/neural-graph/live`: no authentication; exposes graph/logbook/AMV/self-observability/operational state.
- `GET /api/governance/acp-seen`: authenticated user check only, mutates governance presence using GET, does not require ROOT.
- `GET /api/root/self-observability`: ungated and writes a logbook entry during GET.
- `GET|POST /api/root/self-reconstruction/propose`: ungated; GET performs proposal work.
- `POST /api/root/self-reconstruction/patch`: ungated mutation.
- `GET /api/root/operational/trigger-observation`: readiness response is ungated; `POST` delegates to a runner whose internal authorization must not substitute for a route-level canonical gate and audit.

## Observed, derived and synthetic representations

### Observed

- Persisted proposal, mutation, audit, epistemic event, evidence, graph, prediction-registry and World Vector rows when the corresponding source succeeds.
- Governance ACP event and its timestamps.
- Provider availability and agent results when returned by their real readers.

### Derived

- Normalized proposal/agent states, severity, source health and summary counts.
- Graph density, layout and warning prioritization when computed from persisted nodes/edges.
- World Vector and operational state composition.

### Synthetic or misleading in the active Gold surface

- `deterministicParticles()` generates decorative field points and is imported by the active adapter.
- `RootGovernanceFieldRenderer` runs permanent `requestAnimationFrame` loops; play/pause controls animation, not an operational process.
- `domainAnchors` and Gold field curves present a generated topology as if it were system state.
- `MiniWorld` projects `lat`/`lon` coordinates that are not backed by regional metadata.
- Social simulation is marked running from graph availability and uses top-attractor preview coordinates; there is no persisted simulation-run contract.
- Investigation is marked running from World Vector existence and maps confidence to progress.
- Several categorical/nullable values are rendered as percentages or literal `NULL`.
- Radial gauges in the unused shell encourage numeric health presentation even where no measured health exists.

## Dead controls and false affordances

- Gold fullscreen button has no handler.
- `VER ATLAS COMPLETO` and `IR A HERRAMIENTAS` buttons have no handler.
- Gold mobile navigation is rendered as non-interactive spans.
- Gold header navigation words are decorative spans rather than module navigation.
- Gold play/pause controls only synthetic animation and can be mistaken for runtime control.
- The existing shell operational trigger treats HTTP success as success without validating `body.ok`, has no confirmation and does not expose partial agent results.
- `ROOT_FUNCTIONS_CATALOG` is displayed as tools despite not being an executable contract.

## Error and absence semantics

The Gold adapter preserves some source errors and degraded-source names, but its visual contract does not preserve epistemic class per value. Active components render `NULL`, normalize some missing data into counts or states, and can represent source existence as `running`. There is no shared value contract carrying status, source, observed time, confidence, evidence identifiers, explanation and warning.

## Current versus legacy contracts

Current contracts to preserve:

- `/root` as the sole founder console route;
- `requireRootActor` and read-only action suffixes;
- `auditRootAction` for mutations;
- current evidence, mutation close, operational observation, report, AMV, neural graph and prediction-approval endpoints;
- persisted graph/evidence tables and existing World Vector, AMV and prediction-registry services;
- honest degraded states and no synthetic fallback data.

Legacy contracts requiring isolation or migration:

- Gold `RootGovernanceState` and its synthetic visualization math;
- unmounted `RootDashboardClient` aggregate and observatory subpanels;
- generic table-health payloads using `select('*')`;
- legacy SFI manual probability registry, which must remain distinct from any calibrated predictive engine;
- self-observability/self-reconstruction routes that use GET for work or lack ROOT gates;
- shell gauge/catalog presentation where execution handlers do not exist.

## Security remediation order

1. Add server founder-page enforcement and ROOT-specific `noindex`.
2. Gate `/api/root/neural-graph/live` with `requireRootActor('neural-graph.live.read')`.
3. Add read-only `GET /api/governance/acp`; convert ACP presence to authenticated/audited `POST /api/governance/acp-seen`.
4. Gate or deprecate self-observability and self-reconstruction routes; eliminate mutating GET semantics.
5. Put route-level gates and mutation audits on operational sync, AMV ingest and report generation.
6. Keep stack traces and secrets out of responses; preserve status-specific 401/403/4xx/5xx handling.

## Candidate deprecations (do not delete before import verification)

- Active Gold family after the sovereign console compiles: `src/components/root/gold/**` and `src/lib/root/gold/**`.
- Unmounted shell family if no non-ROOT consumer remains: `src/components/root/shell/**`.
- `RootGovernanceFieldRenderer`, `rootGovernanceMath`, `MiniWorld`, `VectorPreview` and Gold mobile fake navigation.
- `RootOperationsConsole.tsx` and `RootLiveGraphPanel.tsx` only after `RootDashboardClient` and all other imports are removed or migrated.
- Unused scene/engine/topology modules only after repository-wide import verification.

No file is approved for deletion solely because it is not mounted by `/root`; cross-route import checks are mandatory.

## Audit conclusion

The replacement should use one server-built, source-preserving sovereign state with bounded readers, one client console, seven deep-linkable modules, a persistent inspector and explicit confirmations for every mutation. The visual layer must consume persisted entities and honest derived layouts only. Missing predictive-engine persistence is a contract gap, not permission to fabricate models, calibration, outcomes or probabilities.
