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

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} · ${item.name}`);
if (failed.length) {
  console.error(`\nROOT graph/operating-workspace convergence QA failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nROOT graph/operating-workspace convergence QA passed: ${checks.length}/${checks.length}`);