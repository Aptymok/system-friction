import { AMV_ECOSYSTEM_INSTRUMENTS, buildEcosystemContext } from '../../core/ecosystemInstrumentFactory'
import type { AmvRuntimeRequest } from '../../core/amvTypes'

export function buildGovernanceRealityContext(request: AmvRuntimeRequest) {
  return buildEcosystemContext(AMV_ECOSYSTEM_INSTRUMENTS['governance-reality'], request)
}
