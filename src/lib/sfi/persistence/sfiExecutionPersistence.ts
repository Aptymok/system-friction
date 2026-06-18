import { createServiceSupabaseClient } from '@/runtime/supabase/server';

type AnyRecord = Record<string, any>;

const EMPTY_STATE = {
  perturbations: [],
  capabilityChecks: [],
  ledgerEntries: [],
  mediaAssets: [],
  outcomes: [],
  lessons: [],
};

function mapAssetToCapability(asset: string): string {
  const map: Record<string, string> = {
    image: 'media_image_generation',
    video: 'media_video_generation',
    audio: 'audio_generation',
    text: 'narrative_generation',
    markdown: 'editorial_packaging',
    json: 'structured_export',
  };
  return map[asset] ?? asset;
}

export async function readSfiExecutionState(caseId: string) {
  try {
    const supabase = createServiceSupabaseClient();

    const [perturbations, capabilityChecks, ledgerEntries, mediaAssets, outcomes, lessons] =
      await Promise.all([
        supabase.from('sfi_field_perturbations').select('*').eq('case_id', caseId).order('created_at', { ascending: false }),
        supabase.from('sfi_capability_checks').select('*').eq('case_id', caseId).order('created_at', { ascending: false }),
        supabase.from('sfi_execution_ledger').select('*').eq('case_id', caseId).order('created_at', { ascending: false }),
        supabase.from('sfi_media_assets').select('*').eq('case_id', caseId).order('created_at', { ascending: false }),
        supabase.from('sfi_outcomes').select('*').eq('case_id', caseId).order('created_at', { ascending: false }),
        supabase.from('sfi_lessons').select('*').eq('case_id', caseId).order('created_at', { ascending: false }),
      ]);

    const firstError =
      perturbations.error ||
      capabilityChecks.error ||
      ledgerEntries.error ||
      mediaAssets.error ||
      outcomes.error ||
      lessons.error;

    if (firstError) throw firstError;

    return {
      ok: true,
      perturbations: perturbations.data ?? [],
      capabilityChecks: capabilityChecks.data ?? [],
      ledgerEntries: ledgerEntries.data ?? [],
      mediaAssets: mediaAssets.data ?? [],
      outcomes: outcomes.data ?? [],
      lessons: lessons.data ?? [],
    };
  } catch (error) {
    console.error('[readSfiExecutionState]', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'execution_state_failed',
      ...EMPTY_STATE,
    };
  }
}

export async function persistSfiPipelineExecution(input: {
  case_id?: string;
  proposal_id?: string | null;
  requested_assets?: string[];
  material?: AnyRecord;
  media?: AnyRecord;
  perturbation_type?: string;
  target_domain?: string;
  minimal_action?: string;
  expected_effect?: string;
  risk_level?: string;
  source_pipeline?: AnyRecord;
}) {
  const caseId = input.case_id || 'SFI-OP-001';
  const requestedAssets = Array.isArray(input.requested_assets) ? input.requested_assets : ['text'];

  const required = requestedAssets.map(mapAssetToCapability);
  const available: string[] = [];

  const material = input.material ?? {};
  const mediaAssets = input.media?.assets ?? input.media ?? {};

  if (material.body || material.report || material.atlas_block) available.push('narrative_generation');
  if (mediaAssets.image?.url) available.push('media_image_generation');
  if (mediaAssets.video?.rendered === true || mediaAssets.video?.url) available.push('media_video_generation');
  if (mediaAssets.audio?.url) available.push('audio_generation');
  if (mediaAssets.markdown?.url) available.push('editorial_packaging');
  if (mediaAssets.json?.url) available.push('structured_export');

  const missing = required.filter((item) => !available.includes(item));
  const capabilityGap = required.length === 0 ? 0 : missing.length / required.length;
  const executable = capabilityGap <= 0.34;

  let perturbation_id: string | null = null;
  let capability_check_id: string | null = null;
  let execution_id: string | null = null;

  try {
    const supabase = createServiceSupabaseClient();

    // 1. Insertar perturbación
    console.log('[persist] Inserting perturbation for case', caseId);
    const perturbation = await supabase
      .from('sfi_field_perturbations')
      .insert({
        case_id: caseId,
        proposal_id: input.proposal_id ?? null,
        perturbation_type: input.perturbation_type ?? 'campaign',
        target_domain: input.target_domain ?? 'general',
        minimal_action: input.minimal_action ?? 'generate_material',
        expected_effect: input.expected_effect ?? null,
        risk_level: input.risk_level ?? 'medium',
        status: 'active',
        source_pipeline: input.source_pipeline ?? {},
      })
      .select('id')
      .single();

    if (perturbation.error) {
      console.error('[persist] Perturbation insert error', perturbation.error);
      throw perturbation.error;
    }
    perturbation_id = perturbation.data.id;
    console.log('[persist] Perturbation created:', perturbation_id);

    // 2. Insertar capability check
    const capability = await supabase
      .from('sfi_capability_checks')
      .insert({
        perturbation_id,
        case_id: caseId,
        capabilities_required: required,
        capabilities_available: available,
        capabilities_missing: missing,
        capability_gap: capabilityGap,
        executable,
        notes: 'Derived from requested assets and actual generated outputs.',
      })
      .select('id')
      .single();

    if (capability.error) {
      console.error('[persist] Capability insert error', capability.error);
      throw capability.error;
    }
    capability_check_id = capability.data.id;
    console.log('[persist] Capability check created:', capability_check_id);

    // 3. Insertar execution ledger
    const execution = await supabase
      .from('sfi_execution_ledger')
      .insert({
        perturbation_id,
        case_id: caseId,
        actor: 'sfi_run',
        artifact_type: 'campaign_material',
        execution_status: 'pending',
        verification_status: 'unverified',
        source_payload: {
          material_id: material.material_id ?? null,
          title: material.title ?? null,
          requested_assets: requestedAssets,
          required,
          available,
          missing,
        },
      })
      .select('id')
      .single();

    if (execution.error) {
      console.error('[persist] Ledger insert error', execution.error);
      throw execution.error;
    }
    execution_id = execution.data.id;
    console.log('[persist] Execution ledger created:', execution_id);

    return {
      supabaseOk: true,
      perturbation_id,
      capability_check_id,
      execution_id,
      capability_gap: capabilityGap,
      executable,
      error: null,
    };
  } catch (error) {
    console.error('[persist] Caught error:', error);
    let errorMessage = 'pipeline_persistence_failed';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      errorMessage = String(error.message);
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    return {
      supabaseOk: false,
      perturbation_id,
      capability_check_id,
      execution_id,
      capability_gap: capabilityGap,
      executable,
      error: errorMessage,
    };
  }
}

export async function persistSfiMediaAssets(input: {
  case_id?: string;
  provider?: string;
  prompt?: string;
  media?: AnyRecord;
}) {
  const caseId = input.case_id || 'SFI-OP-001';
  const assets = input.media?.assets ?? {};
  const assetTypes = ['image', 'video', 'audio', 'markdown', 'json'] as const;

  const media_asset_ids: string[] = [];
  let all_persisted = true;

  try {
    const supabase = createServiceSupabaseClient();

    for (const assetType of assetTypes) {
      const asset = assets[assetType];
      if (!asset?.url) continue;

      const result = await supabase
        .from('sfi_media_assets')
        .insert({
          case_id: caseId,
          provider_used: asset.provider_used ?? input.media?.provider_used ?? input.provider ?? 'unknown',
          fallback_used: Boolean(asset.fallback_used ?? input.media?.fallback_used ?? false),
          asset_type: assetType,
          file_url: asset.url,
          file_path: asset.filePath ?? asset.file ?? null,
          prompt: asset.prompt ?? input.prompt ?? null,
          source_pipeline: { render: true, timestamp: new Date().toISOString() },
        })
        .select('id')
        .single();

      if (result.error) {
        console.error(`[persistMedia] Failed to insert ${assetType}:`, result.error);
        all_persisted = false;
      } else {
        media_asset_ids.push(result.data.id);
      }
    }

    return { supabaseOk: all_persisted, media_asset_ids, all_persisted };
  } catch (error) {
    console.error('[persistMedia] Caught error:', error);
    return {
      supabaseOk: false,
      media_asset_ids,
      all_persisted: false,
      error: error instanceof Error ? error.message : 'media_asset_persistence_failed',
    };
  }
}