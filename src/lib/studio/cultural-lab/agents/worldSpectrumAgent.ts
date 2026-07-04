import type { CulturalArtifactInput, MihmDeepElement, WorldSpectrumPlacement, InputArchaeologyResult } from '../types';
import { buildWorldSpectState } from '@/lib/worldspect/worldspectStateBuilder';

function clamp01(value: unknown, fallback = 0.5) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}

export async function worldSpectrumAgent(input: CulturalArtifactInput, mihmData: MihmDeepElement[]): Promise<WorldSpectrumPlacement> {
  try {
    const world = await buildWorldSpectState();
    const record = world as unknown as Record<string, unknown>;
    const cluster = input.kind === 'policy_document' ? 'policy cluster' : 'cultural cluster';
    return {
      artifactPoint: {
        x: 0.1 + Math.min(0.7, mihmData.length * 0.05),
        y: 0.8,
        z: 0.2,
        label: input.title.slice(0, 30) || 'artifact',
      },
      nearbyArtifacts: ['artifact:local-context', 'artifact:reference-point'],
      opposingArtifacts: ['artifact:antithesis'],
      clusterMemberships: [cluster, 'worldspect field'],
      culturalDrift: clamp01(record.relevance_to_sfi, 0.52),
      vectorTensions: Array.isArray(record.dominant_external_pressures)
        ? record.dominant_external_pressures.map(String)
        : ['external pressure unavailable', 'worldspect fallback'],
    };
  } catch {
    return {
      artifactPoint: { x: 0.18, y: 0.72, z: 0.24, label: input.title.slice(0, 30) || 'artifact' },
      nearbyArtifacts: ['artifact:local-context'],
      opposingArtifacts: ['artifact:antithesis'],
      clusterMemberships: [input.kind === 'policy_document' ? 'policy cluster' : 'cultural cluster'],
      culturalDrift: 0.5,
      vectorTensions: ['worldspect_unavailable'],
    };
  }
}

export async function inputArchaeologyAgent(input: CulturalArtifactInput): Promise<InputArchaeologyResult> {
  return {
    symbolicStructures: [
      { item: `core symbol from ${input.kind}`, origin: 'artifact input', basedOn: ['title', 'notes'] },
    ],
    narratives: [
      { item: `primary narrative from ${input.title || 'untitled artifact'}`, origin: 'artifact input', basedOn: ['text', 'title'] },
    ],
    emotionalStructures: [
      { item: 'tension-release pattern', origin: 'artifact input', basedOn: ['notes', 'text'] },
    ],
    archetypes: [
      { item: 'threshold / transformation archetype', origin: 'artifact input', basedOn: ['text'] },
    ],
    contradictions: [
      { item: 'hope vs risk', origin: 'artifact input', basedOn: ['text', 'notes'] },
    ],
    socialTensions: [
      { item: 'in-group/out-group fracture', origin: 'artifact input', basedOn: ['notes', 'targetAudience'] },
    ],
  };
}
