import { ScoreFrictionWideClient } from '@/scorefriction/components/ScoreFrictionWideClient';
import { ScoreFrictionStateBanner } from '@/scorefriction/components/ScoreFrictionStateBanner';
import { ScoreFrictionWideSummary } from '@/scorefriction/components/ScoreFrictionInterpretationPanel';
import { buildScoreFrictionScopeState } from '@/lib/amv/scopes/scorefriction/scorefrictionStateConnector';

export default async function ScoreFrictionWidePage() {
  const state = await buildScoreFrictionScopeState();
  return (
    <>
      <ScoreFrictionStateBanner state={state} />
      <div className="bg-[#070706] px-5 py-5">
        <div className="mx-auto max-w-[1560px]">
          <ScoreFrictionWideSummary state={state} />
        </div>
      </div>
      <ScoreFrictionWideClient />
    </>
  );
}
