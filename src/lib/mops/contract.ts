export const MOPS_CONTRACT_VERSION = '2026-08-11.mops.v0.1' as const;

export type MopsProtocolId = 'MOP_S_MEDIA' | 'MOP_S_CHANNEL' | 'MOP_S_BOUNDARY';
export type MopsEpistemicStatus = 'EXPERIMENTAL';

export type MopsProtocolDefinition = {
  id: MopsProtocolId;
  label: string;
  status: MopsEpistemicStatus;
  object: string;
  purpose: string;
  reads: string[];
  outputs: string[];
  prohibitions: string[];
};

const SHARED_PROHIBITIONS = [
  'Do not use MOP-S to covertly track people.',
  'Do not infer an individual identity from an artifact marker alone.',
  'Do not treat marker survival as proof of who viewed, copied or transformed an artifact.',
  'Do not promote an experimental MOP-S result to canonical evidence without governed return and validation.',
];

export const MOPS_PROTOCOLS: MopsProtocolDefinition[] = [
  {
    id: 'MOP_S_MEDIA',
    label: 'MOP-S / MEDIA',
    status: 'EXPERIMENTAL',
    object: 'one authorized digital artifact or controlled variant across transformations',
    purpose: 'Measure persistence and recoverability of an authorized signal/identifier through encoding, compression, remix, publication and retrieval.',
    reads: ['immutable original', 'carrier hash', 'authorized marker specification', 'known transformations', 'detector output'],
    outputs: ['persistence', 'recovery confidence', 'transformation ledger', 'false-positive/false-negative record'],
    prohibitions: SHARED_PROHIBITIONS,
  },
  {
    id: 'MOP_S_CHANNEL',
    label: 'MOP-S / CHANNEL',
    status: 'EXPERIMENTAL',
    object: 'one authorized artifact propagated through one or more digital channels',
    purpose: 'Observe where a controlled artifact survives, mutates, decays or reappears across channel transitions without collapsing platform behavior into user behavior.',
    reads: ['artifact lineage', 'channel transition', 'timestamps', 'public/authorized observations', 'detector results'],
    outputs: ['channel survival matrix', 'mutation points', 'decay/revival observations', 'propagation trajectory'],
    prohibitions: SHARED_PROHIBITIONS,
  },
  {
    id: 'MOP_S_BOUNDARY',
    label: 'MOP-S / BOUNDARY',
    status: 'EXPERIMENTAL',
    object: 'the contextual boundary at which an artifact remains identifiable while meaning, carrier or environment changes',
    purpose: 'Estimate persistence → boundary → cadence → contextual decoupling and identify where artifact identity ceases to be operationally recoverable.',
    reads: ['MEDIA result', 'CHANNEL result', 'context shifts', 'cadence', 'semantic/structural change', 'recovery result'],
    outputs: ['boundary estimate', 'cadence sensitivity', 'context-decoupling observation', 'failure boundary'],
    prohibitions: SHARED_PROHIBITIONS,
  },
];

export const MOPS_P0 = {
  status: 'APPROVED_DESIGN_NOT_VALIDATED',
  variants: [
    { id: 'P0-A', purpose: 'baseline controlled carrier/marker persistence' },
    { id: 'P0-B', purpose: 'controlled transformation and channel transition' },
    { id: 'P0-C', purpose: 'boundary/cadence/context-decoupling contrast' },
  ],
  anchorClaim: 'Persistence → boundary → cadence → contextual decoupling is an experimental sequence, not an established law.',
  caseBoundary: 'Kavak may be used as an applied case when lawful evidence exists; it is not the conceptual origin or validating case of MOP-S.',
} as const;

export function getMopsProtocol(id: MopsProtocolId) {
  return MOPS_PROTOCOLS.find((item) => item.id === id) ?? null;
}
