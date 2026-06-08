import CulturalVectorDashboard from '@/scorefriction/components/CulturalVectorDashboard';
import { ScoreFrictionStateBanner } from '@/scorefriction/components/ScoreFrictionStateBanner';
import { buildScoreFrictionScopeState } from '@/lib/amv/scopes/scorefriction/scorefrictionStateConnector';

export default async function ScoreFrictionWavePage() {
  const state = await buildScoreFrictionScopeState();
  return (
    <>
      <ScoreFrictionStateBanner state={state} />
      <CulturalVectorDashboard />
    </>
  );
}
