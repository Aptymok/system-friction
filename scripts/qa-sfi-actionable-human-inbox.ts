import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path: string) => fs.readFileSync(path, 'utf8');
const boundary = read('src/lib/governance/rootDecisionBoundary.ts');
const projection = read('src/lib/root/actionableHumanQueue.ts');
const interactive = read('src/app/api/root/interactive/route.ts');
const dossier = read('src/app/api/root/decision-dossier/route.ts');
const decisions = read('src/app/api/root/decisions/route.ts');
const root = read('src/components/sfi/SfiRootWorkspace.tsx');
const operating = read('src/components/sfi/SfiOperatingWorkspace.tsx');
const cases = read('src/app/api/cases/[caseId]/route.ts');
const caseOperational = read('src/core/case-platform/operational.ts');
const empirical = read('src/lib/sfi/universalEmpiricalContinuation.ts');

for (const decisionClass of ['INSTITUTIONAL_CHANGE', 'CAPABILITY_IMPLEMENTATION', 'LEARNING_PROMOTION']) {
  assert.ok(boundary.includes(`'${decisionClass}'`), `missing sovereign decision class: ${decisionClass}`);
}
for (const nonDecision of [
  'CASE_OR_CYCLE_CLOSE',
  'REPORT_GENERATION_OR_USE',
  'EVIDENCE_ACQUISITION_OR_CLASSIFICATION',
  'BOUNDED_REPAIR_AND_REGRESSION',
  'EXECUTION_WITHIN_EXISTING_AUTHORITY',
  'RETURN_AND_REALITY_CALIBRATION',
  'LEARNING_CANDIDATE_CAPTURE',
]) {
  assert.ok(boundary.includes(`'${nonDecision}'`), `missing explicit operational non-decision: ${nonDecision}`);
}
assert.ok(boundary.includes("return 'OPERATIONAL_WORK'"), 'generic work must remain operational instead of becoming ROOT work by inference');

assert.ok(projection.includes("const ROOT_DECISION_CLASSES = new Set(['INSTITUTIONAL_CHANGE', 'CAPABILITY_IMPLEMENTATION', 'LEARNING_PROMOTION'])"), 'human queue must use the narrow sovereign classes');
assert.ok(projection.includes("const reports: Row[] = []"), 'reports must not enter the sovereign queue');
assert.ok(projection.includes('rootActionRequired: false') && projection.includes("kind: 'OPERATIONAL_CYCLE'"), 'routine cycles must remain observable without ROOT approval');
assert.ok(projection.includes("allowed: ['accept', 'deny']"), 'sovereign actions must be binary ACCEPT/DENY');
assert.doesNotMatch(projection, /request_evidence|accept_close|deny_close/, 'human queue must not turn evidence or closure into approval actions');

assert.equal(interactive.includes('readInteractiveReportApprovals'), false, 'ROOT bootstrap must not hydrate report approvals');
assert.ok(interactive.includes('reportApprovalReads: 0') && interactive.includes('sovereignReports: false'), 'ROOT read plan must declare reports non-sovereign');
assert.ok(interactive.includes('projectActionableHumanQueue'), 'interactive surfaces must consume the sovereign projection');
assert.equal(interactive.includes("service.from('action_proposals')"), false, 'interactive route must not duplicate proposal reads');

assert.ok(dossier.includes("contract: 'SFI-SOVEREIGN-DECISION-DOSSIER-2.0'"), 'plain-language sovereign dossier contract missing');
for (const key of ['who', 'whatHappened', 'whyItMatters', 'proposal', 'sfiGain', 'evidence', 'ifAccepted', 'ifDenied', 'whyRoot']) {
  assert.ok(dossier.includes(`${key}:`), `plain-language dossier field missing: ${key}`);
}
assert.ok(dossier.includes("error: 'report_is_not_a_sovereign_decision'"), 'report dossier requests must fail as non-sovereign');
assert.ok(dossier.includes('rootEvidenceApprovalRequired: false'), 'ROOT must never be required to approve evidence candidates');
assert.ok(dossier.includes('technicalTrace'), 'technical lineage must remain available as drill-down');

assert.ok(decisions.includes("allowed: ['accept', 'deny']"), 'ROOT decision writer must accept only binary decisions');
assert.ok(decisions.includes("error: 'operational_work_is_not_a_root_decision'"), 'operational work must fail closed at ROOT writer');
assert.ok(decisions.includes("error: 'report_is_not_a_sovereign_decision'"), 'report decisions must be rejected at the canonical writer');
assert.ok(decisions.includes("error: 'candidate_capture_is_not_a_sovereign_decision'"), 'candidate capture must not become a sovereign decision');

assert.ok(root.includes("jsonFetch('/api/root/interactive?surface=root')"), 'ROOT must use one base interactive bootstrap');
assert.ok(root.includes('/api/root/decision-dossier?kind=proposal&id='), 'ROOT detail must use targeted proposal dossier reads');
assert.ok(root.includes("jsonFetch('/api/root/decisions'"), 'sovereign ACCEPT/DENY must use the canonical ROOT writer');
for (const label of ['Quién lo trae', 'Qué pasó', 'Por qué importa', 'Qué propone', 'Qué gana SFI', 'Qué evidencia hay', 'Si aceptas', 'Si deniegas', 'Por qué te corresponde decidir']) {
  assert.ok(root.includes(label), `human-language ROOT section missing: ${label}`);
}
assert.ok(root.includes('ACEPTAR') && root.includes('DENEGAR'), 'ROOT must expose binary sovereign decisions');
assert.ok(root.includes('Los reportes existen para informar y reconstruir'), 'report archive must be explicitly observational/read-only');
assert.equal(root.includes('APROBAR PARA USO HUMANO'), false, 'ROOT must not expose report approval');
assert.equal(root.includes('RECHAZAR REPORTE'), false, 'ROOT must not expose report rejection');
assert.equal(root.includes('/request-evidence'), false, 'ROOT must not act as Evidence Hunter');
assert.equal(root.includes('/evidence-candidates/'), false, 'ROOT must not accept/reject evidence candidates');
assert.equal(root.includes('decisionKind=report'), false, 'reports must not deep-link into sovereign decisions');

assert.equal(operating.includes('ACEPTAR Y CERRAR'), false, 'case/cycle workspace must not require approval to close');
assert.equal(operating.includes('DENEGAR REPORTE'), false, 'case/cycle workspace must not gate reports on user denial');
assert.equal(operating.includes('reportDecision'), false, 'case/cycle workspace must not retain legacy report-decision mutations');
assert.ok(cases.includes("'AWAITING_USER_CLOSE'"), 'legacy close state must remain addressable for historical reconstruction');
assert.ok(cases.includes("error: 'legacy_state_not_enterable'") && cases.includes('remains readable for historical reconstruction'), 'API must read legacy close state but reject new entry into it');
assert.ok(caseOperational.includes("AWAITING_USER_CLOSE: ['ANALYZING', 'CLOSED']") && caseOperational.includes('Legacy reconstruction state only'), 'case state machine must preserve legacy reentry/close without generating the state');
assert.ok(caseOperational.includes('awaitingUserCloseIsLegacyReadOnlyState: true'), 'legacy-state policy must be explicit');
assert.ok(caseOperational.includes('closedRequiresAwaitingUserClose: false'), 'new case closure must not require the legacy user-close state');
assert.ok(caseOperational.includes('finalClosureRequiresExplicitUserDecision: false'), 'new case closure must be autonomous when criteria are satisfied');
assert.ok(empirical.includes('closeUniversalCycle('), 'empirical continuation must be able to close the same cycle after validated RETURN/contrast');
assert.ok(empirical.includes('recordUniversalLearningCandidate'), 'autonomous close may create a learning candidate without promoting it');
assert.ok(empirical.includes("canonicalPromotionAuthorized: false"), 'closure/learning-candidate capture must not silently promote canon');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-ACTIONABLE-SOVEREIGN-INBOX-2.0',
  invariants: [
    'ROOT_ONLY_INSTITUTIONAL_CHANGE_CAPABILITY_IMPLEMENTATION_LEARNING_PROMOTION',
    'ROOT_ACCEPT_DENY_ONLY',
    'REPORTS_ARE_OBSERVABLE_NOT_APPROVABLE',
    'EVIDENCE_IS_SFI_OWNED_NOT_ROOT_APPROVED',
    'ROUTINE_CLOSE_IS_AUTONOMOUS',
    'LEGACY_AWAITING_USER_CLOSE_READABLE_NOT_ENTERABLE',
    'CLOSURE_DOES_NOT_PROMOTE_LEARNING',
    'PLAIN_LANGUAGE_PRECEDES_TECHNICAL_TRACE',
    'MISSING_PROVENANCE_IS_NOT_FABRICATED',
    'ZERO_DUPLICATE_PROPOSAL_FEEDS',
  ],
}, null, 2));
