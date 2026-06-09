import CulturalVectorDashboard from '@/scorefriction/components/CulturalVectorDashboard';
import { ScoreFrictionStateBanner } from '@/scorefriction/components/ScoreFrictionStateBanner';
import { ScoreFrictionWaveSummary } from '@/scorefriction/components/ScoreFrictionInterpretationPanel';
import { buildScoreFrictionScopeState } from '@/lib/amv/scopes/scorefriction/scorefrictionStateConnector';

export default async function ScoreFrictionWavePage() {
  const state = await buildScoreFrictionScopeState();
  return (
    <>
      <ScoreFrictionStateBanner state={state} />
      <div className="bg-[#070706] px-5 py-5">
        <div className="mx-auto max-w-6xl">
          <ScoreFrictionWaveSummary state={state} />
        </div>
      </div>
      <CulturalVectorDashboard />
    </>
  );
}
