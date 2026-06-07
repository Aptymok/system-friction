# ROOT Phase 0 Alignment

Scope: diagnostic alignment only. No UI, schema, Supabase, data movement, metric, route, or component behavior was changed.

## Governing Criterion

ROOT is the personal root observatory for Aptymok. It must translate before showing, keep technical terms out of the main experience, and separate Archivo SFI, Observatorio Vivo, Atractor, Sandbox, and Auditoria Tecnica.

This phase closes only the criterion freeze. Later phases must not reinterpret this report as permission to redesign ROOT or advance into state translation, field state reconstruction, node field reconstruction, Visor chat behavior, Twin/AMV behavior, WSV/MIHM translation, attractor/ejector logic, governance, cleanup, or final verification.

## Existing Components Reviewed

| Component or file | Current human function | ROOT section fed | Layer touched today | Future phase |
| --- | --- | --- | --- | --- |
| `RootDashboardClient` | Entry shell for field, right-side panels, Visor and mode switching. | 01 Estado del Campo, 02 Campo de Nodos, 05 Atractor, 06 Twin / AMV, 07 Mutaciones | Mixed: Vivo, Atractor, Archivo, Auditoria | Phase 4, 5, 6, 8 |
| `AcpFieldRegimeView` | Live node field with lenses for topology, degradation, energy, governance, memory and attractors. | 02 Campo de Nodos | Mixed: Vivo, Archivo, Atractor, Auditoria | Phase 5 |
| `AcpAttractorFieldView` | Visual basin for direction, evidence orbit and MIHM-derived values. | 05 Atractor | Mixed: Atractor, Vivo, Sandbox risk if simulated values enter | Phase 10 |
| `AcpFreeNodesView` | Free node observation surface. | 02 Campo de Nodos | Vivo / Archivo depending source | Phase 5 |
| `NodeClusterSurface` | Cluster summary of nodes by semantic group and pressure. | 02 Campo de Nodos | Mixed: Archivo, Vivo, Auditoria | Phase 5 |
| `GlobalMetricsView` | Reads global metrics and Twin/MIHM fallback. | 01 Estado del Campo, 08 WSV, 09 MIHM | Vivo / Auditoria | Phase 4, 9 |
| `AcpProposalConsole` | Shows and advances governed proposals. | 06 Twin / AMV, 07 Mutaciones | Vivo / Auditoria | Phase 8, 11 |
| `RootOperationsConsole` | Reads root tables, records evidence, closes mutations. | 03 Bitacora, 07 Mutaciones, 11 Sandbox/Auditoria depending input | Vivo / Auditoria | Phase 6, 11 |
| `SystemOverridePanel` | Registers override intent and pause requests. | 06 Twin / AMV, governance control | Auditoria / Vivo | Phase 11 |
| `AcpAgentRegistryPanel` | Agent registry panel. | Agent roles | Auditoria / Vivo | Phase 11 |
| `TwinInteractionPanel` | Chat-like Twin interaction surface. | 06 Twin / AMV | Vivo / inference risk | Phase 8 |
| `ArtifactRoutingPanel` | Routes artifacts into Atlas, Cuadernillo and Sobre Negro. | 03 Bitacora, 04 Atlas | Archivo / Vivo | Phase 6, 12 |
| `LiturgiaDiagnosticPanel` | Diagnostic panel. | Auditoria Tecnica | Auditoria Tecnica / Sandbox risk | Phase 11, 12 |
| `VisorMode` | Overlay mode with visible logbook and contextual chat. | 03 Bitacora, Visor | Mixed: Vivo, Archivo, Auditoria | Phase 6, 7 |
| `VisorChat` | Interlocutor UI for visible context and general questions. | Chat del Visor | Vivo / inference / general knowledge | Phase 7 |
| `VisorSidebar` | Index for Visor contexts. | 03 Bitacora / 04 Atlas / 06 Twin / nodes | Archivo / Vivo | Phase 6 |
| `VisorGoldenNode` | Door to Visor. | Visor gateway | No evidence layer; must remain doorway only | Phase 5, 6 |
| `visorHooks` and `visorTypes` | Local context, prompt and fallback behavior for Visor. | Chat del Visor | Mixed: Vivo, Archivo, inference | Phase 7 |
| `src/lib/root/server.ts` | Server root gate, audit, table health and usage observation helpers. | Auditoria Tecnica / root operations | Auditoria Tecnica / Vivo | Phase 11 |
| `src/lib/operational/twinState.ts` | Builds visible Twin state from graph, governance, WSV, MIHM, proposals and catalogs. | Twin / AMV, WSV, MIHM, Atlas | Mixed: Archivo, Vivo, Auditoria | Phase 8, 9, 11 |
| `src/observatory/ai/aiProviderRouter.ts` | Routes AI provider responses. | Chat del Visor | Auditoria / inference | Phase 7 |
| `src/observatory/field/catalog/fieldMatrixBuilder.ts` | Defines catalog item shapes and field access mode. | Atlas / Campo de Nodos / MIHM | Archivo / Vivo | Phase 1, 2, 5 |
| `ThresholdAccess` | Root/login threshold experience. | Access threshold | Auditoria / governance | Phase 11 |
| `RoleGate` | Client/server role gate for root access. | Access threshold | Auditoria Tecnica | Phase 11 |
| `docs/ROOT-OPS-001.md` | Records minimal operational root evidence loop. | Bitacora / Auditoria | Vivo / Auditoria | Phase 11 |

## Technical Language Currently Visible

These terms appear in primary or near-primary ROOT surfaces and require later translation, not Phase 0 correction:

- `SFI / ACP ROOT`, `ACP`, `T-ATTRACTOR CONSOLIDATION`, `VISOR MODE`, `SYSTEM FREEZE`.
- `IHG`, `NTI`, `LDI`, `PHI`, `MIHM`, `Regimen`, `Observed Metrics`.
- `observed`, `verified`, `inferred`, `runtime`, `payload`, `hash`, `source`, `proposalType`, `risk_level`.
- Table names such as `root_evidence_entries`, `graph_nodes`, `root_audit_events`, `usage_ledger`.
- Endpoint-derived or backend-derived words such as `root_required`, `Unauthorized`, `SUPABASE NO CONFIGURADO`.

## Alignment Findings

1. ROOT already has a real operational loop: identity, state, evidence, audit, bitacora and graph anchoring are documented in `docs/ROOT-OPS-001.md`.
2. ROOT currently mixes layers in the same surfaces. For example, the field views combine catalog nodes, recent events, inferred edges, proposal state, MIHM values and attractor visuals.
3. The Visor has the correct direction as an interlocutor with visible memory, but it still presents context as index-constrained and displays technical wording.
4. The golden node exists as Visor entry, but later phases must ensure it is not interpreted as observable node, evidence, pattern or attractor.
5. Some components already warn that approval or closure is not external execution. That aligns with the Constitution and must be preserved.
6. Metrics are read from live sources or fallbacks, but their meaning is not yet translated enough for primary decision use.

## Elements Not Yet Translatable

The following cannot be safely translated in this phase because Phase 3 or later is required:

- Raw statuses: `observed`, `queued`, `proposed`, `design_approved`, `closed`, `degraded`, `missing`, `static`.
- MIHM and WSV readings without explicit object, timestamp and operational implication.
- Attractor strength, RCE, Deuda de Realidad, external validation and circuit-closed risk.
- Node consequences, recommended action, directional weight and degradation cause.
- Visor answers that must separate registered fact, absence of record, inference, general knowledge and new signal.

## Phase 0 Closure

Closed. Criterion is frozen for ROOT Phase 0. No implementation beyond documentation was performed in this phase.
