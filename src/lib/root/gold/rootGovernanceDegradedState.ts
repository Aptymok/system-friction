import type { RootGovernanceState } from './rootGovernanceState';

export function buildRootGovernanceDegradedState(reason = 'root_governance_sources_unavailable'): RootGovernanceState {
  const generatedAt = new Date().toISOString();
  return {
    generatedAt,
    systemState: 'degraded',
    governanceSummary: {
      systemicFriction: null,
      coherence: null,
      resilience: null,
      alignment: null,
      activeNodes: null,
      coverage: null,
    },
    agents: [],
    activeProposals: [],
    recentRecords: [],
    governanceField: {
      center: { label: 'ROOT / GOVERNANCE', intensity: 0 },
      domains: [
        { id: 'information', label: 'INFORMACION / INTEGRIDAD', x: 18, y: 30, intensity: 0 },
        { id: 'institutional', label: 'INSTITUCIONES / CAPACIDAD', x: 33, y: 70, intensity: 0 },
        { id: 'technology', label: 'TECNOLOGIA / INFRAESTRUCTURA', x: 50, y: 22, intensity: 0 },
        { id: 'society', label: 'SOCIEDAD / COMPORTAMIENTO', x: 67, y: 70, intensity: 0 },
        { id: 'resources', label: 'RECURSOS / ASIGNACION', x: 82, y: 30, intensity: 0 },
        { id: 'environment', label: 'ENTORNO / EXOGENCIAS', x: 50, y: 82, intensity: 0 },
      ],
      links: [],
      particles: [],
    },
    projections: { activeHypotheses: [], recentCalibrations: [] },
    proposedInvestigations: { title: 'SOURCE_UNAVAILABLE', scenarioId: null, state: 'blocked', progress: null, wsvPreview: { nodes: [] } },
    socialSimulationLab: { scenarioId: null, dimensions: null, resolution: null, state: 'blocked', progress: null, vectorPreview: [] },
    atlas: {
      ingestion: [
        { source: 'sensores', count: null, status: 'missing' },
        { source: 'instituciones', count: null, status: 'missing' },
        { source: 'publicaciones', count: null, status: 'missing' },
        { source: 'politicas', count: null, status: 'missing' },
        { source: 'datos abiertos', count: null, status: 'missing' },
      ],
      globalCoverage: null,
      activeSources: null,
      mapNodes: [],
    },
    executionTools: [],
    engines: [],
    provenance: {
      basedOn: [],
      degradedSources: [reason],
      limits: ['ROOT governance adapter returned degraded state; no values were synthesized.'],
    },
  };
}
