import {
  getPhenomenonState,
  listLinkedEvidence,
} from '@/lib/ppoi/ppoiService';

import { getPhenomenonHypothesisView } from '@/lib/phenomena/identity/phenomenonHypothesisView';

import {
  requireAuthenticatedUser,
} from '@/lib/system/access/server';

import PhenomenonConsole from '@/components/root/PhenomenonConsole';

export default async function PhenomenonPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const { user } = await requireAuthenticatedUser();
  const { id } = await params;

  const state = await getPhenomenonState(user.id, id);
  const linkedEvidence = await listLinkedEvidence(user.id, id).catch(() => []);
  const hypothesisView = await getPhenomenonHypothesisView(user.id, id).catch(() => null);

  return (
    <PhenomenonConsole
      state={state}
      linkedEvidence={linkedEvidence}
      hypothesisView={hypothesisView}
    />
  );
}