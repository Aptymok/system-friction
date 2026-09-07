#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const outDir = path.join(root, 'artifacts', 'self-development');
fs.mkdirSync(outDir, { recursive: true });

const exists = (p) => fs.existsSync(path.join(root, p));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const findings = [];
const add = (id, severity, kind, evidence, requiredAction, addMutation = false) => findings.push({ id, severity, kind, evidence, requiredAction, addMutation });

// Constitutional / program completeness checks.
for (const p of [
  'docs/program/SFI-MASTER-PROGRAM.md',
  'docs/program/SFI-CONTRACT-LOCK.md',
  'docs/program/DEPENDENCY-GRAPH.md',
  'src/lib/root/selfObservability.ts',
  'src/lib/root/selfReconstruction.ts',
  'src/app/api/cases/route.ts',
  'src/app/api/observatory/world/route.ts',
  'src/lib/sfi/cognitive-runtime/registry.ts',
  'src/lib/sfi/cognitive-runtime/convergedRegistry.ts',
  'src/lib/sfi/cognitive-runtime/agentExecutionMap.ts',
  'src/lib/sfi/cognitive-runtime/agentPassports.ts',
]) if (!exists(p)) add(`missing:${p}`, 'critical', 'KNOWN_INCOMPLETE', `Missing required artifact ${p}`, `Restore or implement ${p}`, true);

// FIELD must be a real reachable projection, not an untested alias.
if (!exists('src/app/[scene]/page.tsx')) add('field:route-missing', 'critical', 'BROKEN', 'Dynamic scene route is missing', 'Restore a reachable /field route', true);
const workflowsDir = path.join(root, '.github', 'workflows');
const workflowText = exists('.github/workflows') ? fs.readdirSync(workflowsDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml')).map(f => read(`.github/workflows/${f}`)).join('\n') : '';
if (!workflowText.includes('/field')) add('field:not-assured', 'high', 'UNOBSERVED_CAPABILITY', 'No workflow contains an explicit /field production assertion', 'Add exact /field production assurance', true);

// Human ingress must be visible somewhere in application code, not API-only.
const appFiles = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(ent.name)) appFiles.push(p);
  }
}
walk(path.join(root, 'src', 'components'));
walk(path.join(root, 'src', 'app'));
const uiText = appFiles.filter(p => !p.includes(`${path.sep}api${path.sep}`)).map(p => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } }).join('\n');
if (!/NEW CASE|Nuevo caso|Crear caso|new case/i.test(uiText)) add('human-ingress:new-case', 'high', 'KNOWN_INCOMPLETE', 'No explicit human NEW CASE affordance detected', 'Expose human case creation through the canonical case contract', true);
if (!/NEW SIGNAL|Nueva señal|Crear señal|new signal/i.test(uiText)) add('human-ingress:new-signal', 'high', 'KNOWN_INCOMPLETE', 'No explicit human NEW SIGNAL affordance detected', 'Expose bounded signal ingress and qualification', true);

// Runtime agent truth belongs to the canonical registry/passport/execution owners.
// .github/agents/*.agent.md are repository operator/development declarations and do
// not become Cognitive Runtime agents merely because a prompt file exists.
const agentsDir = path.join(root, '.github', 'agents');
const declarationFiles = fs.existsSync(agentsDir)
  ? fs.readdirSync(agentsDir).filter(f => f.endsWith('.agent.md')).sort()
  : [];
const declarationIds = declarationFiles.map(f => f.replace(/\.agent\.md$/, ''));
const registryText = [
  'src/lib/sfi/cognitive-runtime/registry.ts',
  'src/lib/sfi/cognitive-runtime/convergedRegistry.ts',
].filter(exists).map(read).join('\n');
const executionText = exists('src/lib/sfi/cognitive-runtime/agentExecutionMap.ts')
  ? read('src/lib/sfi/cognitive-runtime/agentExecutionMap.ts')
  : '';
const runtimeRegisteredIds = [...new Set([...registryText.matchAll(/\bid\s*:\s*['"]([a-z0-9_:-]+)['"]/g)].map(match => match[1]))].sort();
const runtimeExecutableIds = [...new Set([...executionText.matchAll(/^\s*([a-z0-9_]+)\s*:\s*[A-Z][A-Za-z0-9_]*Agent\s*,?\s*$/gm)].map(match => match[1]))].sort();
const runtimeExecutableSet = new Set(runtimeExecutableIds);
const runtimeMissingExecutor = runtimeRegisteredIds.filter(id => !runtimeExecutableSet.has(id));
for (const id of runtimeMissingExecutor) {
  add(
    `agent-runtime:${id}:executor-missing`,
    'high',
    'IMPLEMENTED_NOT_WIRED',
    `${id} is present in the canonical Cognitive Runtime registry but has no executor in SFI_AGENT_EXECUTION_MAP`,
    'Wire the registered runtime capability to the canonical execution map or explicitly remove/supersede the runtime registration with lineage',
    false,
  );
}
const normalizedRuntimeIds = new Set(runtimeRegisteredIds.map(id => id.replace(/_/g, '-')));
const declarationOnlyIds = declarationIds.filter(id => !normalizedRuntimeIds.has(id));
const agentAudit = {
  contract: 'SFI-AGENT-RUNTIME-AUDIT-1.0',
  declarationPlane: '.github/agents/*.agent.md',
  runtimeRegistryOwner: 'SFI_CONVERGED_COGNITIVE_AGENT_REGISTRY',
  runtimeExecutionOwner: 'SFI_AGENT_EXECUTION_MAP',
  runtimePassportOwner: 'agentPassports.ts',
  declarationCount: declarationIds.length,
  runtimeRegisteredIds,
  runtimeExecutableIds,
  runtimeMissingExecutor,
  declarationOnlyIds,
  declarationFilesDoNotImplyRuntimeRegistration: true,
};

// Self-reconstruction may observe, test and repair without ROOT, but ADD/PROMOTE remains sovereign.
if (exists('src/lib/root/selfReconstruction.ts')) {
  const r = read('src/lib/root/selfReconstruction.ts');
  const obsoleteUniversalGate = r.includes('requires_human_approval: true') || r.includes('self_reconstruction_requires_human_control');
  const explicitBoundary = [
    "SFI-SELF-RECONSTRUCTION-AUTHORITY-1.0",
    'boundedRepairWithoutRoot: true',
    'verifyWithoutRoot: true',
    'addPromoteRequiresRoot: true',
    'canonicalPromotionAllowedDuringRepair: false',
    'root_add_required: true',
    'canonical_promotion_allowed: false',
  ].every((marker) => r.includes(marker));
  if (obsoleteUniversalGate || !explicitBoundary) {
    add(
      'governance:universal-self-repair-gate',
      'critical',
      'AUTHORITY_FRICTION',
      obsoleteUniversalGate
        ? 'Self reconstruction currently requires human control before bounded repair'
        : 'Self reconstruction does not expose the complete bounded-repair vs ROOT ADD/PROMOTE authority contract',
      'Allow observe/analyze/test/repair without ROOT while preserving explicit ROOT-only ADD/promotion and no canonical promotion during repair',
      true,
    );
  }
}

// Run cheap deterministic repository verification and preserve output as evidence.
const commands = [
  ['npm', ['run', 'typecheck']],
];
const commandResults = [];
for (const [cmd, args] of commands) {
  try {
    const stdout = execFileSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 8 * 60_000 });
    commandResults.push({ command: `${cmd} ${args.join(' ')}`, ok: true, output: stdout.slice(-12000) });
  } catch (error) {
    const output = `${error.stdout || ''}\n${error.stderr || ''}`.slice(-12000);
    commandResults.push({ command: `${cmd} ${args.join(' ')}`, ok: false, output });
    add(`verification:${cmd}-${args.join('-')}`, 'critical', 'BROKEN', output || 'Verification failed', 'Repair until verification passes', false);
  }
}

const now = new Date().toISOString();
const mutationCandidates = findings.filter(f => f.addMutation);
const report = {
  contract: 'SFI-SELF-DEVELOPMENT-1.0',
  generatedAt: now,
  epistemicState: 'OBSERVED_REPOSITORY_STATE',
  rootGateRule: 'ROOT approval is required only to ADD/PROMOTE a verified institutional mutation; observation, reconstruction, analysis, bounded repair, verification, RETURN and learning-candidate generation do not require ROOT.',
  health: findings.some(f => f.severity === 'critical') ? 'CRITICAL' : findings.length ? 'DEGRADED' : 'PASS',
  findings,
  verification: commandResults,
  agentAudit,
  mutationCandidates,
  nextAction: findings.length ? 'AUTONOMOUS_REPAIR_TRAJECTORY_REQUIRED' : 'CONTINUE_OBSERVATION',
};
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));

const md = `# SFI · Institutional Self-Development Report\n\n**Contract:** SFI-SELF-DEVELOPMENT-1.0  \n**Generated:** ${now}  \n**State:** ${report.health}  \n**Epistemic class:** OBSERVED_REPOSITORY_STATE\n\n## OBSERVATION\n${findings.length ? findings.map(f => `- **${f.severity.toUpperCase()} · ${f.kind} · ${f.id}** — ${f.evidence}`).join('\n') : '- No deterministic defect was observed by this run.'}\n\n## AGENT RUNTIME AUDIT\n- Runtime registry owner: ${agentAudit.runtimeRegistryOwner}\n- Runtime execution owner: ${agentAudit.runtimeExecutionOwner}\n- Runtime passport owner: ${agentAudit.runtimePassportOwner}\n- Runtime registered: ${agentAudit.runtimeRegisteredIds.length}\n- Runtime executable: ${agentAudit.runtimeExecutableIds.length}\n- Runtime missing executor: ${agentAudit.runtimeMissingExecutor.length}\n- Repository operator/development declarations: ${agentAudit.declarationCount}\n- Declaration-only IDs: ${agentAudit.declarationOnlyIds.length}\n\n## EVIDENCE\n${commandResults.map(r => `- ${r.command}: ${r.ok ? 'PASS' : 'FAIL'}`).join('\n')}\n\n## HYPOTHESES / RIVAL / COUNTERFACTUAL\n- HYPOTHESIS: each finding represents a real implementation, wiring, operability, authority or assurance gap.\n- RIVAL: a finding may be a detector limitation; repair must prove the condition against executable state before mutation.\n- COUNTERFACTUAL: if the capability were fully operational, the corresponding deterministic detector and end-to-end assurance should pass without founder intervention.\n\n## ANALYSIS → RETURN → LEARN\n- Findings are candidates, never canon by inference.\n- A repair must be bounded, tested and independently observable.\n- Failed repair attempts remain evidence and must not be silently discarded.\n- Repository operator/development prompt files do not count as runtime implementation evidence.\n\n## ADD\n${mutationCandidates.length ? mutationCandidates.map(f => `- ROOT REVIEW REQUIRED AFTER VERIFIED REPAIR: ${f.id} — ${f.requiredAction}`).join('\n') : '- No institutional mutation is ready for ROOT.'}\n\n## AUTHORITY\nObservation, reconstruction, analysis, repair attempts, verification and report generation require **no ROOT gate**. Only verified **ADD/PROMOTE** mutations are presented to ROOT for ACCEPT / DENY / REQUIRE MORE EVIDENCE.\n`;
fs.writeFileSync(path.join(outDir, 'report.md'), md);
console.log(JSON.stringify({ ok: true, health: report.health, findings: findings.length, mutationCandidates: mutationCandidates.length, runtimeRegistered: agentAudit.runtimeRegisteredIds.length, runtimeMissingExecutor: agentAudit.runtimeMissingExecutor.length, report: 'artifacts/self-development/report.json' }));
process.exitCode = commandResults.some(r => !r.ok) ? 2 : 0;
