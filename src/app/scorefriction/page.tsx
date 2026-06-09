import { buildScoreFrictionScopeState } from '@/lib/amv/scopes/scorefriction/scorefrictionStateConnector';
import { ScoreFrictionUnifiedObservatory } from '@/scorefriction/components/ScoreFrictionUnifiedObservatory';

export default async function ScoreFrictionPage() {
  const state = await buildScoreFrictionScopeState();
  return <ScoreFrictionUnifiedObservatory initialState={state} />;
}
