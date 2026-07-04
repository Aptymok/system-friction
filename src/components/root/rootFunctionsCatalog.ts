export type RootFunctionStatus = 'available' | 'partial' | 'gated';

export type RootFunctionItem = {
  id: string;
  family: 'evaluate' | 'calculate' | 'model' | 'scorefriction' | 'moph' | 'vectors' | 'evidence' | 'laboratory' | 'publication' | 'attractors';
  label: string;
  description: string;
  status: RootFunctionStatus;
  source: string;
};

export const ROOT_FUNCTIONS_CATALOG: RootFunctionItem[] = [
  { id: 'impact-evaluation', family: 'evaluate', label: 'Impact Evaluation', description: 'Assess system outcomes and institutional effect.', status: 'partial', source: 'scorefriction evaluation adapters' },
  { id: 'causal-evaluation', family: 'evaluate', label: 'Causal Evaluation', description: 'Test causal pathways and intervention deltas.', status: 'gated', source: 'pending causal model contract' },
  { id: 'friction-calculus', family: 'calculate', label: 'Friction Calculus', description: 'Quantify systemic friction and resistance.', status: 'partial', source: 'ScoreFriction metrics + derived root indicators' },
  { id: 'scenario-calculator', family: 'calculate', label: 'Scenario Calculator', description: 'Explore multi-variable routes and counterfactuals.', status: 'gated', source: 'pending scenario endpoint' },
  { id: 'dynamic-system-modeler', family: 'model', label: 'Dynamic System Modeler', description: 'Build system dynamics from observed vectors.', status: 'partial', source: 'MIHM/SFI model layer' },
  { id: 'agent-based-modeler', family: 'model', label: 'Agent-Based Modeler', description: 'Simulate agent interactions and dependencies.', status: 'partial', source: 'buildAgenticRootState' },
  { id: 'friction-scoring-engine', family: 'scorefriction', label: 'Friction Scoring Engine', description: 'Compute friction scores from submitted substrates.', status: 'available', source: 'ScoreFriction API' },
  { id: 'benchmark-comparator', family: 'scorefriction', label: 'Benchmark Comparator', description: 'Compare across prior observations and cases.', status: 'partial', source: 'ScoreFriction observations and vectors' },
  { id: 'mechanism-mapper', family: 'moph', label: 'Mechanism Mapper', description: 'Map causal mechanisms and process constraints.', status: 'partial', source: 'MOPH doctrine / pending endpoint formalization' },
  { id: 'outcome-pathways', family: 'moph', label: 'Outcome Pathways', description: 'Trace probable outcome routes.', status: 'gated', source: 'pending MOPH pathway state' },
  { id: 'tension-scanner', family: 'vectors', label: 'Tension Scanner', description: 'Identify institutional and systemic tension vectors.', status: 'partial', source: 'World Vector + Neural Graph evidence' },
  { id: 'tension-mapper', family: 'vectors', label: 'Tension Mapper', description: 'Map tension landscapes across domains.', status: 'partial', source: 'World Vector operational state' },
  { id: 'evidence-tools', family: 'evidence', label: 'Evidence Tools', description: 'Inspect evidence provenance and traceability.', status: 'partial', source: 'initialState.neuralGraph.evidence' },
  { id: 'laboratory-functions', family: 'laboratory', label: 'Laboratory Functions', description: 'Run controlled institutional experiments.', status: 'gated', source: 'pending root lab protocol' },
  { id: 'article-proposals', family: 'publication', label: 'Article Proposals', description: 'Generate publishable institutional theses.', status: 'gated', source: 'pending publication queue' },
  { id: 'attractor-persistence', family: 'attractors', label: 'Persistence of Attractors', description: 'Track stability and recurrence of attractors.', status: 'partial', source: 'AMV + prediction registry + ScoreFriction vectors' },
];

export function getFunctionFamilyCount(family: RootFunctionItem['family']) {
  return ROOT_FUNCTIONS_CATALOG.filter((item) => item.family === family).length;
}

export function getFunctionAvailability() {
  const total = ROOT_FUNCTIONS_CATALOG.length;
  const available = ROOT_FUNCTIONS_CATALOG.filter((item) => item.status === 'available').length;
  const partial = ROOT_FUNCTIONS_CATALOG.filter((item) => item.status === 'partial').length;
  return { total, available, partial, score: (available + partial * 0.55) / total };
}
