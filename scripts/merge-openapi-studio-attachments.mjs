import fs from 'node:fs';
import path from 'node:path';

const openapiPath = path.join(process.cwd(), 'public', 'openapi.json');
const api = JSON.parse(fs.readFileSync(openapiPath, 'utf8'));
const studioPost = api.paths?.['/api/external/v1/studio']?.post;
if (!studioPost) throw new Error('SFI_STUDIO_OPENAPI_PATH_MISSING');
const studioRequest = api.components?.schemas?.StudioRequest;
if (!studioRequest?.properties?.operation?.enum) throw new Error('SFI_STUDIO_REQUEST_SCHEMA_MISSING');
for (const operation of ['context','ingest_analyze','produce']) if (!studioRequest.properties.operation.enum.includes(operation)) studioRequest.properties.operation.enum.push(operation);

studioRequest.properties.openaiFileIdRefs = { type:'array',minItems:1,maxItems:1,items:{type:'string'},description:'For operation=ingest_analyze, attach exactly one conversation audio file. ChatGPT replaces this schema value at runtime with its file reference object.' };
studioRequest.properties.analysisAuthorization = { type:'object',description:'Operator declaration that SFI may ingest and analyze this attachment. Declared analysis permission only; no rights transfer or canonical authority.',required:['authorizedForAnalysis','basis'],properties:{authorizedForAnalysis:{type:'boolean',const:true},basis:{type:'string',enum:['operator_owned','authorized_by_rightsholder','session_specific_permission']},note:{type:'string'}},additionalProperties:false };
studioRequest.properties.productionAuthorization = { type:'object',description:'For operation=produce, declared permission to process/render the owned source object. This does not transfer ownership, exclusivity or canon.',required:['authorizedForProduction','basis'],properties:{authorizedForProduction:{type:'boolean',const:true},basis:{type:'string',enum:['operator_owned','authorized_by_rightsholder','session_specific_permission']},note:{type:'string'}},additionalProperties:false };
studioRequest.properties.mode = { type:'string',enum:['VOICE_MUSICALIZE','MASTER_ADJUST'] };
studioRequest.properties.bpm = { type:'number',minimum:60,maximum:200 };
studioRequest.properties.key = { type:'string',maxLength:24 };
studioRequest.properties.culturalProfile = { type:'string',maxLength:80 };
studioRequest.properties.instrumentIds = { type:'object',description:'Optional explicit production-eligible Instrument Bank IDs. Omit to let SFI resolve eligible instruments by cultural profile.',properties:{harmony:{type:'string'},bass:{type:'string'}},additionalProperties:false };
studioRequest.properties.title = { type:'string',maxLength:240 };
studioRequest.properties.limit = { type:'integer',minimum:1,maximum:100,description:'For context/list, bound the number of owner-scoped records returned per collection.' };

studioPost.summary = 'Read owner context or operate owner-scoped Studio audio';
studioPost.description = 'User-bound Studio route. context returns persisted owner sessions, objects, evidence traces, archive events and owner-attributed AMV memory without binary content. Other operations inspect, analyze, ingest or produce owner-scoped Studio material.';
studioPost['x-sfi-operation-scopes'] = { context:'studio:read',list:'studio:read',inspect:'studio:read',features:'studio:read',content:'studio:content',analyze:'studio:run',ingest_analyze:'studio:run',produce:'studio:run' };
studioPost['x-sfi-authority-boundary'] = { ownerBound:true,ownerContextContract:'SFI-STUDIO-OWNER-CONTEXT-1.0',ownerContextBinaryContentIncluded:false,ownerContextRootEvidenceIncluded:false,ownerContextInstitutionalCanonIncluded:false,rawAttachmentPersistence:'PRIVATE_OWNER_SCOPED_STUDIO_ONLY',intakeIdempotency:'owner_id + openaiFileId',materialExecutionWorkspace:'EPHEMERAL',analysisAuthorizationEpistemicClass:'DECLARED',productionAuthorizationEpistemicClass:'DECLARED',rightsTransfer:false,canonicalPromotionAllowed:false,externalPublicationAllowed:false };

api.info ||= {};
const [major=1,minor=8] = String(api.info.version||'1.8.0').split('.').map(Number);
if (major < 1 || (major === 1 && minor < 16)) api.info.version = '1.16.0';
api['x-sfi-governance'] ||= {};
api['x-sfi-governance'].ownerStudioContext = { contract:'SFI-STUDIO-OWNER-CONTEXT-1.0',operation:'context',scope:'studio:read',tenant:'oauth.subjectId owner only',sources:['studio_sessions','studio_objects','studio_evidence_traces','studio_archive_events','owner-attributed sfi_amv_memory'],studioPredicate:'owner_id = oauth.subjectId',amvPredicate:'memory_delta.raw.ownerId = oauth.subjectId',binaryContentIncluded:false,rootEvidenceIncluded:false,institutionalCanonIncluded:false,metadataRestoreDoesNotImplyBinaryMaterialization:true };
api['x-sfi-governance'].chatgptStudioAttachmentIntake = { contract:'SFI-CHATGPT-STUDIO-ATTACHMENT-1.1',operation:'ingest_analyze',parameter:'openaiFileIdRefs',count:1,modality:'audio',scope:'studio:run',tenant:'oauth.subjectId owner only',idempotency:'public.studio_objects unique(owner_id, metadata.externalIntake.openaiFileId)',acceptedTemporaryHost:'files.oaiusercontent.com',temporaryUrlPersisted:false,explicitAnalysisAuthorizationRequired:true,rightsTransfer:false,canonicalPromotionAllowed:false };
api['x-sfi-governance'].materialAudioProduction = { contract:'SFI-MATERIAL-AUDIO-RETURN-1.0',operation:'produce',modes:['VOICE_MUSICALIZE','MASTER_ADJUST'],scope:'studio:run',sourceTenant:'oauth.subjectId owner only',outputTenant:'oauth.subjectId owner only',acousticPackage:'SFI-ACOUSTIC-INSTRUMENT-PACKAGE-1.0',canonicalRenderAdapter:'SFI-SFZ-RENDER-1.0',performanceContract:'SFI-AUDIO-PERFORMANCE-1.0',midiIsSoundSource:false,realSamplePackagesRequiredForMusicalize:true,rightsAwareInstrumentRegistry:'public.sfi_instruments',ephemeralWorkspace:true,finalOutputPersistedToStudio:true,rightsTransfer:false,canonicalPromotionAllowed:false };

fs.writeFileSync(openapiPath, `${JSON.stringify(api,null,2)}\n`);
console.log(JSON.stringify({ok:true,contract:'SFI-STUDIO-AUDIO-ACTIONS-1.1',operations:['context','ingest_analyze','produce'],ownerContextScope:'studio:read',productionScope:'studio:run'},null,2));
