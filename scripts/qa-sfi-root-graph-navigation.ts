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
const workspace = read('src/components/root/sovereign/RootObservatoryWorkspace.tsx');
const outcomeTree = read('src/components/root/sovereign/visual/PredictionOutcomeTree.tsx');
const attractorField = read('src/components/root/sovereign/visual/DynamicAttractorField.tsx');
const consoleSource = read('src/components/root/sovereign/RootSovereignConsole.tsx');
const methodology = read('src/components/root/sovereign/RootMethodologyWorkbench.tsx');
const friccionauta = read('src/components/root/friccionauta/FriccionautaConsole.tsx');
const reconcileRoute = read('src/app/api/root/evidence/reconcile/route.ts');

check('legacy graph node storage remains compatible', reconcile.includes("LEGACY_NODE_STORAGE_TYPE = 'INF'") && !reconcile.includes("node_type: 'SRC'") && !reconcile.includes("node_type: 'ATR'"));
check('legacy graph edge storage remains compatible', reconcile.includes("LEGACY_EDGE_STORAGE_TYPE = 'structural_inferred'") && reconcile.includes('relation_type: LEGACY_EDGE_STORAGE_TYPE'));
check('graph edge upsert matches live composite unique key', reconcile.includes("EDGE_CONFLICT = 'source_node_key,target_node_key,relation_type'") && reconcile.includes('{ onConflict: EDGE_CONFLICT }'));
check('multiple semantic relations survive one physical legacy edge', reconcile.includes('declaredRelations') && reconcile.includes('semanticRelationTypes'));
check('evidence graph read has no reconciliation write side effect', !reader.includes('reconcilePersistedEvidenceGraph'));
check('AMV read has no ensure/write side effect', !amvReader.includes('ensureInstitutionalAttractorDeclaration'));
check('prediction read has no attractor reconciliation side effect', !predictionReader.includes('reconcilePredictionAttractors'));
check('system read no longer recomputes MIHM matrix', !systemReader.includes('readRootMihmMatrix'));
check('Supabase dashboard reads are abortable', readerSupport.includes('executeAbortableQuery') && readerSupport.includes('DEFAULT_SUPABASE_READ_TIMEOUT_MS'));
check('evidence reader does not require missing graph_nodes.evidence_ids column', !reader.includes("lineage,evidence_ids,payload,attributes") && reader.includes("lineage,payload,attributes"));
check('evidence reader exposes semantic and temporal edge metadata', reader.includes('declaredRelations.join') && reader.includes('relationClass:') && reader.includes('observedAt: dateValue(attributes.observedAt'));
check('static index-circle evidence layout was removed', !workspace.includes('index / Math.max(1, nodes.length) * Math.PI * 2') && !workspace.includes('.slice(0, 28)'));
check('graph uses persisted connectivity for expansion', workspace.includes('graphDegrees') && workspace.includes('graphLevels') && workspace.includes('adjacency') && workspace.includes('setDepth(value)') && workspace.includes('maxDepth'));
check('graph supports longitudinal movement', workspace.includes('Mover el grafo de evidencia longitudinalmente') && workspace.includes('cutoffMs') && workspace.includes('timeEdges'));
check('graph exposes real relation labels and directed edges', workspace.includes('root-evidence-arrow') && workspace.includes('edge.relation.slice'));
check('explicit graph maintenance is sovereign and audited', reconcileRoute.includes("requireRootActor('evidence.graph.reconcile')") && reconcileRoute.includes("action: 'evidence.graph.reconcile'"));
check('legacy surface icons are restored to the left rail', workspace.includes("code: 'IN'") && workspace.includes("code: 'RP'") && workspace.includes("code: 'FD'") && workspace.includes("code: 'FM'") && workspace.includes("code: 'ST'") && workspace.includes("code: 'OB'") && workspace.includes("code: 'LB'"));
check('SFI chat is present in left rail and module 04', workspace.includes("code: 'SF'") && workspace.includes("label: 'SFI / Evidencia / Grafo'") && workspace.includes("'sfi:open-friccionauta'"));
check('global evidence intake no longer occupies module 04', !workspace.includes("label: 'Evidence Intake'") && !workspace.includes("target: '/root/evidence/intake'"));
check('internal ROOT surfaces use modal frame instead of new tabs', workspace.includes('root-surface-window') && workspace.includes('<iframe src={surface.href}') && !workspace.includes('target="_blank"'));
check('top bar carries operational source graph queue prediction and evidence state', workspace.includes('FUENTES') && workspace.includes('GRAFO') && workspace.includes('COLA') && workspace.includes('PRED') && workspace.includes('ÚLTIMA EVIDENCIA'));
check('prediction outcomes render longitudinal hypothesis branches', outcomeTree.includes('prediction-branch') && outcomeTree.includes('Mover outcomes longitudinalmente') && outcomeTree.includes("'win'") && outcomeTree.includes("'loss'"));
check('governed prediction win/loss derives from predicted versus actual', outcomeTree.includes('(predicted >= 0.5) === (actual >= 0.5)'));
check('attractor field is dynamic and longitudinal', attractorField.includes('Mover campo de atractores longitudinalmente') && attractorField.includes('fieldEnergy') && attractorField.includes('visibleEjectors') && attractorField.includes('phase'));
check('attractor movement is explicitly not claimed as evidence', attractorField.includes('movimiento ≠ nueva evidencia'));
check('module rail owns runtime and important reports', workspace.includes('CHAT CON SFI') && workspace.includes('LONGITUDINAL MEMORY') && workspace.includes('PREDICTION CASES') && workspace.includes('MEJORAR SISTEMA · DECISION QUEUE'));
check('floating report/prediction/decision links remain removed', !consoleSource.includes('rs-report-inbox-link') && !consoleSource.includes('navLink') && !consoleSource.includes('<Link href="/root/longitudinal"'));
check('methodology launcher is module-controlled', consoleSource.includes('launcher={false}') && methodology.includes("sfi:open-methodology"));
check('Friccionauta stays mounted and module-controlled', consoleSource.includes('<FriccionautaConsole launcher={false}') && friccionauta.includes("sfi:open-friccionauta"));
check('derived composition is labeled as mode, not evidence class', workspace.includes("statusContext=\"MODO\"") && workspace.includes('lectura compuesta'));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} · ${item.name}`);
if (failed.length) {
  console.error(`\nROOT operational convergence QA failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nROOT operational convergence QA passed: ${checks.length}/${checks.length}`);
