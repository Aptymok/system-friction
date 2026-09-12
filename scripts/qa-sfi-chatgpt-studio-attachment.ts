import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const text = (path: string) => readFileSync(path, 'utf8');
const route = text('src/app/api/external/v1/studio/route.ts');
const intake = text('src/lib/studio/external/chatgptAttachmentIntake.ts');
const storage = text('src/lib/studio/multimodal/storage.ts');
const manifest = text('src/app/api/external/v1/manifest/route.ts');
const merge = text('scripts/merge-openapi-studio-attachments.mjs');
const composedMerge = text('scripts/merge-openapi-authenticated-machine.mjs');
const actionsCompat = text('scripts/merge-openapi-actions-compat.mjs');
const members = text('src/lib/system/access/institutionalMembers.ts');
const workflow = text('.github/workflows/sfi-external-oauth.yml');
const idempotencyMigration = text('supabase/migrations/20260908094500_studio_external_intake_idempotency.sql');

assert.match(route, /'ingest_analyze'/);
assert.match(route, /operation === 'analyze' \|\| operation === 'ingest_analyze' \|\| operation === 'produce'\) return 'studio:run'/);
assert.match(route, /const ownerId = cred\.subjectId/);
assert.match(route, /DECLARED_ANALYSIS_PERMISSION_DOES_NOT_TRANSFER_RIGHTS_OR_PROMOTE_CANON/);

for (const token of [
  'openaiFileIdRefs','value.length !== 1','files.oaiusercontent.com',"url.protocol !== 'https:'","redirect: 'error'","studioAnalysisLimitBytes('audio')",
  "descriptor.modality !== 'audio'",'assertAudioEvidenceConsistent','OPENAI_FILE_EVIDENCE_CONFLICT','resolveExistingIntake',"metadata->externalIntake->>openaiFileId",
  'OPENAI_FILE_INTAKE_CONFLICT','analysisAuthorizationHistory','SFI-CHATGPT-STUDIO-ATTACHMENT-1.1','completeStudioSignedUpload','analyzeStudioAudioObject',
  'authorizedForAnalysis !== true','DECLARATION_ONLY_NOT_RIGHTS_TRANSFER','temporaryDownloadUrlPersisted: false','rightsTransfer: false','canonicalPromotion: false',
  "state: 'FAILED'",'resumeFailedIntake','assertNoActiveAnalysis',".in('status', ['queued', 'running'])",'persistRetryAuthorization',
]) assert.ok(intake.includes(token), `intake_contract_missing:${token}`);
assert.doesNotMatch(intake, /requestedObjectType:\s*'audio'/);
assert.match(intake, /metadata:\s*\{\s*externalIntake,\s*analysisAuthorizationHistory:/, 'initial_intake_must_persist_authorization_history');

assert.match(idempotencyMigration, /create unique index if not exists studio_objects_owner_external_intake_file_uidx/i);
assert.match(idempotencyMigration, /owner_id,[\s\S]*metadata #>> '\{externalIntake,openaiFileId\}'/);
assert.doesNotMatch(idempotencyMigration, /create table/i);

assert.match(storage, /metadata\?: Row/);
assert.match(storage, /\.\.\.asRow\(input\.metadata\)/);
const objectUpdateIndex = storage.indexOf('const objectUpdate = await supabase');
const storedUpdateIndex = storage.indexOf(".update({ status: 'stored'");
assert.ok(objectUpdateIndex >= 0 && storedUpdateIndex > objectUpdateIndex);
assert.match(storage, /\.eq\('status', 'stored'\)/);

assert.match(manifest, /studio-ingest-analyze|ingest_analyze/);
assert.match(manifest, /studioAttachmentPersistence|OWNER_SCOPED|owner-scoped/i);
for (const token of ['openaiFileIdRefs','analysisAuthorization','SFI-CHATGPT-STUDIO-ATTACHMENT-1.1']) assert.ok(merge.includes(token));
assert.match(merge, /ingest_analyze\s*:\s*'studio:run'/);
assert.match(merge, /rightsTransfer\s*:\s*false/);
assert.match(composedMerge, /import '\.\/merge-openapi-studio-attachments\.mjs'/);
assert.match(composedMerge, /await import\('\.\/merge-openapi-actions-compat\.mjs'\)/);
for (const token of [
  "const canonicalPath = path.join(process.cwd(), 'public', 'openapi.json')",
  "const actionsPath = path.join(process.cwd(), 'public', 'openapi-actions.json')",
  'structuredClone(canonical)',
  'maxOperationDescriptionChars: 300',
  "delete api.security",
  "delete api.components.securitySchemes.sfiOAuth",
  "if (!route.startsWith('/api/external/v1/')) delete api.paths[route]",
  "delete operation.security",
  "authTransportOwner: 'GPT_ACTION_EDITOR_OAUTH'",
  'openApiOAuthDeclarationsExcluded: true',
  'mcpExcluded: true',
  'SFI_CANONICAL_OPENAPI_MCP_NONCE_PARAMETER_MISSING',
  'SFI_CANONICAL_OPENAPI_OAUTH_SCHEME_MISSING',
  "fs.writeFileSync(actionsPath",
]) assert.ok(actionsCompat.includes(token), `actions_projection_contract_missing:${token}`);
assert.doesNotMatch(actionsCompat, /fs\.writeFileSync\(canonicalPath/);
assert.match(workflow, /qa-sfi-chatgpt-studio-attachment\.ts/);
assert.match(workflow, /merge-openapi-authenticated-machine\.mjs/);
for (const scope of ["'studio:read'", "'studio:content'", "'studio:run'"]) assert.ok(members.includes(scope), `institutional_member_scope_missing:${scope}`);
assert.ok(!members.includes("'studio:write'"), 'institutional_member_scope_must_not_expand:studio:write');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-CHATGPT-STUDIO-ATTACHMENT-1.2',
  operation: 'ingest_analyze',
  compatibleSiblingOperation: 'produce',
  scope: 'studio:run',
  ownerBoundary: 'oauth.subjectId',
  attachmentCount: 1,
  modalityAdmission: 'CONSISTENT_EVIDENCE_FAIL_CLOSED',
  idempotency: 'OWNER_ID_PLUS_OPENAI_FILE_ID_UNIQUE',
  failedReservationRecovery: 'SAME_RESERVATION_RESUMABLE',
  activeAnalysisSerialization: 'QUEUED_OR_RUNNING_CONFLICT',
  retryAuthorizationLineage: 'DURABLE_HISTORY',
  canonicalPromotion: false,
  canonicalOpenApi: '/openapi.json',
  actionsOpenApi: '/openapi-actions.json',
  actionsAuthTransportOwner: 'GPT_ACTION_EDITOR_OAUTH',
  actionsCompatibility: 'SFI-GPT-ACTIONS-OPENAPI-COMPAT-1.2',
}, null, 2));