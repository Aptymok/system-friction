import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks: Array<{ name: string; ok: boolean }> = [];
const check = (name: string, ok: boolean) => checks.push({ name, ok });

const reconcile = read('src/lib/evidence/reconcileEvidenceGraph.ts');
const canonicalGraph = read('src/lib/graph/canonicalGraph.ts');
const libraryProjection = read('src/lib/graph/libraryCorpusProjection.ts');
const libraryPage = read('src/app/library/page.tsx');
const libraryClient = read('src/app/library/LibraryClient.tsx');
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
const neuralGraphPage = read('src/app/root/neural-graph/page.tsx');
const neuralGraphView = read('src/components/sfi/RootNeuralGraphView.tsx');

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
check('Library reads only the SFI canonical graph profile instead of broad shared/private state', libraryPage.includes("readCanonicalGraphState('sfi')") && libraryPage.includes('graphRelations') && libraryPage.includes("dynamic = 'force-dynamic'"));
check('Library search and cards consume graph relations', libraryClient.includes('graphRelations?:string[]') && libraryClient.includes('...(doc.graphRelations??[])') && libraryClient.includes('RELACIONES'));
check('Library graph remains documentary relation rather than validation claim', libraryProjection.includes('doesNotImplyValidation: true') && libraryProjection.includes("epistemicClass: 'DECLARED'"));
check('Library graph supplies a stable non-empty label when source title is absent', libraryProjection.includes('function documentLabel') && libraryProjection.includes('doc.title?.trim()') && libraryProjection.includes('doc.nodeId?.trim()') && libraryProjection.includes('label: documentLabel(doc)'));
check('ROOT graph reconciliation materializes Library through the existing canonical store', reconcile.includes('buildLibraryCorpusGraphProjection') && reconcile.includes('libraryProjection.nodes') && reconcile.includes('libraryProjection.edges') && reconcile.includes("'library_corpus'"));
check('persisted Library materialization preserves the documentary non-validation boundary', reconcile.includes('doesNotImplyValidation') && reconcile.includes("epistemic_class: 'declared'") && reconcile.includes('library_corpus'));

check('ROOT remains the canonical sovereign operating scene', scenes.includes("root:{key:'root'") && scenes.includes("title:'ROOT · Operación soberana'") && scenes.includes("liveSource:'/api/root/workboard'"));
check('ROOT is regenerated as a thin sovereign projection over existing owners', rootUi.includes('ROOT · SOBERANÍA INSTITUCIONAL') && rootUi.includes('Decide lo soberano. Observa y lee el resto.') && rootUi.includes("jsonFetch('/api/root/interactive?surface=root')") && rootUi.includes("jsonFetch('/api/root/decisions'"));
check('ROOT exposes observation links without inventing a second subsystem map', rootUi.includes("href: '/observatory'") && rootUi.includes("href: '/cases'") && rootUi.includes("href: '/method-lab'") && !rootUi.includes('MAPA OPERATIVO · SUPERFICIES SFI'));
check('ROOT preserves binary terminal decisions while evidence request remains a non-terminal defer', rootUi.includes('ACEPTAR') && rootUi.includes('DENEGAR') && rootUi.includes('SOLICITAR EVIDENCIA') && rootUi.includes('no convierte una fuente en evidencia aceptada') && rootUi.includes('la decisión permanece abierta'));
check('ROOT report archive is observational rather than approvable', rootUi.includes("jsonFetch('/api/root/reports')") && rootUi.includes('no requieren ACCEPT/DENY') && !rootUi.includes('DENEGAR REPORTE'));
check('ROOT report route normalizes every report body before presentation', reportsRoute.includes("humanReportText") && reportsRoute.includes("from '@/lib/reports/humanReport'") && reportsRoute.includes('body: humanReportText(item.body)'));
check('human report normalizer supports headings, lists and markdown tables', humanReport.includes("kind: 'heading'") && humanReport.includes("kind: 'list'") && humanReport.includes("kind: 'table'") && humanReport.includes('normalizeHumanReport'));
check('human report normalizer removes presentational markdown tokens', humanReport.includes('stripInlineMarkdown') && humanReport.includes('replace(/\\*\\*([^*]+)\\*\\*/g') && humanReport.includes('replace(/`([^`]+)`/g'));
check('human report text materializes tables without markdown pipe syntax', humanReport.includes('tableRowText') && humanReport.includes("join(' · ')") && humanReport.includes('humanReportText'));
check('technical JSON remains behind trace disclosure', rootUi.includes('Ver trazabilidad técnica') && rootUi.includes('JSON.stringify(value, null, 2)'));
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
check('canonical graph full-state read reuses one Neon aggregate fallback', canonicalGraphRuntime.includes('readContinuityCanonicalGraphRows') && continuityStore.includes('readContinuityCanonicalGraphRows') && continuityStore.includes('jsonb_agg(row_to_json(n)') && continuityStore.includes('jsonb_agg(row_to_json(e)'));
check('canonical graph marks primary failure when continuity served', canonicalGraphRuntime.includes('primary_graph_read_unavailable_continuity_served') && canonicalGraphRuntime.includes('continuityServed') && canonicalGraphRuntime.includes("readPlane: continuityServed ? 'NEON' : 'SUPABASE'"));
check('ROOT Neural Graph page is founder-gated and performs one canonical graph read', neuralGraphPage.includes("requireFounderPage('/root/neural-graph')") && neuralGraphPage.includes("readCanonicalGraphState('sfi')") && !neuralGraphPage.includes('readRootNeuralGraphRuntime()'));
check('ROOT Neural Graph view renders topology without owning persistence', neuralGraphView.includes('SFI-ROOT-NEURAL-GRAPH-1.0') && neuralGraphView.includes('RELACIÓN ≠ CAUSALIDAD') && neuralGraphView.includes('<svg') && !neuralGraphView.includes("from('graph_nodes')") && !neuralGraphView.includes("from('graph_edges')"));
check('canonical navigation exposes Neural Graph without creating a new scene', shellUi.includes("href:'/root/neural-graph'") && shellUi.includes("label:'NEURAL GRAPH'") && !scenes.includes("key:'neural-graph'"));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} · ${item.name}`);
if (failed.length) {
  console.error(`\nROOT graph/operating-workspace convergence QA failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nROOT graph/operating-workspace convergence QA passed: ${checks.length}/${checks.length}`);