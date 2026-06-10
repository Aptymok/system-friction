import { buildScoreFrictionScopeState } from '@/lib/amv/scopes/scorefriction/scorefrictionStateConnector';
import { ScoreFrictionOperationalObservatory } from '@/scorefriction/components/ScoreFrictionOperationalObservatory';

export default async function ScoreFrictionPage() {
  const state = await buildScoreFrictionScopeState();
  return <ScoreFrictionOperationalObservatory initialState={state} />;
}
