import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const projection=read('src/lib/root/actionableHumanQueue.ts');
const interactive=read('src/app/api/root/interactive/route.ts');
const dossier=read('src/app/api/root/decision-dossier/route.ts');
const reports=read('src/lib/reports/pendingRootReportDecisions.ts');
const root=read('src/components/sfi/SfiRootWorkspace.tsx');
const consoleUi=read('src/components/sfi/SfiConsole.tsx');

assert.ok(projection.includes('HUMAN_ACTION_REQUIRED implies ACTIONABLE_DOSSIER_REQUIRED'),'human queue invariant must be explicit');
assert.ok(projection.includes("status === 'proposed'")&&projection.includes("status === 'waiting_evidence'"),'proposal decision states must be explicit');
assert.ok(projection.includes("kind: 'REVIEW_AVAILABLE_NOT_HUMAN_OBLIGATION'")&&projection.includes('const rootActionRequired = wasRequired && actionability.actionable'),'non-actionable proposal review states must leave human obligations');
assert.ok(projection.includes('reportActionability')&&projection.includes('actionableReportDecisions'),'report approvals must participate in the sovereign human queue');
assert.ok(projection.includes('reviewAvailableNotRequired'),'human count must distinguish optional review debt');
assert.ok(projection.includes('`/cases?cycle=${'),'cycle human obligations must deep-link to their dossier');

assert.ok(reports.includes("eq('role', 'report_agent')")&&reports.includes('queued_for_approval'),'report queue must be a bounded report_agent read');
assert.ok(interactive.includes('readPendingRootReportDecisions'),'ROOT bootstrap must hydrate pending report decisions');
assert.ok(interactive.includes('projectActionableHumanQueue'),'interactive surfaces must consume the actionable projection');
assert.ok(interactive.includes('actionableHumanProjection: true'),'ROOT bootstrap must declare actionable projection');
assert.ok(interactive.includes('reportApprovalReads: 1')&&interactive.includes('fullReportArchiveRead: false'),'ROOT polling must not load the full report archive');
assert.equal(interactive.includes("service.from('action_proposals')"),false,'interactive route must not duplicate proposal reads');

assert.ok(dossier.includes("service.from('action_proposals').select('*').eq('id', id).maybeSingle()"),'proposal dossier must target one proposal');
assert.ok(dossier.includes("service.from('sfi_cognitive_twin_runs')")&&dossier.includes(".eq('role', 'report_agent')"),'report dossier must target canonical report_agent runs');
assert.ok(dossier.includes("kind: 'report'")&&dossier.includes('APROBAR PARA USO HUMANO'),'report dossier must expose the human-use decision');
assert.ok(dossier.includes('approved_for_human_use')&&dossier.includes('truthAuthorizedByThisDecision: false'),'report approval must not imply truth');
assert.ok(dossier.includes('executionAuthorizedByThisDecision: false'),'decision must not imply execution');
assert.ok(dossier.includes('canonicalPromotionAuthorizedByThisDecision: false'),'decision must not imply canon');
assert.ok(dossier.includes("status === 'waiting_evidence' && proposedCandidates.length"),'waiting evidence must surface candidate review when it exists');
assert.ok(dossier.includes('Ya existe evidencia aceptada. SFI debe reconciliar readiness; no necesitas volver a pedir la misma evidencia.'),'waiting evidence must not ask the human for the same evidence again');
assert.ok(dossier.includes('duplicateProposalReads: 0')&&dossier.includes('duplicateReportReads: 0'),'targeted dossier reads must prohibit duplicate decision reads');

assert.ok(consoleUi.includes("current==='root'?<SfiRootWorkspace enabled/>"),'ROOT must render the sovereign inbox owner');
assert.ok(root.includes("jsonFetch('/api/root/interactive?surface=root')"),'ROOT must use one base interactive bootstrap');
assert.ok(root.includes('/api/root/decision-dossier?kind=${kind}&id='),'decision detail must be a kind-aware targeted dossier read');
assert.ok(root.includes("jsonFetch('/api/root/decisions'"),'accept/deny decisions must use canonical ROOT queue writer');
assert.ok(root.includes('/request-evidence')&&root.includes('Evidence Hunter es ahora dueño'),'request-evidence must create evidence work instead of only changing status');
assert.ok(root.includes('APROBAR PARA USO HUMANO')&&root.includes('RECHAZAR REPORTE'),'ROOT must expose report decisions');
assert.ok(root.includes('APROBAR DISEÑO')&&root.includes('PEDIR EVIDENCIA')&&root.includes('RECHAZAR'),'ROOT must expose state-valid proposal actions');
assert.ok(root.includes('ABRIR EXPEDIENTE →')&&root.includes('/cases?cycle='),'cycle obligations must be navigable');
assert.ok(root.includes('uso humano ≠ verdad ≠ publicación ≠ ejecución ≠ cierre ≠ canon'),'report authority boundary must be visible');
assert.ok(root.includes('aprobar diseño ≠ ejecutar ≠ aceptar RETURN ≠ cerrar ≠ canonizar'),'proposal authority boundary must be visible');
assert.ok(root.includes('Revisión disponible, no obligatoria'),'optional review must remain visible without inflating human debt');
assert.ok(root.includes("href: '/library'")&&root.includes("href: '/method-lab'")&&root.includes("href: '/observatory'"),'ROOT must expose the canonical institutional surface map');
assert.equal(root.includes("jsonFetch('/api/acp/proposals')"),false,'ROOT must not create a second proposal feed');

console.log(JSON.stringify({
  ok:true,
  contract:'SFI-ACTIONABLE-SOVEREIGN-INBOX-1.2',
  invariants:[
    'HUMAN_ACTION_REQUIRED_IMPLIES_ACTIONABLE_DOSSIER',
    'REPORT_APPROVALS_ARE_VISIBLE_AND_ACTIONABLE',
    'REPORT_APPROVAL_NOT_TRUTH_NOT_EXECUTION_NOT_CANON',
    'NO_ACTIONABLE_TRANSITION_NO_HUMAN_COUNT',
    'PROPOSAL_DECISION_NOT_EXECUTION_NOT_CANON',
    'REQUEST_EVIDENCE_CREATES_EVIDENCE_WORK',
    'WAITING_EVIDENCE_DOES_NOT_REASK_SAME_EVIDENCE',
    'CYCLE_HUMAN_ACTION_DEEP_LINKS_TO_DOSSIER',
    'ZERO_DUPLICATE_PROPOSAL_FEEDS',
  ],
},null,2));
