import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function text(path: string) {
  return readFileSync(path, 'utf8');
}

const route = text('src/app/api/external/v1/studio/route.ts');
const intake = text('src/lib/studio/external/chatgptAttachmentIntake.ts');
const merge = text('scripts/merge-openapi-studio-attachments.mjs');
const composedMerge = text('scripts/merge-openapi-authenticated-machine.mjs');
const members = text('src/lib/system/access/institutionalMembers.ts');

assert.match(route, /'ingest_analyze'/, 'studio_route_must_expose_ingest_analyze');
assert.match(route, /operation === 'analyze' \|\| operation === 'ingest_analyze'\) return 'studio:run'/, 'attachment_analysis_must_reuse_studio_run_scope');
assert.match(route, /const ownerId = cred\.subjectId/, 'attachment_intake_must_remain_oauth_subject_owned');
assert.match(route, /ingestAndAnalyzeChatGptAudioAttachment/, 'attachment_intake_must_use_bounded_ingest_owner');
assert.match(route, /DECLARED_ANALYSIS_PERMISSION_DOES_NOT_TRANSFER_RIGHTS_OR_PROMOTE_CANON/, 'route_must_publish_authority_boundary');

assert.match(intake, /openaiFileIdRefs/, 'intake_must_require_chatgpt_file_refs');
assert.match(intake, /value\.length !== 1/, 'intake_must_be_single_attachment_bounded');
assert.match(intake, /files\.oaiusercontent\.com/, 'intake_must_allowlist_openai_file_host');
assert.match(intake, /url\.protocol !== 'https:'/, 'intake_must_require_https_attachment_url');
assert.match(intake, /redirect: 'error'/, 'intake_must_reject_redirect_based_ssrf_expansion');
assert.match(intake, /studioAnalysisLimitBytes\('audio'\)/, 'intake_must_enforce_existing_audio_analysis_limit');
assert.match(intake, /prepareStudioSignedUpload/, 'intake_must_reuse_canonical_private_studio_storage');
assert.match(intake, /completeStudioSignedUpload/, 'intake_must_verify_materialization_before_analysis');
assert.match(intake, /analyzeStudioAudioObject/, 'intake_must_reuse_existing_audio_analyzer');
assert.match(intake, /authorizedForAnalysis !== true/, 'intake_must_require_explicit_analysis_authorization');
assert.match(intake, /DECLARATION_ONLY_NOT_RIGHTS_TRANSFER/, 'intake_must_not_convert_permission_declaration_into_rights_fact');
assert.match(intake, /temporaryDownloadUrlPersisted: false/, 'temporary_openai_url_must_not_be_persisted');
assert.match(intake, /rightsTransfer: false/, 'intake_must_not_transfer_rights');
assert.match(intake, /canonicalPromotion: false/, 'intake_must_not_promote_canon');

assert.match(merge, /openaiFileIdRefs/, 'generated_openapi_must_expose_chatgpt_file_parameter');
assert.match(merge, /items: \{ type: 'string' \}/, 'openapi_must_follow_chatgpt_action_file_reference_schema');
assert.match(merge, /analysisAuthorization/, 'generated_openapi_must_request_declared_analysis_authority');
assert.match(merge, /ingest_analyze: 'studio:run'/, 'generated_openapi_must_publish_scope_mapping');
assert.match(merge, /rightsTransfer: false/, 'generated_openapi_must_publish_no_rights_transfer');
assert.match(composedMerge, /import '\.\/merge-openapi-studio-attachments\.mjs'/, 'production_build_must_compose_attachment_openapi');

assert.match(members, /'studio:read'/, 'institutional_operator_must_retain_studio_read');
assert.match(members, /'studio:content'/, 'institutional_operator_must_retain_studio_content');
assert.match(members, /'studio:run'/, 'institutional_operator_must_retain_studio_run');
assert.doesNotMatch(members, /'studio:write'/, 'attachment_fix_must_not_invent_new_oauth_scope');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-CHATGPT-STUDIO-ATTACHMENT-1.0',
  operation: 'ingest_analyze',
  scope: 'studio:run',
  ownerBoundary: 'oauth.subjectId',
  attachmentCount: 1,
  rightsState: 'DECLARED_ANALYSIS_PERMISSION_ONLY',
  canonicalPromotion: false,
}, null, 2));
