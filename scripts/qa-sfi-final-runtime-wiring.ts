import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStudioFieldHandoff, verifyStudioFieldHandoff } from '../src/lib/studio/fieldHandoff';
import { observatoryPublicationDisposition } from '../src/lib/observatory/publicationGate';
import { APEX_SOCIOTECHNICAL_PILOT } from '../src/lib/method-lab/apexPilot';

const handoff = createStudioFieldHandoff({
  sourceObjectId: 'APEX-QA-OBJECT',
  interventionId: 'APEX-QA-INTERVENTION',
  predictionSeal: 'sha256:apex-qa',
  returnWindow: '72h',
  evidenceRefs: ['studio_run:qa', 'studio_artifact:qa'],
  handoffId: 'SFI-HANDOFF-APEX-QA',
  createdAt: '2026-08-11T18:00:00.000Z',
});
assert.equal(verifyStudioFieldHandoff(handoff), true);
assert.equal(verifyStudioFieldHandoff({ ...handoff, interventionId: 'tampered' }), false);

assert.equal(observatoryPublicationDisposition({
  epistemicClass: 'DERIVED', authority: 'PUBLIC', sourceRefs: ['worldspect_snapshots'],
}).disposition, 'PUBLISH');
assert.equal(observatoryPublicationDisposition({
  epistemicClass: 'SIMULATED', authority: 'PUBLIC', sourceRefs: ['simulation'],
}).disposition, 'BLOCK');

assert.equal(APEX_SOCIOTECHNICAL_PILOT.notASeparateLab, true);
assert.equal(APEX_SOCIOTECHNICAL_PILOT.parentProtocolId, 'sociotechnical_simulation');
assert.equal(APEX_SOCIOTECHNICAL_PILOT.authorityBoundary.automaticExternalExecution, false);

const files = {
  studioImplement: readFileSync('src/app/api/studio/implement/route.ts', 'utf8'),
  fieldCases: readFileSync('src/app/api/field/cases/route.ts', 'utf8'),
  fieldReturn: readFileSync('src/app/api/field/cases/[id]/return/route.ts', 'utf8'),
  governedReturn: readFileSync('src/lib/field/governedReturn.ts', 'utf8'),
  observatoryPage: readFileSync('src/app/observatory/page.tsx', 'utf8'),
  governedObservatory: readFileSync('src/lib/observatory/public/readGovernedPublicObservatoryState.ts', 'utf8'),
  methodLabConsole: readFileSync('src/components/root/method-lab/MethodLabConsole.tsx', 'utf8'),
};

assert.match(files.studioImplement, /createStudioFieldHandoff/);
assert.match(files.studioImplement, /READY_FOR_FIELD/);
assert.match(files.fieldCases, /studioHandoff/);
assert.match(files.governedReturn, /verifyStudioFieldHandoff/);
assert.match(files.governedReturn, /studioHandoffId/);
assert.match(files.governedReturn, /frozenRivalHypothesis/);
assert.match(files.governedReturn, /frozenStoppingCondition/);
assert.match(files.fieldReturn, /submitGovernedFieldReturn/);
assert.match(files.observatoryPage, /readGovernedPublicObservatoryState/);
assert.match(files.governedObservatory, /observatoryPublicationDisposition/);
assert.match(files.methodLabConsole, /APEX_SOCIOTECHNICAL_PILOT/);
assert.match(files.methodLabConsole, /APEX PILOT ADSCRITO/);

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-FINAL-CLOSURE-RUNTIME-WIRING-1.0',
  studioFieldIdentity: 'VERIFIED',
  returnContrast: 'T0_FROZEN_AND_REQUIRED',
  observatoryPublicationGate: 'WIRED',
  apexPilotVisibility: 'WIRED_TO_METHOD_LAB',
}, null, 2));
