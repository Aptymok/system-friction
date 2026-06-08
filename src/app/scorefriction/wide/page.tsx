import { ScoreFrictionWideClient } from '@/scorefriction/components/ScoreFrictionWideClient';
import { ScoreFrictionStateBanner } from '@/scorefriction/components/ScoreFrictionStateBanner';
import { buildScoreFrictionScopeState } from '@/lib/amv/scopes/scorefriction/scorefrictionStateConnector';

export default async function ScoreFrictionWidePage() {
  const state = await buildScoreFrictionScopeState();
  return (
    <>
      <ScoreFrictionStateBanner state={state} />
      <ScoreFrictionWideClient />
    </>
  );
}
