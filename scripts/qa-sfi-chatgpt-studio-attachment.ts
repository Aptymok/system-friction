import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const text = (path: string) => readFileSync(path, 'utf8');
const route = text('src/app/api/external/v1/studio/route.ts');
const studioMcpRoute = text('src/app/api/mcp/studio/route.ts');
const studioMcpServer = text('src/lib/mcp/studioMcpServer.ts');
const capabilityCatalog = text('src/lib/products/capabilityPackageCatalog.ts');
const intake = text('src/lib/studio/external/chatgptAttachmentIntake.ts');
const storage = text('src/lib/studio/multimodal/storage.ts');
const manifest = text('src/app/api/external/v1/manifest/route.ts');
const merge = text('scripts/merge-openapi-studio-attachments.mjs');
const composedMerge = text('scripts/merge-openapi-authenticated-machine.mjs');
const hostBoundOpenapi = text('src/app/api/external/openapi/route.ts');
const members = text('src/lib/system/access/institutionalMembers.ts');
const workflow = text('.github/workflows/sfi-external-oauth.yml');
const idempotencyMigration = text('supabase/migrations/20260908094500_studio_external_intake_idempotency.sql');

assert.match(route, /'ingest_analyze'/);
assert.match(route, /operation === 'analyze' \|\| operation === 'ingest_analyze' \|\| operation === 'produce'\) return 'studio:run'/);
assert.match(route, /const ownerId = cred\.subjectId/);
assert.match(route, /DECLARED_ANALYSIS_PERMISSION_DOES_NOT_TRANSFER_RIGHTS_OR_PROMOTE_CANON/);
assert.match(studioMcpRoute, /POST as canonicalStudioPost/);
assert.match(studioMcpRoute, /\/api\/external\/v1\/studio/);
assert.match(studioMcpRoute, /dispatchStudioMcpRequest/);
assert.match(studioMcpServer, /SFI-STUDIO-MCP-1\.0/);
for (const tool of ['studio_context','studio_list','studio_inspect','studio_features','studio_content','studio_analyze','studio_ingest_analyze','studio_produce']) assert.ok(studioMcpServer.includes(tool), `studio_mcp_tool_missing:${tool}`);
for (const scope of ['studio:read','studio:content','studio:run']) assert.ok(studioMcpServer.includes(scope), `studio_mcp_scope_missing:${scope}`);
assert.match(studioMcpServer, /rightsTransfer:\s*false/);
assert.match(studioMcpServer, /canonicalPromotionAllowed:\s*false/);
assert.match(studioMcpServer, /rootAuthorityInherited:\s*false/);
assert.match(capabilityCatalog, /id: 'sfi-studio'/);
assert.match(capabilityCatalog, /endpoint: '\/api\/mcp\/studio'/);
assert.match(capabilityCatalog, /rootIsProduct:\s*false/);
assert.match(capabilityCatalog, /canonAuthorityForSale:\s*false/);

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
assert.match(composedMerge, /gptActionsSchema: '\/openapi\.json'/);
assert.match(composedMerge, /separateActionsProjection: false/);
assert.match(composedMerge, /delete api\.paths\['\/api\/mcp\/authenticated'\]/);
assert.match(composedMerge, /actionDescriptionLimit = 300/);
assert.match(composedMerge, /parameter\?\.in !== 'header'/);
assert.match(composedMerge, /oauthSecurityDeclared/);
assert.doesNotMatch(composedMerge, /openapi-actions\.json/);
assert.match(hostBoundOpenapi, /sourceDocument from ['"]\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/public\/openapi\.json['"]/);
assert.match(hostBoundOpenapi, /ACTION_DESCRIPTION_LIMIT = 300/);
assert.match(hostBoundOpenapi, /authorizationCode\.authorizationUrl/);
assert.match(hostBoundOpenapi, /authorizationCode\.tokenUrl/);
assert.match(workflow, /qa-sfi-chatgpt-studio-attachment\.ts/);
assert.match(workflow, /merge-openapi-authenticated-machine\.mjs/);
for (const scope of ["'studio:read'", "'studio:content'", "'studio:run'"]) assert.ok(members.includes(scope), `institutional_member_scope_missing:${scope}`);
assert.ok(!members.includes("'studio:write'"), 'institutional_member_scope_must_not_expand:studio:write');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-CHATGPT-STUDIO-ATTACHMENT-1.3',
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
  gptActionsOpenApi: '/openapi.json',
  separateActionsProjection: false,
  authenticatedMcpOpenApiExposure: 'OUT_OF_BAND_MCP',
  studioMcp: '/api/mcp/studio',
  capabilityPackage: 'sfi-studio',
}, null, 2));