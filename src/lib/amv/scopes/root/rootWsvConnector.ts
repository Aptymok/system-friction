import { buildWorldSpectState } from '@/lib/worldspect/worldspectStateBuilder'

export async function buildRootWsvContext() {
  const state = await buildWorldSpectState()
  return {
    source: 'worldspect',
    canOrientExternalContext: Boolean(state.observed_at && state.sources.length > 0 && state.confidence > 0),
    state,
    warnings: state.warnings,
  }
}
