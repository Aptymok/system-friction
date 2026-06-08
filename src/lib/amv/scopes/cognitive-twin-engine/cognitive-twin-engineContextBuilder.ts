import { AMV_ECOSYSTEM_INSTRUMENTS, buildEcosystemContext } from '../../core/ecosystemInstrumentFactory'
import type { AmvRuntimeRequest } from '../../core/amvTypes'

export function buildCognitiveTwinEngineContext(request: AmvRuntimeRequest) {
  return buildEcosystemContext(AMV_ECOSYSTEM_INSTRUMENTS['cognitive-twin-engine'], request)
}
