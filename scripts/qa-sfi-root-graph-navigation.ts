import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks: Array<{ name: string; ok: boolean }> = [];
const check = (name: string, ok: boolean) => checks.push({ name, ok });

const reconcile = read('src/lib/evidence/reconcileEvidenceGraph.ts');
const reader = read('src/lib/root/sovereign/readers/readRootEvidenceGraph.ts');
const workspace = read('src/components/root/sovereign/RootObservatoryWorkspace.tsx');
const consoleSource = read('src/components/root/sovereign/RootSovereignConsole.tsx');
const methodology = read('src/components/root/sovereign/RootMethodologyWorkbench.tsx');
const friccionauta = read('src/components/root/friccionauta/FriccionautaConsole.tsx');

check('legacy graph node storage remains compatible', reconcile.includes("LEGACY_NODE_STORAGE_TYPE = 'INF'") && !reconcile.includes("node_type: 'SRC'") && !reconcile.includes("node_type: 'ATR'"));
check('legacy graph edge storage remains compatible', reconcile.includes("LEGACY_EDGE_STORAGE_TYPE = 'structural_inferred'") && reconcile.includes('relation_type: LEGACY_EDGE_STORAGE_TYPE'));
check('semantic graph meaning survives storage compatibility', reconcile.includes('semanticRelationType: input.relationType') && reconcile.includes('declaredRelation: input.relation'));
check('evidence reader prefers semantic relation', reader.includes('row.relation ?? attributes.declaredRelation ?? row.relation_type'));
check('evidence graph exposes temporal edge metadata', reader.includes('observedAt: dateValue(attributes.observedAt') && reader.includes('sourceObservedAt'));
check('static index-circle evidence layout was removed', !workspace.includes('index / Math.max(1, nodes.length) * Math.PI * 2') && !workspace.includes('.slice(0, 28)'));
check('graph uses persisted connectivity for expansion', workspace.includes('graphDegrees') && workspace.includes('graphLevels') && workspace.includes('adjacency') && workspace.includes('setDepth(value)') && workspace.includes('maxDepth'));
check('graph supports longitudinal movement', workspace.includes('Mover el grafo de evidencia longitudinalmente') && workspace.includes('cutoffMs') && workspace.includes('timeEdges'));
check('graph exposes real relation labels and directed edges', workspace.includes('root-evidence-arrow') && workspace.includes('edge.relation.slice'));
check('attractor is selectable', workspace.includes('attractor-selector') && workspace.includes('<select value='));
check('module rail owns runtime and important reports', workspace.includes('FRICCIONAUTA') && workspace.includes('LONGITUDINAL MEMORY') && workspace.includes('PREDICTION CASES') && workspace.includes('MEJORAR SISTEMA · DECISION QUEUE'));
check('internal ROOT surfaces use modal frame', workspace.includes('root-surface-window') && workspace.includes('<iframe src={surface.href}'));
check('separate SUPERFICIES rail was removed', !workspace.includes('<small>SUPERFICIES</small>'));
check('floating report/prediction/decision links removed', !consoleSource.includes('rs-report-inbox-link') && !consoleSource.includes('navLink') && !consoleSource.includes('<Link href="/root/longitudinal"'));
check('methodology launcher is module-controlled', consoleSource.includes('launcher={false}') && methodology.includes("sfi:open-methodology"));
check('Friccionauta launcher is module-controlled', consoleSource.includes('<FriccionautaConsole launcher={false}') && friccionauta.includes("sfi:open-friccionauta"));
check('ROOT intercepts remaining blank-target anchors', consoleSource.includes('a[target="_blank"]') && consoleSource.includes('window.location.assign(anchor.href)'));
check('derived composition is labeled as mode, not evidence class', workspace.includes("statusContext=\"MODO\"") && workspace.includes('lectura compuesta'));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} · ${item.name}`);
if (failed.length) {
  console.error(`\nROOT graph/navigation QA failed: ${failed.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nROOT graph/navigation QA passed: ${checks.length}/${checks.length}`);
