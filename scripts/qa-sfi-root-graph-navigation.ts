import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks: Array<{ name: string; ok: boolean }> = [];
const check = (name: string, ok: boolean) => checks.push({ name, ok });

const reconcile = read('src/lib/evidence/reconcileEvidenceGraph.ts');
const reader = read('src/lib/root/sovereign/readers/readRootEvidenceGraph.ts');
const amvReader = read('src/lib/root/sovereign/readers/readRootAmv.ts');
const predictionReader = read('src/lib/root/sovereign/readers/readRootPredictions.ts');
const systemReader = read('src/lib/root/sovereign/readers/readRootSystemState.ts');
const readerSupport = read('src/lib/root/sovereign/readers/readerSupport.ts');
const reconcileRoute = read('src/app/api/root/evidence/reconcile/route.ts');
const scenes = read('src/components/sfi/scenes.ts');
const shellUi = read('src/components/sfi/SfiConsole.tsx');
const operatingUi = read('src/components/sfi/SfiOperatingWorkspace.tsx');
const governanceUi = read('src/components/sfi/SfiGovernanceWorkspace.tsx');
const interactiveRoute = read('src/app/api/root/interactive/route.ts');
const scenePage = read('src/app/[scene]/page.tsx');

// Graph storage, lineage and read/write boundaries remain backend contracts.
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

// ROOT remains canonical. Governance capabilities are delegated to the canonical
// SfiGovernanceWorkspace rather than duplicated inside SfiOperatingWorkspace.
check('ROOT is a canonical operating scene', scenes.includes("root:{key:'root'") && scenes.includes("title:'Observatorio de Fricción'") && scenes.includes("liveSource:'/api/root/workboard'"));
check('ROOT operating workspace delegates governance to one canonical workspace', operatingUi.includes('SfiGovernanceWorkspace') && operatingUi.includes("if(surface==='governance')return <SfiGovernanceWorkspace enabled={enabled}/>"));
check('ROOT governance workspace reads governed proposals from canonical interactive projection', governanceUi.includes("jsonFetch('/api/root/interactive?surface=governance')") && governanceUi.includes('setProposals(arr(operationalNext.items))') && interactiveRoute.includes("proposalQueueSource: 'operationalNext.items'"));
check('ROOT governance workspace exposes plain-language governed decisions', governanceUi.includes('ACEPTAR') && governanceUi.includes('DENEGAR') && governanceUi.includes('PEDIR EVIDENCIA'));
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
