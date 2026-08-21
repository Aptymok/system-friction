import { evaluateScoreFrictionCase } from '@/lib/scorefriction/store';
import { buildWorldSpectState } from '@/lib/worldspect/worldspectStateBuilder';

export type StudioObjectKind = 'melody' | 'beat' | 'loop' | 'demo' | 'REM618' | 'reference' | 'client_note' | 'instagram_signal';
export type StudioReportMode = 'real_engine' | 'local_audio_features' | 'local_heuristic' | 'manual_signal' | 'blocked_safe_contract' | 'source_unavailable';
export type StudioFinalState = 'continue' | 'finish_this_week' | 'publish' | 'sell_pitch' | 'collaborate' | 'revise' | 'archive' | 'kill' | 'decision_required';

export type StudioAudioMetadata = {
  fileName?: string | null;
  size?: number | null;
  mime?: string | null;
  duration?: number | null;
};

export type StudioAudioFeatures = {
  sampleRate?: number | null;
  channelCount?: number | null;
  duration?: number | null;
  peak?: number | null;
  rms?: number | null;
  clippingRisk?: number | null;
  silenceStartSeconds?: number | null;
  silenceEndSeconds?: number | null;
  energySegments?: number[];
  dynamicRange?: number | null;
  structureNote?: string | null;
  extractionMode?: 'web_audio' | 'metadata_only' | 'not_available';
};

export type StudioEvaluateInput = {
  object_id: string;
  object_kind: StudioObjectKind;
  project: {
    title: string;
    referenceGenre?: string;
    currentState?: string;
    deadline?: string;
    notes?: string;
    instagramSignal?: string;
  };
  audio_metadata?: StudioAudioMetadata | null;
  audio_features?: StudioAudioFeatures | null;
};

export type StudioPerturbation = {
  title: string;
  why_it_matters: string;
  required_evidence: string;
  exact_action: string;
  suggested_duration: string;
  deadline: string;
  success_condition: string;
  failure_condition: string;
  expected_field_effect: string;
  decision_unlocked: StudioFinalState;
};

type Section<T> = T & { mode: StudioReportMode; human: string; limits: string[] };

export type StudioEvaluationReport = {
  mihm: Section<{
    json: {
      engine: 'MIHM';
      mode: 'real' | 'heuristic' | 'blocked';
      object_id: string;
      object_kind: StudioObjectKind;
      inputs: { audio_metadata: StudioAudioMetadata; audio_features: StudioAudioFeatures; project_metadata: StudioEvaluateInput['project']; notes: string };
      metrics: { IHG: number | null; NTI_obs: number | null; LDI_hours: number | null; PHI_SF: number | null; xi_noise: number | null; coherence: number | null; tension: number | null; latency: number | null };
      regime: 'homeostatic' | 'transition' | 'critical' | 'blocked' | 'unknown';
      interpretation: string;
      limits: string[];
    };
  }>;
  worldspect: Section<{ current_world_summary: string; current_tensions: string[]; degraded_sources: string[]; object_relation: string; perturbation_potential: string; source_state: string }>;
  culturalVector: Section<{ cultural_fit: string; cultural_contrast: string; audience_hypothesis: string; attention_friction_hypothesis: string; instagram_reel_potential: string; rem618_relation: string; placement: 'public' | 'private' | 'client-facing' | 'experimental' | 'archived'; cultural_risk: string; cultural_opportunity: string; scorefriction: unknown }>;
  musicEvaluation: Section<{ identity: string; emotional_direction: string; genre_reference_proximity: string; hook_analysis: string; rhythm_beat_analysis: string; melodic_analysis: string; arrangement_status: string; mix_risk: string; low_end_risk: string; loudness_export_risk: string; structure_energy_evolution: string; duration_form_classification: string; release_readiness: string; portfolio_value: string; client_acquisition_value: string; instagram_reel_value: string; rem618_continuity_value: string; known: string[]; unknown: string[]; missing_evidence: string[] }>;
  conclusion: Section<{ answers: string[]; json: { final_recommendation: StudioFinalState; confidence: number; next_decision_date: string | null; required_evidence_before_closure: string[]; changes_required: string[]; do_not_change: string[]; publication_window: string; client_use: string; rem618_relation: string; portfolio_relation: string } }>;
  perturbations: StudioPerturbation[];
  raw: Record<string, unknown>;
};

export type StudioEvaluateResponse = { ok: true; mode: 'real' | 'partial' | 'blocked'; report: StudioEvaluationReport; blocked: Array<{ section: string; reason: string }> };

function observedAudio(input: StudioEvaluateInput) {
  return input.audio_features?.extractionMode === 'web_audio';
}

function nonNullFeatureEntries(features: StudioAudioFeatures) {
  return Object.entries(features).filter(([, value]) => value !== null && value !== undefined && value !== '');
}

export async function buildStudioEvaluationReport(input: StudioEvaluateInput): Promise<StudioEvaluateResponse> {
  const blocked: Array<{ section: string; reason: string }> = [];
  const features = input.audio_features ?? {};
  const metadata = input.audio_metadata ?? {};
  const hasMeasuredAudio = observedAudio(input) && nonNullFeatureEntries(features).length > 1;

  const culturalCase = await evaluateScoreFrictionCase(input.object_id).catch(() => null);
  if (!culturalCase) blocked.push({ section: 'culturalVector', reason: 'no_persisted_scorefriction_case_evidence_for_object_id' });

  const world = await buildWorldSpectState().catch(() => null);
  const worldObserved = Boolean(world && (world.source_state === 'observed' || world.source_state === 'degraded'));
  if (!worldObserved) blocked.push({ section: 'worldspect', reason: 'worldspect_live_source_unavailable' });

  const mihmLimits = ['Studio does not manufacture MIHM values from metadata. A canonical MIHM engine result must be supplied by the measured analysis path.'];
  blocked.push({ section: 'mihm', reason: 'canonical_mihm_result_not_present_in_studio_input' });
  const mihm: StudioEvaluationReport['mihm'] = {
    mode: 'blocked_safe_contract',
    human: 'MIHM numeric evaluation is not inferred from filenames, tags, deadlines, or locally invented formulas.',
    limits: mihmLimits,
    json: {
      engine: 'MIHM', mode: 'blocked', object_id: input.object_id, object_kind: input.object_kind,
      inputs: { audio_metadata: metadata, audio_features: features, project_metadata: input.project, notes: input.project.notes ?? '' },
      metrics: { IHG: null, NTI_obs: null, LDI_hours: null, PHI_SF: null, xi_noise: null, coherence: null, tension: null, latency: null },
      regime: 'blocked', interpretation: 'Canonical MIHM measurement required.', limits: mihmLimits,
    },
  };

  const worldspect: StudioEvaluationReport['worldspect'] = worldObserved && world ? {
    mode: 'real_engine',
    human: world.relevance_to_sfi,
    limits: world.warnings,
    current_world_summary: `source_state=${world.source_state}; confidence=${world.confidence}; territory=${world.territory}; window=${world.time_window}`,
    current_tensions: world.dominant_external_pressures,
    degraded_sources: world.degraded_sources,
    object_relation: 'No relation to this Studio object is inferred without explicit evidence linking the object to the observed world state.',
    perturbation_potential: 'Undetermined until a governed proposal and return window exist.',
    source_state: world.source_state,
  } : {
    mode: 'source_unavailable', human: 'WorldSpect live state is unavailable.', limits: ['worldspect_live_source_unavailable'],
    current_world_summary: 'not_available', current_tensions: [], degraded_sources: ['worldspect'], object_relation: 'undetermined', perturbation_potential: 'undetermined', source_state: 'missing',
  };

  const culturalVector: StudioEvaluationReport['culturalVector'] = culturalCase ? {
    mode: 'real_engine', human: 'Cultural vector is derived only from persisted ScoreFriction observations for this object id.', limits: [],
    cultural_fit: 'observed_vector_available', cultural_contrast: 'requires explicit comparison target', audience_hypothesis: 'not inferred',
    attention_friction_hypothesis: 'not inferred', instagram_reel_potential: 'not inferred', rem618_relation: 'not inferred', placement: 'experimental',
    cultural_risk: 'requires governed interpretation', cultural_opportunity: 'requires governed interpretation', scorefriction: culturalCase,
  } : {
    mode: 'source_unavailable', human: 'No persisted cultural evidence exists for this object id.', limits: ['no_persisted_scorefriction_case_evidence_for_object_id'],
    cultural_fit: 'undetermined', cultural_contrast: 'undetermined', audience_hypothesis: 'undetermined', attention_friction_hypothesis: 'undetermined',
    instagram_reel_potential: 'undetermined', rem618_relation: 'undetermined', placement: 'experimental', cultural_risk: 'undetermined', cultural_opportunity: 'undetermined', scorefriction: null,
  };

  const known = [
    `object_id=${input.object_id}`,
    `object_kind=${input.object_kind}`,
    `title=${input.project.title}`,
    ...(metadata.fileName ? [`file=${metadata.fileName}`] : []),
    ...(hasMeasuredAudio ? nonNullFeatureEntries(features).map(([key, value]) => `${key}=${Array.isArray(value) ? `[${value.length} values]` : String(value)}`) : []),
  ];
  const missingEvidence = [
    ...(!hasMeasuredAudio ? ['measured_audio_features'] : []),
    'canonical_mihm_result',
    ...(!culturalCase ? ['persisted_scorefriction_evidence'] : []),
    ...(!worldObserved ? ['live_worldspect_state'] : []),
    'governed_proposal_with_return_window',
  ];
  const musicEvaluation: StudioEvaluationReport['musicEvaluation'] = {
    mode: hasMeasuredAudio ? 'local_audio_features' : 'blocked_safe_contract',
    human: hasMeasuredAudio ? 'Measured local audio features are available; no aesthetic or release judgment is inferred from them.' : 'No measured audio feature set is available.',
    limits: ['Aesthetic, hook, mix, market, client, and release judgments require evidence or an explicit AI analysis task with provenance.'],
    identity: input.project.title, emotional_direction: 'undetermined', genre_reference_proximity: 'undetermined', hook_analysis: 'undetermined', rhythm_beat_analysis: 'undetermined', melodic_analysis: 'undetermined', arrangement_status: 'undetermined', mix_risk: 'undetermined', low_end_risk: 'undetermined', loudness_export_risk: 'undetermined', structure_energy_evolution: 'undetermined', duration_form_classification: metadata.duration || features.duration ? String(metadata.duration ?? features.duration) : 'undetermined', release_readiness: 'undetermined', portfolio_value: 'undetermined', client_acquisition_value: 'undetermined', instagram_reel_value: 'undetermined', rem618_continuity_value: 'undetermined', known, unknown: missingEvidence, missing_evidence: missingEvidence,
  };

  const conclusion: StudioEvaluationReport['conclusion'] = {
    mode: 'blocked_safe_contract',
    human: 'No final creative or publication decision is manufactured from incomplete evidence.',
    limits: missingEvidence,
    answers: ['Decision remains open until the required evidence and governed analysis are present.'],
    json: {
      final_recommendation: 'decision_required', confidence: 0, next_decision_date: input.project.deadline ?? null,
      required_evidence_before_closure: missingEvidence, changes_required: [], do_not_change: [], publication_window: 'undetermined', client_use: 'undetermined', rem618_relation: 'undetermined', portfolio_relation: 'undetermined',
    },
  };

  const report: StudioEvaluationReport = {
    mihm, worldspect, culturalVector, musicEvaluation, conclusion, perturbations: [],
    raw: { object_id: input.object_id, measured_audio: hasMeasuredAudio, cultural_case: culturalCase, worldspect: world },
  };

  return { ok: true, mode: blocked.length ? 'blocked' : 'partial', report, blocked };
}
