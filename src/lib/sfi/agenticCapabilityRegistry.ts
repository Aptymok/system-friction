export type SfiAgenticCapabilityContract = {
  id: string;
  name: string;
  purpose: string;
  layer: string;
  route: string;
  providerAware: boolean;
  approvalRequired: boolean;
  reads: string[];
  writes: string[];
  executes: string[];
  executionEvidence: {
    table: string;
    timeColumn: string;
    filter?: { column: string; value: string };
  } | null;
};

export const SFI_AGENTIC_CAPABILITIES: SfiAgenticCapabilityContract[] = [
  {
    id: 'world_vector_agent',
    name: 'World Vector Agent',
    purpose: 'Integra observación mundial, oportunidades y estado operativo para producir una lectura trazable.',
    layer: 'observar',
    route: '/api/root/agentic/world-vector',
    providerAware: false,
    approvalRequired: false,
    reads: ['world_vector_observations', 'worldspect_snapshots', 'world opportunities', 'SFI operational state'],
    writes: ['No persistent write declared by the agent contract'],
    executes: ['runWorldVectorAgent', 'buildWorldVectorOperationalState', 'readOperationalConsoleState', 'loadWorldOpportunities'],
    executionEvidence: null,
  },
  {
    id: 'moph_agent',
    name: 'MOP-H Agent',
    purpose: 'Interpreta una fricción observada y propone una perturbación mínima reversible sustentada por evidencia.',
    layer: 'reconstruir',
    route: '/api/interface/observatory/interpret',
    providerAware: true,
    approvalRequired: false,
    reads: ['declared MOP-H input', 'AMV operational memory', 'canonical evidence graph'],
    writes: ['No persistent write declared by runMophAgent; caller owns persistence'],
    executes: ['runMophAgent', 'readAmvOperationalMemory', 'runNeuralGraphAgent', 'runLlmTask'],
    executionEvidence: null,
  },
  {
    id: 'neural_graph_agent',
    name: 'Neural Graph Agent',
    purpose: 'Recupera relaciones y evidencia del grafo persistido sin crear conexiones de respaldo.',
    layer: 'relacionar',
    route: '/api/root/agentic/neural-graph',
    providerAware: false,
    approvalRequired: false,
    reads: ['canonical graph projection', 'canonical evidence objects', 'related prediction/report/AMV context'],
    writes: ['No persistent write declared by the read agent'],
    executes: ['runNeuralGraphAgent'],
    executionEvidence: null,
  },
  {
    id: 'amv_agent',
    name: 'AMV Agent',
    purpose: 'Recupera memoria operativa, recurrencias y asociaciones institucionales persistidas.',
    layer: 'recordar',
    route: '/api/root/agentic/amv',
    providerAware: false,
    approvalRequired: false,
    reads: ['sfi_amv_memory', 'related evidence/context'],
    writes: ['No persistent write declared by readAmvOperationalMemory'],
    executes: ['readAmvOperationalMemory'],
    executionEvidence: null,
  },
  {
    id: 'prediction_agent',
    name: 'Prediction Agent',
    purpose: 'Formula predicciones y probabilidades con base explícita de evidencia e incertidumbre.',
    layer: 'proyectar',
    route: '/api/root/agentic/prediction',
    providerAware: false,
    approvalRequired: false,
    reads: ['canonical evidence graph', 'AMV operational memory', 'declared signal/entity context'],
    writes: ['No persistent write declared by runPredictionAgent; predictive registry owns governed persistence'],
    executes: ['runPredictionAgent', 'runNeuralGraphAgent', 'readAmvOperationalMemory'],
    executionEvidence: null,
  },
  {
    id: 'client_finder_agent',
    name: 'Client Finder Agent',
    purpose: 'Convierte una entidad y señal observada en una hipótesis comercial/IFNORM para revisión humana.',
    layer: 'proponer',
    route: '/api/root/agentic/client-finder',
    providerAware: true,
    approvalRequired: true,
    reads: ['manual/public entity signal', 'canonical evidence graph', 'AMV memory', 'prediction context'],
    writes: ['root_audit_events through ROOT route; no automatic outreach'],
    executes: ['runClientFinderAgent', 'runPredictionAgent', 'runNeuralGraphAgent', 'readAmvOperationalMemory', 'runLlmTask'],
    executionEvidence: null,
  },
  {
    id: 'report_agent',
    name: 'Report Agent',
    purpose: 'Genera lecturas institucionales y reportes sustentados por evidencia; publicación/contacto permanecen gobernados.',
    layer: 'reportar',
    route: '/api/root/agentic/report',
    providerAware: true,
    approvalRequired: true,
    reads: ['World Vector / WorldSpect state', 'canonical evidence graph', 'AMV operational memory', 'optional IFNORM context'],
    writes: ['sfi_cognitive_twin_runs(role=report_agent)', 'root_audit_events'],
    executes: ['runReportAgent', 'buildWorldVectorOperationalState', 'runNeuralGraphAgent', 'readAmvOperationalMemory', 'runLlmTask'],
    executionEvidence: { table: 'sfi_cognitive_twin_runs', timeColumn: 'created_at', filter: { column: 'role', value: 'report_agent' } },
  },
  {
    id: 'prospect_radar_agent',
    name: 'Prospect Radar Agent',
    purpose: 'Busca señales públicas de organizaciones, conserva las fuentes y produce dossiers comerciales proyectivos sin contacto automático.',
    layer: 'proponer',
    route: '/api/root/agentic/prospect-radar',
    providerAware: true,
    approvalRequired: true,
    reads: ['Bing News RSS', 'Google News RSS', 'SFI service catalog', 'optional Ollama synthesis'],
    writes: ['prospect_research_runs', 'prospect_research_sources', 'prospect_opportunity_reports', 'root_audit_events'],
    executes: ['runNoKeyProspectRadar', 'runNoKeyNewsFeeds', 'matchSfiOffer', 'optional Ollama synthesis'],
    executionEvidence: { table: 'prospect_research_runs', timeColumn: 'created_at' },
  },
];
