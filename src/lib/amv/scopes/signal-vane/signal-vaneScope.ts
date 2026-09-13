import { buildBoundedContextReading } from '../../core/boundedContextReading'
import { AMV_ECOSYSTEM_INSTRUMENTS, createEcosystemScope } from '../../core/ecosystemInstrumentFactory'

const baseSignalVaneScope = createEcosystemScope(AMV_ECOSYSTEM_INSTRUMENTS['signal-vane'])

export const signalVaneScope = {
  ...baseSignalVaneScope,
  async decide(input: Parameters<typeof baseSignalVaneScope.decide>[0]) {
    const decision = await baseSignalVaneScope.decide(input)
    if (decision.risk === 'hard_stop') return decision

    const reading = buildBoundedContextReading('signal-vane', input.scopeContext.context.selectedContext)
    if (!reading) return decision

    return {
      ...decision,
      result: reading.summary,
      effect: reading.evidenceCount === 0
        ? 'El contexto existe pero no contiene evidencia material para sostener una alerta; la salida queda degradada y no alimenta regimen.'
        : 'La lectura contextual puede orientar observacion o reporte; no ejecuta mitigacion, no escribe DB y no convierte proyeccion en hecho.',
      risk: reading.evidenceCount === 0 ? 'medium' as const : decision.risk,
      confidence: reading.confidence,
      warnings: [...new Set([...decision.warnings, ...reading.warnings])],
    }
  },
}
