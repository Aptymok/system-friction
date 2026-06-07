# ROOT Phase 1 Translated Inventory

Scope: translated inventory only. No UI, data, Supabase, migration, endpoint, metric or visual behavior was changed.

## Inventory

| Existing element | Operational name | What it serves | Where it should appear | ROOT section | Layer | Current state | Problem | Decision | Future phase |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RootDashboardClient | ROOT entry shell | Lets Aptymok enter the field, switch lenses, open Twin, proposals, artifacts, agents and root control. | ROOT entry | 01, 02, 05, 06, 07 | Mixed | Active | Mixes live state, archive counts, attractor and technical chips. | Edit later | 4, 5, 6, 8 |
| VisorMode | Visor threshold | Freezes the field and opens a readable observer layer. | Visor overlay | Visor / 03 | Mixed | Active | Bitacora is partial and still says `runtime`. | Edit later | 6, 7 |
| VisorChat | Root interlocutor | Answers from visible memory and general knowledge without executing actions. | Visor overlay | Chat del Visor | Vivo / inference | Active | Needs formal separation of registered fact, inference, general knowledge and new signal. | Edit later | 7 |
| VisorSidebar | Visor index | Orients the visible memory contexts. | Visor overlay | 03, 04, nodes | Archivo / Vivo | Active | Uses technical/context labels and can imply restriction by index. | Edit later | 6 |
| VisorGoldenNode | Visor doorway | Opens the Visor. It must not count as node, evidence or attractor. | Fixed gateway zone | Visor gateway | No evidence layer | Active | Could be mistaken for observable node if placed in the field. | Edit later | 5, 6 |
| RootOperationsConsole | Root operations reader | Reads root operational groups, records evidence and closes mutations administratively. | Root control panel | 03, 07, Auditoria | Vivo / Auditoria | Active | Shows table names and backend groupings. | Edit later | 6, 11 |
| AcpProposalConsole | Decision queue | Shows governed proposals and advances internal proposal state. | Proposals panel | 06, 07 | Vivo / Auditoria | Active | Raw statuses and proposal types appear; accepted/prepared still need stronger execution separation. | Edit later | 8 |
| AcpFieldRegimeView | Live field lens | Shows node field by topology, degradation, energy, governance, memory and attractor direction. | Main field | 02 | Mixed | Active | Archive, live state, inferred links and attractor lens share one visual field. | Edit later | 5 |
| AcpAttractorFieldView | Direction basin | Visualizes directional basin and orbiting evidence/proposals. | Main attractor lens | 05 | Atractor / Vivo | Active | Uses default values and raw metric symbols; needs verified directional weight. | Edit later | 10 |
| GlobalMetricsView | Observed reading summary | Reads global metrics with Twin/MIHM fallback. | Field state summary | 01, 08, 09 | Vivo / Auditoria | Active | Shows numbers before explanation and does not declare MIHM object. | Edit later | 4, 9 |
| NodeClusterSurface | Clustered node map | Groups nodes by semantic-operational cluster. | Campo de Nodos | 02 | Mixed | Active | Cluster pressure is not yet layer separation or action guidance. | Edit later | 5 |
| SystemOverridePanel | Root exception intent | Records override intent or pause request. | Root control panel | Governance | Auditoria / Vivo | Active | Override lacks Phase 11 constitutional constraints in UI. | Edit later | 11 |
| LiturgiaDiagnosticPanel | Diagnostic reader | Displays diagnostic or technical reading. | Technical/audit space | Auditoria Tecnica | Auditoria / Sandbox risk | Active | Must not govern primary ROOT experience. | Isolate later | 11, 12 |
| ThresholdAccess | Access threshold | Resolves entry to root or user space after authentication. | Login/access | Access | Auditoria | Active | Technical login messages leak into experience. | Edit later | 11 |
| RoleGate | Root permission gate | Protects `/root` for root role and server root verification. | Layout/access | Access | Auditoria Tecnica | Active | Displays generic permission verification text. | Edit later | 11 |
| governanceRuntime | Governance runtime | Reads current governance status used by Twin/root state. | Server context | Governance | Auditoria / Vivo | Active elsewhere | Not under `src/lib/root`; should be treated as source, not ROOT UI. | Keep | 11 |
| aiProviderRouter | AI provider route | Chooses AI provider and sets Visor instruction. | Server AI route | Chat del Visor | Auditoria / inference | Active | Needs Phase 7 behavior contract before changing. | Edit later | 7 |
| twinState | Twin visible state builder | Combines graph, WSV, kernel, governance, proposals, MIHM and catalogs. | Server context for Twin/Visor | 06, 08, 09 | Mixed | Active | Central source mixes all five layers before classification exists. | Edit later | 8, 9 |
| fieldMatrixBuilder | Field catalog contract | Defines node, document, pattern, execution and MIHM matrix shapes. | Catalog layer | 02, 04, 09 | Archivo / Vivo | Active | Types contain runtime states but no constitutional layer classification. | Use as input | 2, 5 |
| Ontology / Atlas | Corpus map | Lets ROOT understand what exists in the SFI corpus. | Atlas | 04 | Archivo SFI | Present | Needs separation from live state. | Keep | 6, 12 |
| WorldSpect / WSV | Observed world reading | Reports how the observed world is reading today. | WSV | 08 | Vivo if recent, Sandbox if simulated, Auditoria if log only | Present | Needs timestamp, sources, degraded source and implication. | Edit later | 9 |
| MIHM | Homeostatic reading | Reads object homeostasis only when object is declared. | MIHM | 09 | Vivo / Auditoria | Present | UI can show metrics without object. | Edit later | 9 |
| Archivo SFI | Institutional corpus | Holds catalogs, documents, frontmatter, historical patterns and foundation records. | Atlas / Archive | 04 | Archivo SFI | Present | Can be confused with live state through counts. | Separate | 2, 6, 12 |
| Bitacora | Event memory | Shows what occurred and what it sustains. | Visor / right panel | 03 | Vivo / Auditoria | Partial | Needs accordion entries with cause, layer, node, evidence and open action. | Edit later | 6 |
| Sandbox | Contained tests | Holds tests, simulations and unverified material that must not affect regime. | Sandbox | 11 | Sandbox | Implicit | No central classifier yet. | Create classifier | 2, 12 |
| Auditoria Tecnica | Internal trace | Keeps logs, table health, route state and technical lineage. | Audit-only panels | Audit | Auditoria Tecnica | Present | Some audit terms appear in main surfaces. | Isolate later | 11 |
| Carpeta Negra / Sobre Negro | Containment folder | Holds unresolved or dangerous material without letting it govern. | Artifact routing | 03, 04, 10 | Archivo / Sandbox depending origin | Present | Needs layer and closure criteria. | Edit later | 6, 12 |
| Calendario | Operational deadlines | Should show what is close to expiry, due, or overdue. | Entry state | 01 | Vivo | Not clearly surfaced | Needs Phase 4/10 model. | Add later | 4, 10 |
| Acciones de Realidad | External action chain | Tracks verified acts that modify observable reality. | Entry, Atractor, Twin | 05, 06, 19 | Vivo / Atractor when verified | Partially implicit | Not separated from accepted proposals. | Add later | 8, 10 |
| Conversion de Realidad | Execution ratio | Measures verified actions against accepted decisions. | Entry / Atractor | 01, 05 | Vivo | Not safely available | Do not hardcode. | Add later | 4, 10 |
| Agentes | Role map | Declares what each agent observes, proposes, executes and requires. | Agents panel | Agent roles | Auditoria / Vivo | Present | Needs constitutional role matrix. | Edit later | 11 |

## Phase 1 Closure

Closed. Existing pieces are translated into human function, layer, decision and future phase. No optional `rootOperationalInventory.ts` was created because the requested delivery did not include it and no existing pattern required it for Phase 1.
