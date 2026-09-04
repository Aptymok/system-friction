import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(path:string)=>fs.readFileSync(path,'utf8');
const projection=read('src/lib/root/actionableHumanQueue.ts');
const interactive=read('src/app/api/root/interactive/route.ts');
const dossier=read('src/app/api/root/decision-dossier/route.ts');
const root=read('src/components/sfi/SfiRootWorkspace.tsx');
const consoleUi=read('src/components/sfi/SfiConsole.tsx');

assert.ok(projection.includes('HUMAN_ACTION_REQUIRED implies ACTIONABLE_DOSSIER_REQUIRED'),'human queue invariant must be explicit');
assert.ok(projection.includes("status === 'proposed'")&&projection.includes("status === 'waiting_evidence'"),'proposal decision states must be explicit');
assert.ok(projection.includes("kind: 'REVIEW_AVAILABLE_NOT_HUMAN_OBLIGATION'")&&projection.includes('rootActionRequired: rootActionRequired'),'non-actionable review states must be removed from human obligations');
assert.ok(projection.includes('reviewAvailableNotRequired'),'human count must distinguish optional review debt');
assert.ok(projection.includes("'/cases?cycle='")||projection.includes('`/cases?cycle=${'),'cycle human obligations must deep-link to their dossier');

assert.ok(interactive.includes('projectActionableHumanQueue'),'interactive surfaces must consume the actionable projection');
assert.ok(interactive.includes('actionableHumanProjection: true'),'ROOT bootstrap must declare actionable projection');
assert.equal(interactive.includes("service.from('action_proposals')"),false,'interactive route must not duplicate proposal reads');

assert.ok(dossier.includes("select('*').eq('id', id).maybeSingle()"),'decision dossier must target exactly one proposal');
assert.ok(dossier.includes("proposalReads: 1")&&dossier.includes('duplicateProposalReads: 0'),'dossier read plan must prohibit duplicate proposal reads');
assert.ok(dossier.includes('executionAuthorizedByThisDecision: false'),'proposal decision must not imply execution');
assert.ok(dossier.includes('canonicalPromotionAuthorizedByThisDecision: false'),'proposal decision must not imply canon');
assert.ok(dossier.includes("status === 'waiting_evidence' && proposedCandidates.length"),'waiting evidence must surface candidate review when it exists');
assert.ok(dossier.includes('Ya existe evidencia aceptada. SFI debe reconciliar readiness; no necesitas volver a pedir la misma evidencia.'),'waiting evidence must not ask the human for the same evidence again');

assert.ok(consoleUi.includes("current==='root'?<SfiRootWorkspace enabled/>"),'ROOT must render the sovereign inbox owner');
assert.ok(root.includes("jsonFetch('/api/root/interactive?surface=root')"),'ROOT must use one base interactive bootstrap');
assert.ok(root.includes('/api/root/decision-dossier?id='),'decision detail must be a targeted dossier read');
assert.ok(root.includes("jsonFetch('/api/root/decisions'"),'proposal accept/deny decisions must use canonical ROOT queue writer');
assert.ok(root.includes('/request-evidence')&&root.includes('Evidence Hunter es ahora dueño'),'request-evidence must create evidence work instead of only changing status');
assert.ok(root.includes('APROBAR DISEÑO')&&root.includes('PEDIR EVIDENCIA')&&root.includes('RECHAZAR'),'ROOT must expose state-valid proposal actions');
assert.ok(root.includes('ABRIR EXPEDIENTE →')&&root.includes('/cases?cycle='),'cycle obligations must be navigable');
assert.ok(root.includes('aprobar diseño ≠ ejecutar ≠ aceptar RETURN ≠ cerrar ≠ canonizar'),'human UI must preserve authority separation');
assert.ok(root.includes('Revisión disponible, no obligatoria'),'optional review must remain visible without inflating human debt');
assert.equal(root.includes("jsonFetch('/api/acp/proposals')"),false,'ROOT must not create a second proposal feed');

console.log(JSON.stringify({
  ok:true,
  contract:'SFI-ACTIONABLE-SOVEREIGN-INBOX-1.1',
  invariants:[
    'HUMAN_ACTION_REQUIRED_IMPLIES_ACTIONABLE_DOSSIER',
    'NO_ACTIONABLE_TRANSITION_NO_HUMAN_COUNT',
    'PROPOSAL_DECISION_NOT_EXECUTION_NOT_CANON',
    'REQUEST_EVIDENCE_CREATES_EVIDENCE_WORK',
    'WAITING_EVIDENCE_DOES_NOT_REASK_SAME_EVIDENCE',
    'CYCLE_HUMAN_ACTION_DEEP_LINKS_TO_DOSSIER',
    'ZERO_DUPLICATE_PROPOSAL_FEEDS',
  ],
},null,2));