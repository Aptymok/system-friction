export const SFI_OPERATIONAL_TABLES = [
  'worldspect_snapshots',
  'scorefriction_sources',
  'scorefriction_observations',
  'scorefriction_vectors',
  'scorefriction_evidence',
  'epistemic_events',
  'graph_edges',
  'graph_nodes',
  'logbook_visible',
  'logbook_events',
  'logbook_signals',
  'logbook_regime',
  'logbook_knowledge',
  'logbook_frictions',
  'logbook_mutations',
  'amv_learning',
  'action_proposals',
  'evidence_ledger',
  'root_neural_nodes',
  'root_neural_edges',
  'profiles'
];

export const SFI_RESET_TABLES = SFI_OPERATIONAL_TABLES.filter((table) => table !== 'profiles');

export const DELETE_ORDER = [
  'root_neural_edges',
  'graph_edges',
  'action_proposals',
  'scorefriction_vectors',
  'scorefriction_observations',
  'scorefriction_evidence',
  'scorefriction_sources',
  'worldspect_snapshots',
  'epistemic_events',
  'logbook_visible',
  'logbook_events',
  'logbook_signals',
  'logbook_regime',
  'logbook_knowledge',
  'logbook_frictions',
  'logbook_mutations',
  'amv_learning',
  'evidence_ledger',
  'root_neural_nodes',
  'graph_nodes'
];