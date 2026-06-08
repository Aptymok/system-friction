import { AMV_ECOSYSTEM_INSTRUMENTS, buildEcosystemContext } from '../../core/ecosystemInstrumentFactory'
import type { AmvRuntimeRequest } from '../../core/amvTypes'

export function buildScorefrictionContext(request: AmvRuntimeRequest) {
  return buildEcosystemContext(AMV_ECOSYSTEM_INSTRUMENTS.scorefriction, request)
}
