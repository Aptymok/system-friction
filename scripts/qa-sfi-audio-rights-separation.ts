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
    'source_reference_id uuid references public.sfi_cultural_references(id)',
    'alter table public.sfi_instruments enable row level security',
    'alter table public.sfi_cultural_references enable row level security',
    'SFI_AUDIO_REFERENCE_EXECUTION_RIGHTS_REQUIRED',
    'SFI_AUDIO_PRODUCTION_RIGHTS_REQUIRED',
  ]) {
    assert.ok(migration.includes(token), `audio_rights_migration_missing:${token}`);
  }

  assert.equal(/\bbytea\b/i.test(migration), false, 'raw_audio_bytea_must_not_be_persisted');
  assert.equal(/create\s+policy\s+sfi_instruments_owner_(select|insert|update|delete)/i.test(migration), true, 'instrument_rls_policies_missing');
  assert.equal(/create\s+policy\s+sfi_cultural_references_owner_(select|insert|update|delete)/i.test(migration), true, 'reference_rls_policies_missing');

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
    'assertNoRawAudioPersistence',
    'assertReferenceMaterializationAllowed',
    'rightsAllowExecutableMaterialization',
  ]) {
    assert.ok(contract.includes(token), `audio_rights_contract_missing:${token}`);
  }

  for (const token of [
    "from('sfi_instruments')",
    "from('sfi_cultural_references')",
    'createServerSupabaseClient',
    'getVerifiedServerUser',
    'registerSfiInstrument',
    'registerSfiCulturalReference',
    'listSfiInstruments',
    'listSfiCulturalReferences',
  ]) {
    assert.ok(registry.includes(token), `audio_registry_owner_missing:${token}`);
  }

  assert.equal(registry.includes('createServiceSupabaseClient'), false, 'audio_registry_must_not_use_service_role_writer');
  assert.equal(registry.includes('SUPABASE_SERVICE_ROLE_KEY'), false, 'audio_registry_must_not_expose_service_role_secret');
  assert.ok(workflow.includes('SFI-AUDIO-RIGHTS-SEPARATION-1.0'), 'sfi_verify_audio_rights_gate_missing');
  assert.ok(workflow.includes('qa-sfi-audio-rights-separation.ts'), 'sfi_verify_audio_rights_script_missing');

  console.log(JSON.stringify({
    contract: 'SFI-AUDIO-RIGHTS-SEPARATION-1.0',
    status: 'PASS',
    instrumentOwner: 'public.sfi_instruments',
    culturalReferenceOwner: 'public.sfi_cultural_references',
    rawAudioDurablePersistence: false,
    browserServiceRole: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
