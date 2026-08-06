import type { MihmMethodId } from './methodSelectionContract';

export type MihmPhiSymbol =
  | 'PHI_H'
  | 'PHI_S'
  | 'PHI_F'
  | 'PHI_W'
  | 'PHI_SFI';

export type LegacyMihmPhiSymbol =
  | 'PHI_PERSONAL'
  | 'PHI_SYSTEMIC'
  | 'PHI_PHENOMENOLOGICAL'
  | 'PHI_WORLD'
  | 'PHI_SF';

export type MihmPhiSemanticRole =
  | 'HUMAN_SESSION_STATE'
  | 'BOUNDED_SYSTEM_STATE'
  | 'PHENOMENON_PERSISTENCE'
  | 'WORLD_CONTEXT_STATE'
  | 'INSTITUTIONAL_HOMEOSTASIS';

export type MihmPhiEpistemicStatus =
  | 'OBSERVED'
  | 'DERIVED'
  | 'THIN'
  | 'DEGRADED'
  | 'MISSING'
  | 'CONFLICTED';

export type MihmPhiDefinition = {
  symbol: MihmPhiSymbol;
  notation: string;
  methodId: MihmMethodId;
  dimension: string;
  semanticRole: MihmPhiSemanticRole;
  scale: '0-1';
  formulaAuthority: string;
  formulaVersion: string;
  comparability: 'WITHIN_METHOD_ONLY';
  description: string;
};

export const MIHM_PHI_REGISTRY: Record<MihmPhiSymbol, MihmPhiDefinition> = {
  PHI_H: {
    symbol: 'PHI_H',
    notation: 'Φ_H',
    methodId: 'MOP_H',
    dimension: 'human_session',
    semanticRole: 'HUMAN_SESSION_STATE',
    scale: '0-1',
    formulaAuthority: 'src/lib/moph/moph-math.ts#calculateMophPhi',
    formulaVersion: '2026-08-06.phi-h.v1',
    comparability: 'WITHIN_METHOD_ONLY',
    description: 'Estado de una persona dentro de una sesión MOP-H identificada.',
  },
  PHI_S: {
    symbol: 'PHI_S',
    notation: 'Φ_S',
    methodId: 'SCOREFRICTION',
    dimension: 'bounded_system_or_object',
    semanticRole: 'BOUNDED_SYSTEM_STATE',
    scale: '0-1',
    formulaAuthority: 'src/lib/sfi/math.ts#evaluateSfi',
    formulaVersion: '2026-08-06.phi-s.v2',
    comparability: 'WITHIN_METHOD_ONLY',
    description: 'Estado de continuidad de un objeto o sistema delimitado evaluado por ScoreFriction.',
  },
  PHI_F: {
    symbol: 'PHI_F',
    notation: 'Φ_F',
    methodId: 'PPOI',
    dimension: 'longitudinal_phenomenon',
    semanticRole: 'PHENOMENON_PERSISTENCE',
    scale: '0-1',
    formulaAuthority: 'src/lib/mihm/phiContract.ts#normalizePpoiComposite',
    formulaVersion: '2026-08-06.phi-f.v1',
    comparability: 'WITHIN_METHOD_ONLY',
    description: 'Persistencia normalizada de un fenómeno PPOI. No representa salud institucional.',
  },
  PHI_W: {
    symbol: 'PHI_W',
    notation: 'Φ_W',
    methodId: 'WORLD_VECTOR',
    dimension: 'world_context',
    semanticRole: 'WORLD_CONTEXT_STATE',
    scale: '0-1',
    formulaAuthority: 'src/lib/worldspect/vector-aggregator.ts#aggregateWorldSpect',
    formulaVersion: '2026-08-06.phi-w.wsi-alias.v1',
    comparability: 'WITHIN_METHOD_ONLY',
    description: 'Índice contextual mundial. En la versión vigente es el alias tipado de WSI, no un promedio de otros Phi.',
  },
  PHI_SFI: {
    symbol: 'PHI_SFI',
    notation: 'Φ_SFI',
    methodId: 'SFI_INSTITUTIONAL',
    dimension: 'sfi_institution',
    semanticRole: 'INSTITUTIONAL_HOMEOSTASIS',
    scale: '0-1',
    formulaAuthority: 'src/lib/sfi/math.ts#evaluateSfi',
    formulaVersion: '2026-08-06.phi-sfi.v1',
    comparability: 'WITHIN_METHOD_ONLY',
    description: 'Estado homeostático institucional de System Friction Institute para un snapshot identificado.',
  },
};

const LEGACY_SYMBOL_MAP: Record<LegacyMihmPhiSymbol, MihmPhiSymbol> = {
  PHI_PERSONAL: 'PHI_H',
  PHI_SYSTEMIC: 'PHI_S',
  PHI_PHENOMENOLOGICAL: 'PHI_F',
  PHI_WORLD: 'PHI_W',
  PHI_SF: 'PHI_SFI',
};

export function resolveCanonicalPhiSymbol(symbol: MihmPhiSymbol | LegacyMihmPhiSymbol): MihmPhiSymbol {
  return symbol in MIHM_PHI_REGISTRY
    ? symbol as MihmPhiSymbol
    : LEGACY_SYMBOL_MAP[symbol as LegacyMihmPhiSymbol];
}

export function getMihmPhiDefinition(symbol: MihmPhiSymbol | LegacyMihmPhiSymbol): MihmPhiDefinition {
  return MIHM_PHI_REGISTRY[resolveCanonicalPhiSymbol(symbol)];
}

export function normalizePpoiComposite(composite: number): number {
  if (!Number.isFinite(composite)) return 0;
  return Math.max(0, Math.min(1, composite / 5));
}

export function validateMihmPhiRegistry(): string[] {
  const definitions = Object.values(MIHM_PHI_REGISTRY);
  const warnings: string[] = [];
  const methods = new Set<string>();
  const dimensions = new Set<string>();

  for (const definition of definitions) {
    if (methods.has(definition.methodId)) warnings.push(`duplicate_method:${definition.methodId}`);
    if (dimensions.has(definition.dimension)) warnings.push(`duplicate_dimension:${definition.dimension}`);
    methods.add(definition.methodId);
    dimensions.add(definition.dimension);
  }

  return warnings;
}
