import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function text(path: string) {
  return readFileSync(path, 'utf8');
}

const route = text('src/app/api/external/v1/studio/route.ts');
const intake = text('src/lib/studio/external/chatgptAttachmentIntake.ts');
const storage = text('src/lib/studio/multimodal/storage.ts');
const manifest = text('src/app/api/external/v1/manifest/route.ts');
const merge = text('scripts/merge-openapi-studio-attachments.mjs');
const composedMerge = text('scripts/merge-openapi-authenticated-machine.mjs');
const actionsCompat = text('scripts/merge-openapi-actions-compat.mjs');
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
assert.match(intake, /descriptor\.modality !== 'audio'/, 'intake_must_detect_and_reject_non_audio_before_persistence');
assert.doesNotMatch(intake, /requestedObjectType:\s*'audio'/, 'intake_must_not_force_non_audio_evidence_into_music');
assert.match(intake, /metadata: \{ externalIntake \}/, 'intake_provenance_must_be_part_of_initial_object_admission');
assert.match(intake, /SFI-CHATGPT-STUDIO-ATTACHMENT-1\.1/, 'intake_must_publish_current_attachment_contract');
assert.match(intake, /completeStudioSignedUpload/, 'intake_must_verify_materialization_before_analysis');
assert.match(intake, /analyzeStudioAudioObject/, 'intake_must_reuse_existing_audio_analyzer');
assert.match(intake, /authorizedForAnalysis !== true/, 'intake_must_require_explicit_analysis_authorization');
assert.match(intake, /DECLARATION_ONLY_NOT_RIGHTS_TRANSFER/, 'intake_must_not_convert_permission_declaration_into_rights_fact');
assert.match(intake, /temporaryDownloadUrlPersisted: false/, 'temporary_openai_url_must_not_be_persisted');
assert.doesNotMatch(intake, /provenancePersisted: false|materializationUsable: false/, 'intake_must_not_claim_cleanup_state_without_verified_cleanup');
assert.match(intake, /rightsTransfer: false/, 'intake_must_not_transfer_rights');
assert.match(intake, /canonicalPromotion: false/, 'intake_must_not_promote_canon');

assert.match(storage, /metadata\?: Row/, 'canonical_storage_must_accept_initial_admission_metadata');
assert.match(storage, /\.\.\.asRow\(input\.metadata\)/, 'initial_admission_metadata_must_be_merged_with_descriptor_lineage');
const objectUpdateIndex = storage.indexOf("const objectUpdate = await supabase");
const storedUpdateIndex = storage.indexOf(".update({ status: 'stored'");
assert.ok(objectUpdateIndex >= 0 && storedUpdateIndex > objectUpdateIndex, 'object_lineage_must_be_durable_before_upload_becomes_stored');
assert.match(storage, /\.eq\('status', 'stored'\)/, 'content_loaders_must_require_stored_publication_state');

assert.match(manifest, /studio-ingest-analyze|ingest_analyze/, 'gateway_manifest_must_discover_attachment_intake');
assert.match(manifest, /studioAttachmentPersistence|OWNER_SCOPED|owner-scoped/i, 'gateway_manifest_must_disclose_private_owner_scoped_raw_attachment_persistence');

assert.match(merge, /openaiFileIdRefs/, 'generated_openapi_must_expose_chatgpt_file_parameter');
assert.match(merge, /items: \{ type: 'string' \}/, 'openapi_must_follow_chatgpt_action_file_reference_schema');
assert.match(merge, /analysisAuthorization/, 'generated_openapi_must_request_declared_analysis_authority');
assert.match(merge, /ingest_analyze: 'studio:run'/, 'generated_openapi_must_publish_scope_mapping');
assert.match(merge, /rightsTransfer: false/, 'generated_openapi_must_publish_no_rights_transfer');
assert.match(composedMerge, /import '\.\/merge-openapi-studio-attachments\.mjs'/, 'production_build_must_compose_attachment_openapi');
assert.match(composedMerge, /await import\('\.\/merge-openapi-actions-compat\.mjs'\)/, 'actions_compat_projection_must_run_last');

assert.match(actionsCompat, /maxOperationDescriptionChars: 300/, 'actions_projection_must_publish_description_limit');
assert.match(actionsCompat, /operation\.description\.length > 300/, 'actions_projection_must_enforce_description_limit');
assert.match(actionsCompat, /parameter\?\.in !== 'header'/, 'actions_projection_must_remove_unsupported_header_parameters');
assert.match(actionsCompat, /capabilityGrantNonceStillRequiredByMcpRuntimeForExecutableToolsCall: true/, 'actions_projection_must_preserve_runtime_nonce_requirement');
assert.match(actionsCompat, /properties:\s*\{[\s\S]*jsonrpc:/, 'mcp_actions_response_schema_must_have_properties');
assert.match(actionsCompat, /SFI_ACTIONS_OPENAPI_COMPAT_FAILED/, 'actions_projection_must_fail_closed_on_remaining_parser_incompatibilities');

assert.match(members, /'studio:read'/, 'institutional_operator_must_retain_studio_read');
assert.match(members, /'studio:content'/, 'institutional_operator_must_retain_studio_content');
assert.match(members, /'studio:run'/, 'institutional_operator_must_retain_studio_run');
assert.doesNotMatch(members, /'studio:write'/, 'attachment_fix_must_not_invent_new_oauth_scope');

console.log(JSON.stringify({
  ok: true,
  contract: 'SFI-CHATGPT-STUDIO-ATTACHMENT-1.3',
  operation: 'ingest_analyze',
  scope: 'studio:run',
  ownerBoundary: 'oauth.subjectId',
  attachmentCount: 1,
  modalityAdmission: 'EVIDENCE_FIRST_FAIL_CLOSED',
  provenanceAdmission: 'PERSIST_BEFORE_BINARY_PUBLICATION',
  storedPublicationOrder: 'OBJECT_LINEAGE_THEN_UPLOAD_STORED',
  rightsState: 'DECLARED_ANALYSIS_PERMISSION_ONLY',
  canonicalPromotion: false,
  actionsCompatibility: 'SFI-GPT-ACTIONS-OPENAPI-COMPAT-1.0',
}, null, 2));
