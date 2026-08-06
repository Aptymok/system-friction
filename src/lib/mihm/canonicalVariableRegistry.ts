import type { MihmMethodId } from './methodSelectionContract';

export type CanonicalVariableId =
  | 'IHG'
  | 'NTI'
  | 'LDI'
  | 'XI'
  | 'PHI_H'
  | 'PHI_S'
  | 'PHI_F'
  | 'PHI_W'
  | 'PHI_SFI'
  | 'F_S'
  | 'C_FIELD'
  | 'PPOI_COMPOSITE'
  | 'WSI'
  | 'REDUCED_KERNEL_CONTINUITY';

export type VariableAliasClass =
  | 'CANONICAL'
  | 'DIRECT_ALIAS'
  | 'CONTEXTUAL_ALIAS'
  | 'HISTORICAL_ONLY'
  | 'PROHIBITED'
  | 'UNKNOWN';

export type VariableContext = {
  methodId?: MihmMethodId | null;
  objectType?: 'PERSON' | 'SESSION' | 'BOUNDED_SYSTEM' | 'ARTIFACT' | 'SIGNAL' | 'PHENOMENON' | 'WORLD_CONTEXT' | 'SFI_INSTITUTION' | null;
};

export type CanonicalVariableDefinition = {
  id: CanonicalVariableId;
  scale: '0-1' | '0-5' | 'hours' | 'unitless';
  methods: MihmMethodId[];
  description: string;
};

export const CANONICAL_VARIABLE_REGISTRY: Record<CanonicalVariableId, CanonicalVariableDefinition> = {
  IHG: { id: 'IHG', scale: '0-1', methods: ['MOP_H', 'SCOREFRICTION', 'SFI_INSTITUTIONAL'], description: 'Integrity or homeostatic integrity within the declared method and object.' },
  NTI: { id: 'NTI', scale: '0-1', methods: ['MOP_H', 'SCOREFRICTION', 'WORLD_VECTOR', 'SFI_INSTITUTIONAL'], description: 'Declared intensity/traceability variable whose semantics remain method-scoped.' },
  LDI: { id: 'LDI', scale: '0-1', methods: ['MOP_H', 'SCOREFRICTION', 'SFI_INSTITUTIONAL'], description: 'Normalized longitudinal dissipation within the declared method.' },
  XI: { id: 'XI', scale: '0-1', methods: ['SCOREFRICTION', 'SFI_INSTITUTIONAL'], description: 'Residual/noise term used only by a versioned formula.' },
  PHI_H: { id: 'PHI_H', scale: '0-1', methods: ['MOP_H'], description: 'Human-session Phi.' },
  PHI_S: { id: 'PHI_S', scale: '0-1', methods: ['SCOREFRICTION'], description: 'Bounded-system or object Phi.' },
  PHI_F: { id: 'PHI_F', scale: '0-1', methods: ['PPOI'], description: 'Normalized longitudinal phenomenon persistence.' },
  PHI_W: { id: 'PHI_W', scale: '0-1', methods: ['WORLD_VECTOR'], description: 'Typed world-context Phi.' },
  PHI_SFI: { id: 'PHI_SFI', scale: '0-1', methods: ['SFI_INSTITUTIONAL'], description: 'Institutional Phi reserved to System Friction Institute.' },
  F_S: { id: 'F_S', scale: '0-1', methods: ['SCOREFRICTION', 'SFI_INSTITUTIONAL'], description: 'Friction complement of the method-scoped Phi.' },
  C_FIELD: { id: 'C_FIELD', scale: '0-1', methods: ['SCOREFRICTION', 'SFI_INSTITUTIONAL'], description: 'Field continuity/capacity formula output.' },
  PPOI_COMPOSITE: { id: 'PPOI_COMPOSITE', scale: '0-5', methods: ['PPOI'], description: 'Raw PPOI weighted composite retained before normalization.' },
  WSI: { id: 'WSI', scale: '0-1', methods: ['WORLD_VECTOR'], description: 'World State Index; current source value for PHI_W.' },
  REDUCED_KERNEL_CONTINUITY: { id: 'REDUCED_KERNEL_CONTINUITY', scale: '0-1', methods: ['SFI_INSTITUTIONAL'], description: 'Non-Phi operational continuity estimate from the reduced kernel.' },
};

const DIRECT_ALIASES: Record<string, CanonicalVariableId> = {
  PHI_PERSONAL: 'PHI_H',
  PHI_SYSTEMIC: 'PHI_S',
  PHI_PHENOMENOLOGICAL: 'PHI_F',
  PHI_WORLD: 'PHI_W',
  PSI_MOPH: 'PHI_H',
  XI_NOISE: 'XI',
  NTI_OBS: 'NTI',
  LDI_HOURS_NORMALIZED: 'LDI',
};

const HISTORICAL_ONLY = new Set(['PHI', 'PHI_GENERIC', 'PHI_SF_LEGACY']);
const PROHIBITED = new Set(['GLOBAL_PHI', 'UNIVERSAL_PHI', 'AVERAGE_PHI']);

function normalizeIdentifier(identifier: string): string {
  return identifier.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

export type VariableResolution = {
  input: string;
  normalizedInput: string;
  aliasClass: VariableAliasClass;
  canonicalId: CanonicalVariableId | null;
  reason: string;
};

export function resolveCanonicalVariable(identifier: string, context: VariableContext = {}): VariableResolution {
  const normalizedInput = normalizeIdentifier(identifier);

  if (normalizedInput in CANONICAL_VARIABLE_REGISTRY) {
    return { input: identifier, normalizedInput, aliasClass: 'CANONICAL', canonicalId: normalizedInput as CanonicalVariableId, reason: 'canonical_identifier' };
  }

  const direct = DIRECT_ALIASES[normalizedInput];
  if (direct) {
    return { input: identifier, normalizedInput, aliasClass: 'DIRECT_ALIAS', canonicalId: direct, reason: 'unambiguous_legacy_alias' };
  }

  if (normalizedInput === 'PHI_SF') {
    if (context.methodId === 'SFI_INSTITUTIONAL' || context.objectType === 'SFI_INSTITUTION') {
      return { input: identifier, normalizedInput, aliasClass: 'CONTEXTUAL_ALIAS', canonicalId: 'PHI_SFI', reason: 'institutional_context' };
    }
    if (context.methodId === 'SCOREFRICTION' || ['BOUNDED_SYSTEM', 'ARTIFACT', 'SIGNAL'].includes(context.objectType ?? '')) {
      return { input: identifier, normalizedInput, aliasClass: 'CONTEXTUAL_ALIAS', canonicalId: 'PHI_S', reason: 'bounded_system_context' };
    }
    return { input: identifier, normalizedInput, aliasClass: 'CONTEXTUAL_ALIAS', canonicalId: null, reason: 'context_required_for_phi_sf' };
  }

  if (HISTORICAL_ONLY.has(normalizedInput)) {
    return { input: identifier, normalizedInput, aliasClass: 'HISTORICAL_ONLY', canonicalId: null, reason: 'historical_identifier_requires_manual_migration' };
  }

  if (PROHIBITED.has(normalizedInput)) {
    return { input: identifier, normalizedInput, aliasClass: 'PROHIBITED', canonicalId: null, reason: 'concept_prohibited_by_mihm_canon' };
  }

  return { input: identifier, normalizedInput, aliasClass: 'UNKNOWN', canonicalId: null, reason: 'identifier_not_registered' };
}

export function assertCanonicalVariable(identifier: string, context: VariableContext = {}): CanonicalVariableId {
  const resolution = resolveCanonicalVariable(identifier, context);
  if (!resolution.canonicalId) {
    throw new Error(`mihm_variable_not_canonical:${resolution.normalizedInput}:${resolution.reason}`);
  }
  return resolution.canonicalId;
}
