import { buildAllAmvScopeStates } from '@/lib/amv/core/amvStateBuilder'
import { ObservatoryOfObservatories } from '@/observatory/components/amv/ObservatoryOfObservatories'

export default async function ObservatoriesPage() {
  const scopes = await buildAllAmvScopeStates()
  return <ObservatoryOfObservatories scopes={scopes} />
}
