import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/20260905143000_create_material_audio_rights_registries.sql';
const contractPath = 'src/lib/studio/audio/materialRegistryContract.ts';
const registryPath = 'src/lib/studio/audio/materialRegistry.ts';
const workflowPath = '.github/workflows/sfi-verify.yml';

async function main() {
  const [migration, contract, registry, workflow] = await Promise.all([
    readFile(migrationPath, 'utf8'),
    readFile(contractPath, 'utf8'),
    readFile(registryPath, 'utf8'),
    readFile(workflowPath, 'utf8'),
  ]);

  for (const token of [
    'create table if not exists public.sfi_instruments',
    'create table if not exists public.sfi_cultural_references',
    'source_reference_id uuid references public.sfi_cultural_references(id) on delete restrict',
    'source_rights_at_materialization',
    'current_execution_rights_state',
    'SFI_AUDIO_REGISTRY_DELETE_FORBIDDEN',
    'SFI_AUDIO_INSTRUMENT_IMMUTABLE_AFTER_REGISTRATION',
    'sfi_propagate_cultural_reference_rights_drift',
    'alter table public.sfi_instruments enable row level security',
    'alter table public.sfi_instruments force row level security',
    'alter table public.sfi_cultural_references enable row level security',
    'alter table public.sfi_cultural_references force row level security',
    'SFI_AUDIO_REFERENCE_EXECUTION_RIGHTS_REQUIRED',
    'SFI_AUDIO_PRODUCTION_RIGHTS_REQUIRED',
  ]) {
    assert.ok(migration.includes(token), `audio_rights_migration_missing:${token}`);
  }

  // Durable lineage: no referential action may orphan a derived instrument.
  assert.equal(/source_reference_id[^\n]+on\s+delete\s+set\s+null/i.test(migration), false, 'source_lineage_must_not_set_null_on_delete');
  assert.equal(/references\s+auth\.users\(id\)\s+on\s+delete\s+cascade/i.test(migration), false, 'registry_owner_delete_must_not_cascade_history');
  assert.ok(migration.includes('sfi_instruments_source_snapshot_consistency'), 'historical_source_snapshot_consistency_missing');

  // Rights drift is separate from historical materialization state.
  for (const state of [
    'ELIGIBLE',
    'BLOCKED_SOURCE_RIGHTS',
    'BLOCKED_TARGET_RIGHTS',
    'BLOCKED_NOT_PRODUCTION',
    'BLOCKED_PACKAGE_VERIFICATION',
  ]) {
    assert.ok(migration.includes(`'${state}'`), `current_rights_state_missing:${state}`);
  }
  assert.ok(migration.includes("new.current_execution_rights_state := 'BLOCKED_SOURCE_RIGHTS'"), 'source_revocation_must_block_current_use');
  assert.ok(migration.includes('new.source_rights_at_materialization := source_rights'), 'historical_source_rights_snapshot_missing');

  // RLS is a second fail-closed barrier: authenticated users receive owner-scoped reads only.
  assert.ok(migration.includes('revoke all on public.sfi_instruments from authenticated'), 'instrument_authenticated_revoke_missing');
  assert.ok(migration.includes('revoke all on public.sfi_cultural_references from authenticated'), 'reference_authenticated_revoke_missing');
  assert.ok(migration.includes('grant select on public.sfi_instruments to authenticated'), 'instrument_owner_read_grant_missing');
  assert.ok(migration.includes('grant select on public.sfi_cultural_references to authenticated'), 'reference_owner_read_grant_missing');
  assert.equal(/grant\s+(?:select\s*,\s*)?(insert|update|delete)/i.test(migration), false, 'authenticated_direct_dml_grant_forbidden');
  assert.equal(/create\s+policy\s+sfi_instruments_owner_(insert|update|delete)/i.test(migration), false, 'instrument_mutation_rls_policy_forbidden');
  assert.equal(/create\s+policy\s+sfi_cultural_references_owner_(insert|update|delete)/i.test(migration), false, 'reference_mutation_rls_policy_forbidden');
  assert.equal((migration.match(/create\s+policy\s+/gi) ?? []).length, 2, 'only_owner_select_policies_are_allowed');

  // Direct and privileged mutation still cannot erase history or bypass rights checks.
  assert.ok(migration.includes('before delete on public.sfi_cultural_references'), 'reference_delete_guard_missing');
  assert.ok(migration.includes('before delete on public.sfi_instruments'), 'instrument_delete_guard_missing');
  assert.ok(migration.includes('before update on public.sfi_cultural_references'), 'reference_update_guard_missing');
  assert.ok(migration.includes('before insert or update on public.sfi_instruments'), 'instrument_rights_guard_missing');
  assert.ok(migration.includes('SFI_AUDIO_RIGHTS_REVISION_EVIDENCE_REQUIRED'), 'rights_revision_evidence_guard_missing');

  // No raw audio persistence or storage expansion.
  assert.equal(/\bbytea\b/i.test(migration), false, 'raw_audio_bytea_must_not_be_persisted');
  assert.equal(/\bstorage\./i.test(migration), false, 'audio_storage_owner_must_not_be_created');
  assert.equal(/create\s+(?:table|bucket)[^;]*(audio|sample|media).*bytes/i.test(migration), false, 'raw_audio_storage_structure_forbidden');

  for (const state of [
    'UNKNOWN',
    'OBSERVATION_ONLY',
    'EXECUTION_ALLOWED',
    'DERIVATIVE_ALLOWED',
    'PUBLICATION_ALLOWED',
    'RESTRICTED',
  ]) {
    assert.ok(contract.includes(`'${state}'`), `rights_state_missing:${state}`);
  }

  for (const token of [
    "SFI_AUDIO_RIGHTS_SEPARATION_CONTRACT = 'SFI-AUDIO-RIGHTS-SEPARATION-1.0'",
    'SFI_MATERIAL_RIGHTS_ELIGIBILITY_IS_NOT_AUTHORITY',
    'assertNoRawAudioPersistence',
    'assertReferenceMaterializationAllowed',
    'rightsAllowExecutableMaterialization',
    'deriveCurrentMaterialExecutionEligibility',
    'assertCurrentMaterialExecutionEligible',
    'assertCulturalReferenceRightsRevisionInput',
  ]) {
    assert.ok(contract.includes(token), `audio_rights_contract_missing:${token}`);
  }

  // Mutations are server-only and require the pre-existing Founder gate; this slice grants no new ROOT/CANON/publication/execution authority.
  for (const token of [
    "import 'server-only'",
    'requireFounder',
    'createServiceSupabaseClient',
    "from('sfi_instruments')",
    "from('sfi_cultural_references')",
    'registerSfiInstrument',
    'registerSfiCulturalReference',
    'reviseSfiCulturalReferenceRights',
    'assertSfiInstrumentCurrentMaterialRightsEligible',
    'listSfiInstruments',
    'listSfiCulturalReferences',
  ]) {
    assert.ok(registry.includes(token), `audio_registry_owner_missing:${token}`);
  }
  assert.ok(registry.includes('governedRegistryMutationContext'), 'server_governed_writer_context_missing');
  assert.equal(registry.includes('SUPABASE_SERVICE_ROLE_KEY'), false, 'audio_registry_must_not_expose_service_role_secret');
  assert.equal(/grant\s+.*\b(root|canon|publication|execute)\b/i.test(migration), false, 'registry_migration_must_not_grant_institutional_authority');

  assert.ok(workflow.includes('SFI-AUDIO-RIGHTS-SEPARATION-1.0'), 'sfi_verify_audio_rights_gate_missing');
  assert.ok(workflow.includes('qa-sfi-audio-rights-separation.ts'), 'sfi_verify_audio_rights_script_missing');

  console.log(JSON.stringify({
    contract: 'SFI-AUDIO-RIGHTS-SEPARATION-1.0',
    status: 'PASS',
    instrumentOwner: 'public.sfi_instruments',
    culturalReferenceOwner: 'public.sfi_cultural_references',
    invariant: 'INSTRUMENT BANK != CULTURAL REFERENCE BANK',
    sourceDeletePolicy: 'RESTRICT + DELETE_GUARD',
    sourceLineageImmutable: true,
    sourceRightsSnapshotAtMaterialization: true,
    sourceRightsDriftRechecked: true,
    authenticatedDirectDml: false,
    authenticatedOwnerReadOnly: true,
    authoritativeWriter: 'SERVER_ONLY_EXISTING_FOUNDER_GATE',
    materialRightsEligibilityIsInstitutionalAuthority: false,
    rawAudioDurablePersistence: false,
    browserServiceRole: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
