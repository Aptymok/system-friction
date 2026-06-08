import type { AmvSourceSignal, AmvTrustLevel } from './amvTypes'

const TRUST_ORDER: Record<AmvTrustLevel, number> = {
  observed: 4,
  derived: 3,
  degraded: 2,
  untrusted: 1,
}

export function weakestTrust(sources: AmvSourceSignal[]): AmvTrustLevel {
  if (!sources.length) return 'degraded'
  return sources.reduce<AmvTrustLevel>((weakest, source) => (
    TRUST_ORDER[source.trust] < TRUST_ORDER[weakest] ? source.trust : weakest
  ), 'observed')
}

export function trustWarning(trust: AmvTrustLevel) {
  if (trust === 'observed') return null
  if (trust === 'derived') return 'source_trust_derived'
  if (trust === 'degraded') return 'source_trust_degraded'
  return 'source_trust_untrusted'
}
