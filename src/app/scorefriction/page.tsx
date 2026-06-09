import { buildScoreFrictionScopeState } from '@/lib/amv/scopes/scorefriction/scorefrictionStateConnector';
import { ScoreFrictionUnifiedObservatoryV2 } from '@/scorefriction/components/ScoreFrictionUnifiedObservatoryV2';

export default async function ScoreFrictionPage() {
  const state = await buildScoreFrictionScopeState();
  return <ScoreFrictionUnifiedObservatoryV2 initialState={state} />;
}
