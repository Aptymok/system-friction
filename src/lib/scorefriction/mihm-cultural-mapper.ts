type VectorSet = {
  acoustic_vector: Record<string, number>;
  semantic_vector: Record<string, number>;
  memetic_vector: Record<string, number>;
  platform_vector: Record<string, number>;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function n(vector: Record<string, number>, key: string) {
  return typeof vector[key] === 'number' ? vector[key] : 0;
}

export function mapMihmCulturalVector(vectors: VectorSet) {
  const semanticDensity = n(vectors.semantic_vector, 'semantic_density');
  const lexicalDiversity = n(vectors.semantic_vector, 'lexical_diversity');
  const repetitionLoad = n(vectors.semantic_vector, 'repetition_load');
  const fragmentability = n(vectors.memetic_vector, 'fragmentability_score');
  const ritualization = n(vectors.memetic_vector, 'ritualization_index');
  const reception = n(vectors.platform_vector, 'public_reception_vector');
  const identity = n(vectors.platform_vector, 'identity_resonance_score');
  const underground = n(vectors.platform_vector, 'underground_signal_strength');
  const conflict = n(vectors.platform_vector, 'comment_conflict_score');
  const acousticPresence = n(vectors.acoustic_vector, 'waveform_presence');

  return {
    NTI_C: clamp01((semanticDensity * 0.35) + (identity * 0.35) + (reception * 0.3)),
    IHG_C: clamp01((lexicalDiversity * 0.3) + (identity * 0.25) + ((1 - conflict) * 0.25) + (acousticPresence * 0.2)),
    ICE_C: clamp01((semanticDensity * 0.25) + (ritualization * 0.25) + (reception * 0.25) + (underground * 0.25)),
    CRM_C: clamp01((identity * 0.3) + (ritualization * 0.25) + (fragmentability * 0.2) + ((1 - conflict) * 0.25)),
    FS_C: clamp01((conflict * 0.35) + (repetitionLoad * 0.25) + (underground * 0.2) + (fragmentability * 0.2)),
    LCP: clamp01((underground * 0.4) + (semanticDensity * 0.2) + (conflict * 0.2) + (fragmentability * 0.2)),
    PAC: clamp01((identity * 0.25) + (semanticDensity * 0.25) + (ritualization * 0.25) + (reception * 0.25)),
    VFE: clamp01((fragmentability * 0.55) + (ritualization * 0.3) + (reception * 0.15)),
    SCR: clamp01((semanticDensity * 0.45) + (repetitionLoad * 0.35) + (fragmentability * 0.2)),
  };
}
