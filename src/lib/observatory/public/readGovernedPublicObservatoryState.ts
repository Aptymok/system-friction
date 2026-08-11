import 'server-only';

import { observatoryPublicationDisposition } from '@/lib/observatory/publicationGate';
import { readPublicObservatoryState } from './readPublicObservatoryState';

export async function readGovernedPublicObservatoryState() {
  const state = await readPublicObservatoryState();
  const sourceRefs = Array.from(new Set(
    (state.provenance.basedOn ?? []).filter((item): item is string => typeof item === 'string' && item.trim().length > 0),
  ));
  const gate = observatoryPublicationDisposition({
    epistemicClass: 'DERIVED',
    authority: 'PUBLIC',
    sourceRefs,
  });
  if (gate.disposition === 'BLOCK') {
    throw new Error(`OBSERVATORY_PUBLICATION_BLOCKED:${gate.reason}`);
  }
  return {
    ...state,
    provenance: {
      ...state.provenance,
      limits: Array.from(new Set([
        ...state.provenance.limits,
        `publication_gate:${gate.disposition}:${gate.reason}`,
      ])),
    },
  };
}
