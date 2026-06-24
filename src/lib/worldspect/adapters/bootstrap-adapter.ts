import type { SourceObservation, WorldSpectAdapter } from '../source-adapter-contract'
import type { WorldSpectSourceDefinition } from '../source-registry'

export function createBootstrapAdapter(definition: WorldSpectSourceDefinition): WorldSpectAdapter {
  return {
    sourceId: definition.sourceId,
    async observe(): Promise<SourceObservation> {
      const missingEnv = definition.requiredEnv.filter((key) => !process.env[key])
      return {
        sourceId: definition.sourceId,
        domain: definition.domain,
        observedAt: new Date().toISOString(),
        layer: 'UNKNOWN',
        meaning: {
          indicator: definition.sourceId,
          description: 'Bootstrap placeholder for a WorldSpect source definition.',
          high_means: 'No operational meaning until the source is active.',
          low_means: 'No operational meaning until the source is active.',
        },
        accessKind: definition.accessKind,
        status: missingEnv.length ? 'AWAITING_CREDENTIALS' : 'BOOTSTRAPPED',
        value: null,
        velocity: 0,
        volatility: 0,
        persistence: 0,
        rawCount: 0,
        sourceCount: 0,
        trust: 0,
        degradation: 1,
        signal: {},
        error: missingEnv.length ? `ENV_REQUIRED:${missingEnv.join(',')}` : null,
      }
    },
  }
}

