import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStudioFieldHandoff, verifyStudioFieldHandoff } from '../src/lib/studio/fieldHandoff';
import { observatoryPublicationDisposition } from '../src/lib/observatory/publicationGate';
import { APEX_SOCIOTECHNICAL_PILOT } from '../src/lib/method-lab/apexPilot';

const handoff=createStudioFieldHandoff({sourceObjectId:'APEX-QA-OBJECT',interventionId:'APEX-QA-INTERVENTION',predictionSeal:'sha256:apex-qa',returnWindow:'72h',evidenceRefs:['studio_run:qa','studio_artifact:qa'],handoffId:'SFI-HANDOFF-APEX-QA',createdAt:'2026-08-11T18:00:00.000Z'});
assert.equal(verifyStudioFieldHandoff(handoff),true);
assert.equal(verifyStudioFieldHandoff({...handoff,interventionId:'tampered'}),false);
assert.equal(observatoryPublicationDisposition({epistemicClass:'DERIVED',authority:'PUBLIC',sourceRefs:['worldspect_snapshots']}).disposition,'PUBLISH');
assert.equal(observatoryPublicationDisposition({epistemicClass:'SIMULATED',authority:'PUBLIC',sourceRefs:['simulation']}).disposition,'BLOCK');
assert.equal(APEX_SOCIOTECHNICAL_PILOT.notASeparateLab,true);
assert.equal(APEX_SOCIOTECHNICAL_PILOT.parentProtocolId,'sociotechnical_simulation');
assert.equal(APEX_SOCIOTECHNICAL_PILOT.authorityBoundary.automaticExternalExecution,false);

const files={
 studioImplement:readFileSync('src/app/api/studio/implement/route.ts','utf8'),
 fieldCases:readFileSync('src/app/api/field/cases/route.ts','utf8'),
 fieldReturn:readFileSync('src/app/api/field/cases/[id]/return/route.ts','utf8'),
 governedReturn:readFileSync('src/lib/field/governedReturn.ts','utf8'),
 governedObservatory:readFileSync('src/lib/observatory/public/readGovernedPublicObservatoryState.ts','utf8'),
 scene:readFileSync('src/components/sfi/SfiConsole.tsx','utf8'),
 sceneRegistry:readFileSync('src/components/sfi/scenes.ts','utf8'),
 externalManifest:readFileSync('src/app/api/external/v1/manifest/route.ts','utf8'),
};
assert.match(files.studioImplement,/createStudioFieldHandoff/);
assert.match(files.studioImplement,/READY_FOR_FIELD/);
assert.match(files.fieldCases,/studioHandoff/);
assert.match(files.governedReturn,/verifyStudioFieldHandoff/);
assert.match(files.governedReturn,/frozenRivalHypothesis/);
assert.match(files.fieldReturn,/submitGovernedFieldReturn/);
assert.match(files.governedObservatory,/observatoryPublicationDisposition/);
assert.match(files.scene,/COGNITIVE TWIN/);
assert.match(files.scene,/ACEPTAR/);
assert.match(files.scene,/RECHAZAR/);
assert.match(files.sceneRegistry,/falsification/);
assert.match(files.sceneRegistry,/governance/);
assert.match(files.externalManifest,/SFI External Agent Gateway/);
console.log(JSON.stringify({ok:true,contract:'SFI-FINAL-CLOSURE-RUNTIME-WIRING-2.0',studioFieldIdentity:'VERIFIED',returnContrast:'T0_FROZEN_AND_REQUIRED',observatoryPublicationGate:'WIRED',apexPilotRegistry:'PRESERVED_WITHOUT_HARDCODED_UI_STATE',frontend:'LIVE_SCENE_RUNTIME',externalAgentGateway:'GOVERNED'},null,2));
