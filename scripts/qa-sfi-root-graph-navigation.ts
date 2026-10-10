import fs from 'node:fs';
import path from 'node:path';
import { projectKnowledgeTimeContrast } from '../src/lib/graph/knowledgeTimeContrast';

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks: Array<{ name: string; ok: boolean }> = [];
const check = (name: string, ok: boolean) => checks.push({ name, ok });

const reconcile = read('src/lib/evidence/reconcileEvidenceGraph.ts');
const canonicalGraph = read('src/lib/graph/canonicalGraph.ts');
const libraryProjection = read('src/lib/graph/libraryCorpusProjection.ts');
const publicationsPage = read('src/app/publications/page.tsx');
const documentaryCatalog = read('src/lib/sfi/library/documentaryCatalog.ts');
const publicationsCatalog = read('src/app/publications/PublicationsCatalog.tsx');
const reader = read('src/lib/root/sovereign/readers/readRootEvidenceGraph.ts');
const amvReader = read('src/lib/root/sovereign/readers/readRootAmv.ts');
const predictionReader = read('src/lib/root/sovereign/readers/readRootPredictions.ts');
const systemReader = read('src/lib/root/sovereign/readers/readRootSystemState.ts');
const readerSupport = read('src/lib/root/sovereign/readers/readerSupport.ts');
const reconcileRoute = read('src/app/api/root/evidence/reconcile/route.ts');
const reportsRoute = read('src/app/api/root/reports/route.ts');
const scenes = read('src/components/sfi/scenes.ts');
const shellUi = read('src/components/sfi/SfiConsole.tsx');
const rootUi = read('src/components/sfi/SfiRootWorkspace.tsx');
const operatingUi = read('src/components/sfi/SfiOperatingWorkspace.tsx');
const governanceUi = read('src/components/sfi/SfiGovernanceWorkspace.tsx');
const interactiveRoute = read('src/app/api/root/interactive/route.ts');
const scenePage = read('src/app/[scene]/page.tsx');
const humanReport = read('src/lib/reports/humanReport.ts');
const neuralGraphRuntime = read('src/lib/root/neuralGraphRuntime.ts');
const continuityStore = read('src/lib/sfi/continuityPostgres.ts');
const canonicalGraphRuntime = read('src/lib/graph/canonicalGraph.ts');
const neuralGraphView = read('src/components/sfi/RootNeuralGraphView.tsx');
const neuralGraphCss = read('src/components/sfi/RootNeuralGraphView.css');
const cognitiveFieldPixi = read('src/components/sfi/RootCognitiveFieldPixi.tsx');

const knowledgeTimeSource=read('src/lib/graph/knowledgeTimeContrast.ts');
check('ROOT Reality Passport presents both dated knowledge perspectives', neuralGraphView.includes('KNEW THEN / KNOWN NOW') && neuralGraphView.includes('KNOWLEDGE RECORDED') && neuralGraphView.includes('WORLD EVENT / EFFECTIVE') && neuralGraphView.includes('RECORD LAST UPDATED') && neuralGraphView.includes('HISTORICAL KNOWLEDGE CUT-OFF'));
check('knowledge projection preserves the non-retroactive boundary', knowledgeTimeSource.includes('LATER_KNOWLEDGE_DOES_NOT_REWRITE_EARLIER_KNOWLEDGE') && knowledgeTimeSource.includes('INSUFFICIENT_TEMPORAL_EVIDENCE'));
const knowledgeNoHistory=projectKnowledgeTimeContrast({
  attributes:{effectiveAt:'2026-01-01T00:00:00Z'}, epistemicState:'INFERRED',
  captureTime:'2026-10-09T00:00:00Z',nodeUpdatedAt:'2026-10-09T09:00:00Z',
  sourceVersion:null,provenance:'test ledger',lineage:[],
});
check('knowledge dates do not backfill from node update or world effective date',
  knowledgeNoHistory.then.knownAt===null && knowledgeNoHistory.now.knownAt===null &&
  knowledgeNoHistory.now.eventAt==='2026-01-01T00:00:00.000Z' &&
  knowledgeNoHistory.comparison==='INSUFFICIENT_TEMPORAL_EVIDENCE');
const knowledgeTemporalEpochs=projectKnowledgeTimeContrast({
  attributes:{},epistemicState:'OBSERVED',captureTime:null,nodeUpdatedAt:null,
  sourceVersion:null,provenance:'test ledger',lineage:[],
  fieldHistory:{epochCount:2,firstObservedAt:'2026-01-01T00:00:00Z',lastObservedAt:'2026-02-01T00:00:00Z',persistedHistory:true,recentEpochs:[
    {eventId:'test-a',occurredAt:'2026-01-01T00:00:00Z',state:'UNKNOWN',previousState:null,censoring:'UNKNOWN'},
    {eventId:'test-b',occurredAt:'2026-02-01T00:00:00Z',state:'OBSERVED',previousState:'UNKNOWN',censoring:'NONE'},
  ]},
});
check('ROOT comparison reads persisted dated epochs without inventing historical claim text',
  knowledgeTemporalEpochs.then.knownAt==='2026-01-01T00:00:00.000Z' &&
  knowledgeTemporalEpochs.then.statement===null &&
  knowledgeTemporalEpochs.now.knownAt==='2026-02-01T00:00:00.000Z' &&
  knowledgeTemporalEpochs.comparison==='CHANGED');

const knowledgeOperationalEpoch=projectKnowledgeTimeContrast({
  attributes:{},epistemicState:'OBSERVED',captureTime:null,nodeUpdatedAt:null,
  sourceVersion:null,provenance:'test ledger',lineage:[],
  fieldHistory:{epochCount:2,firstObservedAt:'2026-01-01T00:00:00Z',lastObservedAt:'2026-02-01T00:00:00Z',persistedHistory:true,recentEpochs:[
    {eventId:'test-operational-a',occurredAt:'2026-01-01T00:00:00Z',state:'ACTIVE',previousState:'OPEN',censoring:'NONE'},
    {eventId:'test-epistemic-b',occurredAt:'2026-02-01T00:00:00Z',state:'OBSERVED',previousState:'ACTIVE',censoring:'NONE'},
  ]},
});
check('operational states cannot masquerade as changed epistemic knowledge', knowledgeOperationalEpoch.then.stateMeaning==='RECORDED_OBJECT_STATE' && knowledgeOperationalEpoch.comparison==='INSUFFICIENT_TEMPORAL_EVIDENCE');

const cognitiveAdmission = read('src/lib/graph/cognitiveGraphAdmission.ts');
const publicGraphStateRoute = read('src/app/api/graph/state/route.ts');
const runtimeBootstrapRoute = read('src/app/api/runtime/bootstrap/route.ts');
const observatoryStateRoute = read('src/app/api/observatory/state/route.ts');

check('legacy graph node storage remains compatible', reconcile.includes("LEGACY_NODE_STORAGE_TYPE = 'INF'") && !reconcile.includes("node_type: 'SRC'") && !reconcile.includes("node_type: 'ATR'"));
check('legacy graph edge storage remains compatible', reconcile.includes("LEGACY_EDGE_STORAGE_TYPE = 'structural_inferred'") && reconcile.includes('relation_type: LEGACY_EDGE_STORAGE_TYPE'));
check('graph edge upsert matches live composite unique key', reconcile.includes("EDGE_CONFLICT = 'source_node_key,target_node_key,relation_type'") && reconcile.includes('{ onConflict: EDGE_CONFLICT }'));
check('multiple semantic relations survive one physical legacy edge', reconcile.includes('declaredRelations') && reconcile.includes('semanticRelationTypes'));
check('evidence graph read has no reconciliation write side effect', !reader.includes('reconcilePersistedEvidenceGraph'));
check('AMV read has no ensure/write side effect', !amvReader.includes('ensureInstitutionalAttractorDeclaration'));
check('prediction read has no attractor reconciliation side effect', !predictionReader.includes('reconcilePredictionAttractors'));
check('system read no longer recomputes MIHM matrix', !systemReader.includes('readRootMihmMatrix'));
check('Supabase reads are abortable', readerSupport.includes('executeAbortableQuery') && readerSupport.includes('DEFAULT_SUPABASE_READ_TIMEOUT_MS'));
check('evidence reader does not require missing graph_nodes.evidence_ids column', !reader.includes("lineage,evidence_ids,payload,attributes") && reader.includes("lineage,payload,attributes"));
check('evidence reader exposes semantic and temporal edge metadata', reader.includes('declaredRelations.join') && reader.includes('relationClass:') && reader.includes('observedAt: dateValue(attributes.observedAt'));
check('explicit graph maintenance is sovereign and audited', reconcileRoute.includes("requireRootActor('evidence.graph.reconcile')") && reconcileRoute.includes("action: 'evidence.graph.reconcile'"));

check('Library corpus projects into canonical graph types without a second graph store', libraryProjection.includes('buildLibraryCorpusGraphProjection') && libraryProjection.includes('CanonicalGraphNode') && libraryProjection.includes('CanonicalGraphEdge') && libraryProjection.includes('sf_docs_frontmatter.json') && !libraryProjection.includes("from('graph_nodes')") && !libraryProjection.includes("from('graph_edges')"));
check('canonical graph reader merges shared Library projection without write side effects', canonicalGraph.includes('buildLibraryCorpusGraphProjection') && canonicalGraph.includes('libraryProjection') && !canonicalGraph.includes('.upsert(') && !canonicalGraph.includes('.insert('));
check('Retired public Library projects its canonical documentary capability through Registry', !fs.existsSync(path.join(root, 'src/app/library/page.tsx')) && publicationsPage.includes('PublicationsCatalog') && publicationsPage.includes('RegistryDiscoveryMesh') && documentaryCatalog.includes("surfaceState: 'PUBLIC_SURFACE_PROJECTED_TO_REGISTRY'") && documentaryCatalog.includes("publicRoute: '/publications'") && documentaryCatalog.includes("readCanonicalGraphState('sfi')") && documentaryCatalog.includes('graphRelations') && documentaryCatalog.includes('library_corpus'));
check('Documentary relations remain bounded while the public Registry preserves non-causal semantics', documentaryCatalog.includes('graphRelations') && documentaryCatalog.includes('graphRelationCount') && publicationsCatalog.includes('RELATIONS') && publicationsCatalog.includes('A link does not assert causality.') && publicationsCatalog.includes("kind:'SEQUENCE'") && publicationsCatalog.includes("kind:'THEME'"));
check('Library graph remains documentary relation rather than validation claim', libraryProjection.includes('doesNotImplyValidation: true') && libraryProjection.includes("epistemicClass: 'DECLARED'"));
check('Library graph supplies a stable non-empty label when source title is absent', libraryProjection.includes('function documentLabel') && libraryProjection.includes('doc.title?.trim()') && libraryProjection.includes('doc.nodeId?.trim()') && libraryProjection.includes('label: documentLabel(doc)'));
check('ROOT graph reconciliation materializes Library through the existing canonical store', reconcile.includes('buildLibraryCorpusGraphProjection') && reconcile.includes('libraryProjection.nodes') && reconcile.includes('libraryProjection.edges') && reconcile.includes("'library_corpus'"));
check('persisted Library materialization preserves the documentary non-validation boundary', reconcile.includes('doesNotImplyValidation') && reconcile.includes("epistemic_class: 'declared'") && reconcile.includes('library_corpus'));

check('ROOT remains the canonical sovereign operating scene', scenes.includes("root:{key:'root'") && scenes.includes("title:'ROOT · Sovereign Operation'") && scenes.includes("liveSource:'/api/root/workboard'"));
check('legacy sovereign workspace no longer composes the ROOT scene', !scenePage.includes('SfiRootWorkspace') && scenePage.includes('RootNeuralGraphView'));
check('ROOT field exposes temporal and reconstructive readings', neuralGraphView.includes("'TRAJECTORY'") && neuralGraphView.includes("'RETROLONGITUDINAL'") && neuralGraphView.includes("'PROJECTION'") && neuralGraphView.includes("'FRICTION_REGIME'") && neuralGraphView.includes("'RETURN_CONTRAST'"));
check('ROOT operational snapshot separates observation, provenance, verification, authority, execution and RETURN', ['OBSERVATION','PROVENANCE','VERIFICATION','AUTHORITY','EXECUTION','RETURN / NEXT OBSERVATION'].every(label=>neuralGraphView.includes(label)) && neuralGraphView.includes('rootOperationalSnapshot'));
check('ROOT environmental dark scrim remains limited to ten percent opacity', neuralGraphCss.includes("rgba(6,6,5,.10)") && neuralGraphCss.includes('Environmental dark scrim is intentionally limited to 10% opacity.'));
check('ROOT preserves binary terminal decisions while evidence request remains a non-terminal defer', rootUi.includes('ACCEPT') && rootUi.includes('DENY') && rootUi.includes('REQUEST EVIDENCE') && rootUi.includes('does not turn a source into admitted evidence') && rootUi.includes('decision remains open'));
check('ROOT report archive is observational rather than approvable', rootUi.includes("jsonFetch('/api/root/reports')") && rootUi.includes('do not require ACCEPT/DENY') && !rootUi.includes('DENY REPORT'));
check('ROOT report route normalizes every report body before presentation', reportsRoute.includes("humanReportText") && reportsRoute.includes("from '@/lib/reports/humanReport'") && reportsRoute.includes('body: humanReportText(item.body)'));
check('human report normalizer supports headings, lists and markdown tables', humanReport.includes("kind: 'heading'") && humanReport.includes("kind: 'list'") && humanReport.includes("kind: 'table'") && humanReport.includes('normalizeHumanReport'));
check('human report normalizer removes presentational markdown tokens', humanReport.includes('stripInlineMarkdown') && humanReport.includes('replace(/\\*\\*([^*]+)\\*\\*/g') && humanReport.includes('replace(/`([^`]+)`/g'));
check('human report text materializes tables without markdown pipe syntax', humanReport.includes('tableRowText') && humanReport.includes("join(' · ')") && humanReport.includes('humanReportText'));
check('technical JSON remains behind trace disclosure', rootUi.includes('View technical trace') && rootUi.includes('JSON.stringify(value, null, 2)'));
check('ROOT operating workspace delegates governance to one canonical workspace', operatingUi.includes('SfiGovernanceWorkspace') && operatingUi.includes("if(surface==='governance')return <SfiGovernanceWorkspace enabled={enabled}/>"));
check('ROOT governance workspace defers governed proposal hydration to the canonical interactive projection', governanceUi.includes("jsonFetch('/api/root/interactive?surface=governance')") && governanceUi.includes('includeTargets=1') && governanceUi.includes('setWorkboard(data.operationalNext?{operationalNext:data.operationalNext}') && interactiveRoute.includes("proposalQueueSource: 'operationalNext.items'") && interactiveRoute.includes('targetHydrationDeferred: true'));
check('ROOT governance workspace exposes live operational telemetry without duplicate base feeds', governanceUi.includes("jsonFetch('/api/root/interactive?surface=governance')") && governanceUi.includes('/api/root/cognitive-runtime/records?agentId=') && governanceUi.includes('workboard?.operationalNext') && governanceUi.includes('latestExecutionAt'));
check('live scene runtime is gated by canonical scene registry', scenePage.includes('SCENE_KEYS.includes') && scenePage.includes('scene={scene as SceneKey}'));
check('deleted sovereign workspace is not required for graph truth', !shellUi.includes('RootObservatoryWorkspace') && !operatingUi.includes('RootObservatoryWorkspace') && !scenePage.includes('RootObservatoryWorkspace'));
check('ROOT graph runtime uses one primary sentinel before Neon fallback', neuralGraphRuntime.includes("let nodeCount = await queryCount('graph_nodes')") && neuralGraphRuntime.includes("if (nodeCount === null && isSfiContinuityConfigured())"));
check('ROOT graph runtime exposes active read plane and diagnostic', neuralGraphRuntime.includes("readPlane: 'SUPABASE' | 'NEON' | 'UNAVAILABLE'") && neuralGraphRuntime.includes('primaryDiagnostic'));
check('Neon ROOT graph fallback is one aggregate continuity query', continuityStore.includes('readContinuityRootNeuralGraphRuntime') && continuityStore.includes('(select count(*)::int from graph_nodes)') && continuityStore.includes('top_attractors') && continuityStore.includes('top_ejectors'));
check('ROOT graph row-read failures remain distinguishable from legitimate empty rows', neuralGraphRuntime.includes("failed: true") && neuralGraphRuntime.includes("attractorRead.failed") && neuralGraphRuntime.includes("ejectorRead.failed"));
check('partial primary graph data keeps Supabase provenance if Neon fallback fails', neuralGraphRuntime.includes("readPlane = 'SUPABASE'") && neuralGraphRuntime.includes("supabase_root_graph_partial_read_unavailable; continuity="));
check('canonical graph full-state read reuses one Neon aggregate fallback', canonicalGraphRuntime.includes('readContinuityCanonicalGraphRows') && continuityStore.includes('readContinuityCanonicalGraphRows') && continuityStore.includes('jsonb_agg('));
check('canonical graph hybrid reads preserve top-level profile without breaking canonical-minimal schema', canonicalGraphRuntime.includes('GRAPH_NODE_HYBRID_READ_FIELDS') && canonicalGraphRuntime.includes('GRAPH_EDGE_HYBRID_READ_FIELDS') && canonicalGraphRuntime.includes('GRAPH_NODE_CANONICAL_READ_FIELDS') && canonicalGraphRuntime.includes('GRAPH_EDGE_CANONICAL_READ_FIELDS') && canonicalGraphRuntime.includes('profile,origin') && canonicalGraphRuntime.includes("error.code === '42703'"));
check('canonical graph retries only bounded compatibility projections for a missing-column schema mismatch', canonicalGraphRuntime.includes('readSupabaseGraphRows') && canonicalGraphRuntime.includes('isMissingGraphColumn') && canonicalGraphRuntime.includes('GRAPH_NODE_CANONICAL_READ_FIELDS') && canonicalGraphRuntime.includes('GRAPH_EDGE_CANONICAL_READ_FIELDS') && !canonicalGraphRuntime.includes('readSupabaseGraphRowsWide'));
check('canonical graph fails closed when bounded compatibility projections cannot serve the schema', canonicalGraphRuntime.includes('SFI_GRAPH_SCHEMA_UNSUPPORTED') && canonicalGraphRuntime.includes('graph_schema_projection_unavailable_without_wildcard_fallback') && !canonicalGraphRuntime.includes("service.from('graph_nodes').select('*')") && !canonicalGraphRuntime.includes("service.from('graph_edges').select('*')"));
check('canonical graph preserves payload-backed metadata when attributes are absent or empty', canonicalGraphRuntime.includes('function attributesFromRow') && canonicalGraphRuntime.includes('Object.keys(attributes).length') && canonicalGraphRuntime.includes('asRecord(row.payload)'));
check('Neon canonical graph read is schema-tolerant, one-round-trip, and keeps profile when present', continuityStore.includes('to_jsonb(n)') && continuityStore.includes('to_jsonb(e)') && continuityStore.includes(" - 'payload'") && continuityStore.includes('jsonb_agg(') && !continuityStore.includes('select *\n              from graph_nodes'));
check('Neon continuity normalizes legacy payload into attributes before trimming duplicate payload', continuityStore.includes("to_jsonb(n)->'attributes'") && continuityStore.includes("to_jsonb(n)->'payload'") && continuityStore.includes("to_jsonb(e)->'attributes'") && continuityStore.includes("to_jsonb(e)->'payload'"));
check('Neon continuity treats JSON null attributes as absent before payload fallback', continuityStore.includes("nullif(to_jsonb(n)->'attributes', 'null'::jsonb)") && continuityStore.includes("nullif(to_jsonb(e)->'attributes', 'null'::jsonb)"));
check('Neon continuity preserves legacy evidence_ids as canonical edge lineage', continuityStore.includes("'lineage'") && continuityStore.includes("to_jsonb(e)->'evidence_ids'") && continuityStore.includes("nullif(nullif(to_jsonb(e)->'lineage', 'null'::jsonb), '[]'::jsonb)"));
check('canonical graph continuity fallback requires explicit caller opt-in', canonicalGraphRuntime.includes('CanonicalGraphReadOptions') && canonicalGraphRuntime.includes('options: CanonicalGraphReadOptions = {}') && canonicalGraphRuntime.includes('options.allowContinuity === true') && canonicalGraphRuntime.includes('primaryDiagnostic && allowContinuity && isSfiContinuityConfigured()'));
check('public graph, retired documentary capability, Publications, and Observatory surfaces cannot opt into continuity', !publicGraphStateRoute.includes('allowContinuity: true') && !documentaryCatalog.includes('allowContinuity: true') && !publicationsPage.includes('allowContinuity: true') && !observatoryStateRoute.includes('allowContinuity: true'));
check('authenticated runtime bootstrap remains primary-only after user authorization', runtimeBootstrapRoute.includes('if (!ctx.user)') && runtimeBootstrapRoute.includes('readCanonicalGraphState(profile)') && !runtimeBootstrapRoute.includes('allowContinuity: true') && runtimeBootstrapRoute.indexOf('if (!ctx.user)') < runtimeBootstrapRoute.indexOf('readCanonicalGraphState(profile)'));
check('canonical graph marks primary failure when continuity served', canonicalGraphRuntime.includes('primary_graph_read_unavailable_continuity_served') && canonicalGraphRuntime.includes('continuityServed') && canonicalGraphRuntime.includes("readPlane: continuityServed ? 'NEON' : 'SUPABASE'"));
check('canonical graph resolves semantic edge relation before physical compatibility type', canonicalGraphRuntime.includes('function semanticRelation') && canonicalGraphRuntime.includes('attributes.declaredRelations') && canonicalGraphRuntime.includes('attributes.declaredRelation') && canonicalGraphRuntime.includes('const relation = semanticRelation(row, attributes)'));
check('canonical graph preserves legacy evidence_ids as lineage on wide-schema fallback', canonicalGraphRuntime.includes('Array.isArray(row.evidence_ids)') && canonicalGraphRuntime.includes('const lineageSource'));
check('ROOT retains founder continuity projection while institutional Neural is independently authenticated', scenePage.includes("await requireFounderPage('/root')") && scenePage.includes("readCanonicalGraphState('sfi', { allowContinuity: true })") && scenePage.includes('projectCognitiveGraph(canonicalGraph)'));
check('ROOT Cognitive Field attributes topology to canonical read plane and keeps edge provenance', scenePage.includes("readPlane: graph.readPlane ?? 'UNAVAILABLE'") && scenePage.includes('provenance: edge.provenance') && scenePage.includes('lineage: edge.lineage'));
check('ROOT Cognitive Field renders Pixi topology without owning persistence', neuralGraphView.includes('SFI-ROOT-NEURAL-GRAPH-1.1') && neuralGraphView.includes('RootCognitiveFieldPixi') && cognitiveFieldPixi.includes("from 'pixi.js'") && !neuralGraphView.includes("from('graph_nodes')") && !neuralGraphView.includes("from('graph_edges')"));
check('ROOT Neural Graph inspector does not silently truncate adjacent relations', !neuralGraphView.includes('.filter((edge) => edge.source === selected.id || edge.target === selected.id).slice(0, 40)'));
check('ROOT Neural Graph inspector does not silently truncate selected-node lineage', !neuralGraphView.includes('selected.lineage.slice(0, 12)'));
check('ROOT Neural Graph timestamp formatting is hydration-deterministic', neuralGraphView.includes("timeZone: 'America/Mexico_City'"));
check('ROOT temporal reading prefers observed sequence, cycle and recurrence coordinates before chronology', neuralGraphView.includes("basis: 'SEQUENCE'") && neuralGraphView.includes("basis: 'CYCLE'") && neuralGraphView.includes("basis: 'RECURRENCE'") && neuralGraphView.includes("basis: 'PHASE'") && neuralGraphView.includes("basis: 'CHRONOLOGY'") && neuralGraphView.includes("['sequence','sequenceIndex','transitionIndex','eventIndex','order']") && neuralGraphView.includes("['cycle','cycleIndex','cycleNumber']") && neuralGraphView.includes("['recurrence','recurrenceIndex','recurrenceCount']"));
check('ROOT contextual HUB exposes temporal basis instead of presenting timestamps as the only time model', neuralGraphView.includes('temporalReading(selected).label') && neuralGraphView.includes('<span>TIME<strong>'));
check('ROOT primary surface omits runtime/read-plane diagnostics', !neuralGraphView.includes('PRIMARY DIAGNOSTIC') && !neuralGraphView.includes('<span>READ PLANE</span>') && !neuralGraphView.includes('<span>RUNTIME</span>'));
check('ROOT itself is the Neural Graph surface without a duplicate neural-graph route or scene', scenePage.includes('RootNeuralGraphView') && !shellUi.includes("href:'/root/neural-graph'") && !scenes.includes("key:'neural-graph'") && !fs.existsSync(path.join(root, 'src/app/root/neural-graph/page.tsx')));

check('ROOT cognitive admission excludes documentary relations regardless of graph materialization', cognitiveAdmission.includes("DOCUMENTARY_RELATION_NOT_COGNITIVE_STATE") && cognitiveAdmission.includes("node.origin === 'library_corpus'") && cognitiveAdmission.includes("projectionKind === 'DOCUMENTARY_RELATION'"));
check('ROOT canonical field preserves graph attributes for Reality Chain reconstruction', scenePage.includes('attributes: node.attributes') && scenePage.includes('attributes: edge.attributes') && scenePage.includes('realityPassportCoverage'));
check('ROOT derives bounded method signals from the canonical graph rather than a parallel store', scenePage.includes('deriveCanonicalFieldMethodSignal') && scenePage.includes('graph.nodes.map') && scenePage.includes('graph.edges') && scenePage.includes('methodSignal: methodSignals.get(node.nodeId)'));
check('ROOT field retains method signals in its canonical node model without permanent inspector chrome', neuralGraphView.includes('methodSignal?:') && !neuralGraphView.includes('FIELD-DERIVED METHOD SIGNAL') && !neuralGraphView.includes('className="neuralGraphInspector"'));
check('ROOT retains expectation discriminator stopping condition and RETURN in canonical field data', neuralGraphView.includes('expectationObserved') && neuralGraphView.includes('discriminatingObservationObserved') && neuralGraphView.includes('stoppingConditionObserved') && neuralGraphView.includes('observedReturn'));
check('ROOT distinguishes contrast readiness from governed learning reorganization', neuralGraphView.includes('contrastRecorded') && neuralGraphView.includes('fieldReorganizationState') && neuralGraphView.includes("'LEARNING_QUARANTINED'") && neuralGraphView.includes("'LEARNING_PROMOTED'"));
check('ROOT learning can deform only reversible CURRENT_STATE and RETURN_CONTRAST readings', neuralGraphView.includes("reading !== 'CURRENT_STATE' && reading !== 'RETURN_CONTRAST'") && neuralGraphView.includes('applyReorganizationReading') && neuralGraphView.includes("reorganization === 'LEARNING_PROMOTED'") && neuralGraphView.includes("? 'memory'") && neuralGraphView.includes("? 'learning'") && neuralGraphView.includes("? 'contrast'"));
check('ROOT learning deformation does not persist or overwrite canonical coordinates/history', neuralGraphView.includes('reversible reading transform only') && neuralGraphView.includes('are not persisted or overwritten by learning projection'));
check('ROOT learning deformation magnitude is evidence-modulated rather than a fixed visual offset', neuralGraphView.includes('reorganizationMagnitude') && neuralGraphView.includes('relationSupportRatio') && neuralGraphView.includes('observedWeightDelta') && !neuralGraphView.includes("return { x: 54 * direction, y: -24 }"));
check('ROOT abstains from evidence-shaped geometry until Method Lab supplies projection authority', neuralGraphView.includes("projectionAuthority === 'METHOD_LAB_REQUIRED'") && neuralGraphView.includes("return { x: 0, y: 0 }") && neuralGraphView.includes("labProjection?.decision !== 'SIMULATED_PROJECTION'"));
check('ROOT resolves Method Lab projection from canonical node declaration before geometry', scenePage.includes('resolveMethodLabFieldProjection') && scenePage.includes('methodLabProtocolId') && scenePage.includes('fieldProjection: fieldProjections.get(node.nodeId)'));
check('ROOT consumes only explicit SIMULATED_PROJECTION and otherwise abstains', neuralGraphView.includes("labProjection?.decision !== 'SIMULATED_PROJECTION'") && neuralGraphView.includes("fieldProjection?:") && neuralGraphView.includes("decision: 'ABSTAIN' | 'SIMULATED_PROJECTION'"));
check('ROOT can derive a Method Lab protocol proposal from observed field needs without requiring manual node classification', scenePage.includes('proposeMethodLabFieldProtocol') && scenePage.includes('fieldProtocolProposals') && neuralGraphView.includes('fieldProtocolProposal?:'));
check('Derived protocol proposal remains epistemically separate from Method Lab simulation output', neuralGraphView.includes("epistemicClass: 'DECLARED' | 'DERIVED'") && neuralGraphView.includes("epistemicClass: 'SIMULATED'"));
check('ROOT reuses canonical MIHM resolution instead of shortcutting PPOI from field flags', scenePage.includes('resolveCanonicalFieldMethodology') && scenePage.includes('fieldMethodResolutions') && scenePage.includes('methodology.resolution.primary?.methodId') && !scenePage.includes("signal.requiresTrajectory || signal.requiresRivalHypothesis ? 'PPOI' : null"));
check('ROOT retains MIHM resolution and Method Lab protocol proposal in the same canonical field object', neuralGraphView.includes('methodResolution?:') && neuralGraphView.includes('fieldProtocolProposal?:'));
check('ROOT preserves subject identity as declared proposed or unknown before MIHM authority', neuralGraphView.includes("subjectBasis: 'DECLARED' | 'PROPOSED' | 'UNKNOWN'"));
check('ROOT does not turn a proposed subject into Method Lab authority', scenePage.includes("methodology.resolution.status === 'READY'") && scenePage.includes("methodology.resolution.primary?.methodId") && !scenePage.includes("subjectProposal"));
check('UNKNOWN is an active resolution state rather than permanent epistemic parking', scenePage.includes('planCanonicalUnknownResolution') && scenePage.includes('unknownResolutionPlans') && neuralGraphView.includes('unknownResolutionPlan?:'));
check('Unknown resolution is cycle and observation bounded rather than forced into calendar timeout', neuralGraphView.includes('stoppingCondition: string') && neuralGraphView.includes('temporalBasis'));
check('ROOT temporal zoom is derived from observed scientific reading rather than record timestamps', scenePage.includes('deriveFieldScientificReading') && neuralGraphView.includes('Temporal resolution') && neuralGraphView.includes('SYSTEM_HISTORY') && cognitiveFieldPixi.includes('zoom') && !neuralGraphView.includes('node.attributes.createdAt'));
check('ROOT retains relational history emergence distributed configuration and capacity without upgrading them to truth', neuralGraphView.includes('relations: { edgeId:string') && neuralGraphView.includes('emergence: { state:string') && neuralGraphView.includes('distributedConfiguration:') && neuralGraphView.includes('capacity: { interventionRef:string'));
check('ROOT retains evidence-bound geometry and observe-before-perturb decision', neuralGraphView.includes('evidenceGeometry:') && neuralGraphView.includes('nextAction:'));
check('CURRENT STATE geometry uses observed canonical relation weights when available and hash only as non-epistemic fallback', neuralGraphView.includes("evidenceGeometry.authority === 'OBSERVED_RELATION_MEASURE'") && neuralGraphView.includes('observedMeanWeight') && neuralGraphView.includes('it carries no epistemic meaning'));

check('Reality Passport reading preserves extended operating stages without redefining the canonical public Reality Chain Method', neuralGraphView.includes("const REALITY_PASSPORT_STAGES = ['world','capture','evidence','friction','transformation','hypothesis','inference','claim','verification','authority','action','return','contrast','learning','unclassified']") && neuralGraphView.includes('realityCoverage') && neuralGraphView.includes('verificationState') && neuralGraphView.includes('observedReturn'));
check('ROOT readings change deterministic projection rather than object identity', neuralGraphView.includes("function buildPositions(nodes: GraphNode[], reading: 'CURRENT_STATE'") && neuralGraphView.includes("reading === 'TRAJECTORY'") && neuralGraphView.includes("reading === 'RETROLONGITUDINAL'") && neuralGraphView.includes("reading === 'PROJECTION'") && neuralGraphView.includes("reading === 'FRICTION_REGIME'") && neuralGraphView.includes("reading === 'REALITY_CHAIN'") && neuralGraphView.includes("reading === 'RETURN_CONTRAST'") && neuralGraphView.includes('buildPositions(graph.nodes, reading)'));

check('ROOT contextual HUB exposes bounded local dynamical attractor while retaining property discovery data', neuralGraphView.includes('<span>LOCAL DYNAMICAL ATTRACTOR<strong>') && neuralGraphView.includes('selected.scientificReading?.attractor.state') && neuralGraphView.includes('propertyDiscovery:'));
check('ROOT retains method competition and next discriminating observation in field data', neuralGraphView.includes('methodCompetition:') && neuralGraphView.includes('nextObservation:string|null'));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} · ${item.name}`);
if (failed.length) {
  console.error(`\nROOT graph/operating-workspace convergence QA failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nROOT graph/operating-workspace convergence QA passed: ${checks.length}/${checks.length}`);
