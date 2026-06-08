import { AMV_ECOSYSTEM_INSTRUMENTS, buildEcosystemContext } from '../../core/ecosystemInstrumentFactory'
import type { AmvRuntimeRequest } from '../../core/amvTypes'

export function buildSignalVaneContext(request: AmvRuntimeRequest) {
  return buildEcosystemContext(AMV_ECOSYSTEM_INSTRUMENTS['signal-vane'], request)
}
