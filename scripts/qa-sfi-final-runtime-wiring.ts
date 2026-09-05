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
 observatoryConsole:readFileSync('src/components/sfi/ObservatoryConsole.tsx','utf8'),
 operatingWorkspace:readFileSync('src/components/sfi/SfiOperatingWorkspace.tsx','utf8'),
 interpretiveFlow:readFileSync('src/components/sfi/ObservatoryInterpretiveFlow.tsx','utf8'),
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

// The converged frontend no longer keeps governance decisions inside the visual
// scene shell. SfiConsole routes to one canonical operating workspace; that
// workspace owns accept/deny actions and the Cognitive Twin/Spine instrument.
assert.match(files.scene,/SfiOperatingWorkspace/);
assert.match(files.scene,/ObservatoryConsole/);
assert.doesNotMatch(files.scene,/ObservatoryInterpretiveFlow/);
assert.match(files.observatoryConsole,/ObservatoryInterpretiveFlow/);
assert.match(files.observatoryConsole,/<ObservatoryInterpretiveFlow world=\{world\} availability=\{availability\.world\}\/>/);
assert.doesNotMatch(files.interpretiveFlow,/fetch\('\/api\/observatory\/world'/);
assert.doesNotMatch(files.interpretiveFlow,/setInterval\(/);
assert.match(files.operatingWorkspace,/CognitiveSpineAnatomy/);
assert.match(files.operatingWorkspace,/ACEPTAR Y CERRAR/);
assert.match(files.operatingWorkspace,/DENEGAR REPORTE/);
assert.match(files.operatingWorkspace,/\/api\/acp\/proposals/);
assert.match(files.interpretiveFlow,/INFERENCE_ONLY/);
assert.match(files.interpretiveFlow,/RETURN \/ CONTRAST/);

assert.match(files.sceneRegistry,/root/);
assert.match(files.sceneRegistry,/governance/);
assert.match(files.sceneRegistry,/twin/);
assert.match(files.sceneRegistry,/LEGACY_INTERNAL_SCENES=.*falsification/s);
assert.equal(/falsification:\{key:'falsification'/.test(files.sceneRegistry),false,'falsification_must_not_return_as_parallel_sovereign_scene');
assert.match(files.externalManifest,/SFI External Agent Gateway/);
console.log(JSON.stringify({ok:true,contract:'SFI-FINAL-CLOSURE-RUNTIME-WIRING-2.1',studioFieldIdentity:'VERIFIED',returnContrast:'T0_FROZEN_AND_REQUIRED',observatoryPublicationGate:'WIRED',apexPilotRegistry:'PRESERVED_WITHOUT_HARDCODED_UI_STATE',frontend:'CONVERGED_OPERATING_WORKSPACE',fieldInterpretation:'SHARED_AUTHORITATIVE_READ_MODEL',legacyFalsification:'ABSORBED_NOT_SOVEREIGN',externalAgentGateway:'GOVERNED'},null,2));