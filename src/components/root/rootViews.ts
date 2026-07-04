export type RootViewId =
  | 'institute-state'
  | 'prediction-registry'
  | 'agentic-operations'
  | 'founder-governance'
  | 'institute-functions'
  | 'expansion-investigation';

export type RootViewDefinition = {
  id: RootViewId;
  title: string;
  subtitle: string;
  glyph: string;
  centerTitle: string;
  centerSubtitle: string;
  leftTitle: string;
  rightTitle: string;
  readingTitle: string;
  dataClass: 'real' | 'derived' | 'gated' | 'mixed';
};

export const ROOT_VIEW_DEFINITIONS: RootViewDefinition[] = [
  {
    id: 'institute-state',
    title: 'SFI ROOT / LIVE INSTITUTE CONSOLE',
    subtitle: 'INTERNAL OBSERVATORY / SYSTEM OBSERVING ITSELF',
    glyph: 'O',
    centerTitle: 'INSTITUTE TOPOLOGY',
    centerSubtitle: 'INTERNAL OBSERVATORY',
    leftTitle: 'TOTAL INSTITUTE STATE',
    rightTitle: 'ACTIVE PROPOSALS',
    readingTitle: 'READING OF THE DAY',
    dataClass: 'mixed',
  },
  {
    id: 'prediction-registry',
    title: 'SFI ROOT / PREDICTION REGISTRY',
    subtitle: 'OBSERVING POTENTIAL / PREPARING CERTAINTY',
    glyph: '<>',
    centerTitle: 'PREDICTIVE TOPOLOGY',
    centerSubtitle: 'BRANCHING PROBABILITY SPACE',
    leftTitle: 'PENDING PREDICTION DRAFTS',
    rightTitle: 'FOUNDER APPROVAL',
    readingTitle: 'READING / PREDICTIVE PRESSURE',
    dataClass: 'mixed',
  },
  {
    id: 'agentic-operations',
    title: 'SFI ROOT / AGENTIC OPERATIONS',
    subtitle: 'INTERNAL AGENT LATTICE / DEPENDENCY OBSERVATION',
    glyph: '*',
    centerTitle: 'INTERNAL AGENT LATTICE',
    centerSubtitle: 'ROOT ORCHESTRATOR',
    leftTitle: 'AGENT STATUS',
    rightTitle: 'OPERATION LOG',
    readingTitle: 'SYSTEM HEALTH SUMMARY',
    dataClass: 'mixed',
  },
  {
    id: 'founder-governance',
    title: 'SFI ROOT / FOUNDER GOVERNANCE',
    subtitle: 'DECISION CHAMBER / ACTION ROUTING',
    glyph: '^',
    centerTitle: 'GOVERNANCE DECISION CHAMBER',
    centerSubtitle: 'ROOT DECISION MATRIX',
    leftTitle: 'FOUNDER ACTION QUEUE',
    rightTitle: 'PROPOSED INSTITUTIONAL ACTIONS',
    readingTitle: 'APPROVAL PRESSURE',
    dataClass: 'mixed',
  },
  {
    id: 'institute-functions',
    title: 'SFI ROOT / INSTITUTE FUNCTIONS',
    subtitle: 'FUNCTIONAL MATRIX / INSTRUMENT ARRAY',
    glyph: '[]',
    centerTitle: 'FUNCTIONAL MATRIX',
    centerSubtitle: 'INSTRUMENT ARRAY',
    leftTitle: 'EVALUATE / CALCULATE / MODEL',
    rightTitle: 'SCOREFRICTION / MOPH / VECTORS',
    readingTitle: 'METHODOLOGICAL INTEGRITY',
    dataClass: 'derived',
  },
  {
    id: 'expansion-investigation',
    title: 'SFI ROOT / EXPANSION & INVESTIGATION',
    subtitle: 'OPPORTUNITY FIELD / EMERGING ROUTES',
    glyph: '~',
    centerTitle: 'OPPORTUNITY FIELD',
    centerSubtitle: 'EMERGING ROUTES',
    leftTitle: 'EMERGENT THEMES',
    rightTitle: 'ACTIVE INVESTIGATIONS',
    readingTitle: 'NARRATIVE / STRATEGIC READING',
    dataClass: 'derived',
  },
];

export function getRootViewDefinition(id: RootViewId): RootViewDefinition {
  return ROOT_VIEW_DEFINITIONS.find((view) => view.id === id) ?? ROOT_VIEW_DEFINITIONS[0];
}
