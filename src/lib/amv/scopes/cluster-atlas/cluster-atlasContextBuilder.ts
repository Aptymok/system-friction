import { AMV_ECOSYSTEM_INSTRUMENTS, buildEcosystemContext } from '../../core/ecosystemInstrumentFactory'
import type { AmvRuntimeRequest } from '../../core/amvTypes'

export function buildClusterAtlasContext(request: AmvRuntimeRequest) {
  return buildEcosystemContext(AMV_ECOSYSTEM_INSTRUMENTS['cluster-atlas'], request)
}
