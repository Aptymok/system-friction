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

assert.match(route, /'ingest_analyze'/, 'studio_route_must_expose_ingest_analyze');
assert.match(route, /operation === 'analyze' \|\| operation === 'ingest_analyze'\) return 'studio:run'/, 'attachment_analysis_must_reuse_studio_run_scope');
assert.match(route, /const ownerId = cred\.subjectId/, 'attachment_intake_must_remain_oauth_subject_owned');
assert.match(route, /ingestAndAnalyzeChatGptAudioAttachment/, 'attachment_intake_must_use_bounded_ingest_owner');
assert.match(route, /DECLARED_ANALYSIS_PERMISSION_DOES_NOT_TRANSFER_RIGHTS_OR_PROMOTE_CANON/, 'route_must_publish_authority_boundary');

for (const token of [
  'openaiFileIdRefs',
  'value.length !== 1',
  'files.oaiusercontent.com',
  "url.protocol !== 'https:'",
  "redirect: 'error'",
  "studioAnalysisLimitBytes('audio')",
  "descriptor.modality !== 'audio'",
  'assertAudioEvidenceConsistent',
  'OPENAI_FILE_EVIDENCE_CONFLICT',
  'resolveExistingIntake',
  "metadata->externalIntake->>openaiFileId",
  'OPENAI_FILE_INTAKE_CONFLICT',
  'metadata: { externalIntake }',
  'SFI-CHATGPT-STUDIO-ATTACHMENT-1.1',
  'completeStudioSignedUpload',
  'analyzeStudioAudioObject',
  'authorizedForAnalysis !== true',
  'DECLARATION_ONLY_NOT_RIGHTS_TRANSFER',
  'temporaryDownloadUrlPersisted: false',
  'rightsTransfer: false',
  'canonicalPromotion: false',
]) assert.ok(intake.includes(token), `intake_contract_missing:${token}`);
assert.doesNotMatch(intake, /requestedObjectType:\s*'audio'/, 'intake_must_not_force_non_audio_evidence_into_music');

assert.match(idempotencyMigration, /create unique index if not exists studio_objects_owner_external_intake_file_uidx/i, 'owner_file_unique_index_required');
assert.match(idempotencyMigration, /owner_id,[\s\S]*metadata #>> '\{externalIntake,openaiFileId\}'/, 'idempotency_must_bind_owner_plus_openai_file_id');
assert.doesNotMatch(idempotencyMigration, /create table/i, 'idempotency_must_reuse_existing_studio_objects_owner');

assert.match(storage, /metadata\?: Row/, 'canonical_storage_must_accept_initial_admission_metadata');
assert.match(storage, /\.\.\.asRow\(input\.metadata\)/, 'initial_admission_metadata_must_be_merged_with_descriptor_lineage');
const objectUpdateIndex = storage.indexOf('const objectUpdate = await supabase');
const storedUpdateIndex = storage.indexOf(".update({ status: 'stored'");
assert.ok(objectUpdateIndex >= 0 && storedUpdateIndex > objectUpdateIndex, 'object_lineage_must_be_durable_before_upload_becomes_stored');
assert.match(storage, /\.eq\('status', 'stored'\)/, 'content_loaders_must_require_stored_publication_state');

assert.match(manifest, /studio-ingest-analyze|ingest_analyze/, 'gateway_manifest_must_discover_attachment_intake');
assert.match(manifest, /studioAttachmentPersistence|OWNER_SCOPED|owner-scoped/i, 'gateway_manifest_must_disclose_private_owner_scoped_raw_attachment_persistence');

for (const token of ['openaiFileIdRefs', 'analysisAuthorization', "ingest_analyze: 'studio:run'", 'rightsTransfer: false', 'SFI-CHATGPT-STUDIO-ATTACHMENT-1.1']) {
  assert.ok(merge.includes(token), `attachment_openapi_missing:${token}`);
}
assert.match(composedMerge, /import '\.\/merge-openapi-studio-attachments\.mjs'/, 'production_build_must_compose_attachment_openapi');
assert.match(composedMerge, /await import\('\.\/merge-openapi-actions-compat\.mjs'\)/, 'actions_projection_must_be_generated_after_canonical_machine_openapi');

for (const token of [
  "const canonicalPath = path.join(process.cwd(), 'public', 'openapi.json')",
  "const actionsPath = path.join(process.cwd(), 'public', 'openapi-actions.json')",
  'structuredClone(canonical)',
  'maxOperationDescriptionChars: 300',
  "parameter?.in !== 'header'",
  'capabilityGrantNonceStillRequiredByMcpRuntimeForExecutableToolsCall: true',
  'SFI_CANONICAL_OPENAPI_MCP_NONCE_PARAMETER_MISSING',
  "fs.writeFileSync(actionsPath",
]) assert.ok(actionsCompat.includes(token), `actions_projection_missing:${token}`);
assert.doesNotMatch(actionsCompat, /fs\.writeFileSync\(canonicalPath/, 'actions_projection_must_not_mutate_canonical_openapi');

assert.match(workflow, /qa-sfi-chatgpt-studio-attachment\.ts/, 'attachment_qa_must_be_wired_into_ci');
assert.match(workflow, /merge-openapi-authenticated-machine\.mjs/, 'ci_must_materialize_both_openapi_projections_before_attachment_qa');

assert.match(members, /'studio:read'/, 'institutional_operator_must_retain_studio_read');
assert.match(members, /'studio:content'/, 'institutional_operator_must_retain_studio_content');
assert.match(members, /'studio:run'/, 'institutional_operator_must_retain_studio_run');
assert.doesNotMatch(members, /'studio:write'/, 'attachment_fix_must_not_invent_new_oauth_scope');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-CHATGPT-STUDIO-ATTACHMENT-1.1',
  operation: 'ingest_analyze',
  scope: 'studio:run',
  ownerBoundary: 'oauth.subjectId',
  attachmentCount: 1,
  modalityAdmission: 'CONSISTENT_EVIDENCE_FAIL_CLOSED',
  idempotency: 'OWNER_ID_PLUS_OPENAI_FILE_ID_UNIQUE',
  provenanceAdmission: 'PERSIST_BEFORE_BINARY_PUBLICATION',
  storedPublicationOrder: 'OBJECT_LINEAGE_THEN_UPLOAD_STORED',
  rightsState: 'DECLARED_ANALYSIS_PERMISSION_ONLY',
  canonicalPromotion: false,
  canonicalOpenApi: '/openapi.json',
  actionsOpenApi: '/openapi-actions.json',
  actionsCompatibility: 'SFI-GPT-ACTIONS-OPENAPI-COMPAT-1.0',
}, null, 2));
