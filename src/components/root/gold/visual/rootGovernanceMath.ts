import type { RootGovernanceState } from './rootGoldTypes';

export function clamp01(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

export function domainAnchors(values: RootGovernanceState['governanceSummary']) {
  const coherence = clamp01(values.coherence);
  const resilience = clamp01(values.resilience);
  const alignment = clamp01(values.alignment);
  const coverage = clamp01(values.coverage);
  const friction = clamp01(values.systemicFriction);
  return [
    { id: 'information', label: 'INFORMACION / INTEGRIDAD', x: 18, y: 30, intensity: coherence },
    { id: 'institutional', label: 'INSTITUCIONES / CAPACIDAD', x: 33, y: 70, intensity: coverage },
    { id: 'technology', label: 'TECNOLOGIA / INFRAESTRUCTURA', x: 50, y: 22, intensity: alignment },
    { id: 'society', label: 'SOCIEDAD / COMPORTAMIENTO', x: 67, y: 70, intensity: resilience },
    { id: 'resources', label: 'RECURSOS / ASIGNACION', x: 82, y: 30, intensity: friction },
    { id: 'environment', label: 'ENTORNO / EXOGENCIAS', x: 50, y: 82, intensity: Math.max(coverage, friction) },
  ];
}

export function deterministicParticles(seed: number, count = 160) {
  return Array.from({ length: count }, (_, index) => {
    const a = (index * 137.5 + seed * 29) * Math.PI / 180;
    const r = 10 + ((index * 17 + seed * 11) % 42);
    return {
      x: 50 + Math.cos(a) * r,
      y: 50 + Math.sin(a) * r * 0.56,
      intensity: ((index * 23 + seed * 7) % 100) / 100,
    };
  });
}
