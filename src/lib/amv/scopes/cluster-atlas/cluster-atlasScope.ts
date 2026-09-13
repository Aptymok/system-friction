import { buildBoundedContextReading } from '../../core/boundedContextReading'
import { AMV_ECOSYSTEM_INSTRUMENTS, createEcosystemScope } from '../../core/ecosystemInstrumentFactory'

const baseClusterAtlasScope = createEcosystemScope(AMV_ECOSYSTEM_INSTRUMENTS['cluster-atlas'])

export const clusterAtlasScope = {
  ...baseClusterAtlasScope,
  async decide(input: Parameters<typeof baseClusterAtlasScope.decide>[0]) {
    const decision = await baseClusterAtlasScope.decide(input)
    if (decision.risk === 'hard_stop') return decision

    const reading = buildBoundedContextReading('cluster-atlas', input.scopeContext.context.selectedContext)
    if (!reading) return decision

    return {
      ...decision,
      result: reading.summary,
      effect: reading.evidenceCount === 0
        ? 'El contexto existe pero no contiene evidencia material para sostener recurrencia; la salida queda degradada y no nombra fenomenos.'
        : 'La lectura contextual puede orientar agrupacion y memoria de campo; no infiere causalidad, no crea entidades y no escribe DB.',
      risk: reading.evidenceCount === 0 ? 'medium' as const : decision.risk,
      confidence: reading.confidence,
      warnings: [...new Set([...decision.warnings, ...reading.warnings])],
    }
  },
}
