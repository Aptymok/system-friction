type ContextRecord = Record<string, unknown>

export type BoundedContextScope = 'signal-vane' | 'cluster-atlas'

export type BoundedContextReading = {
  digest: string
  evidenceCount: number
  confidence: number
  summary: string
  warnings: string[]
}

function record(value: unknown): ContextRecord | null {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    ? value as ContextRecord
    : null
}

function recordArray(value: unknown): ContextRecord[] {
  return Array.isArray(value)
    ? value.map(record).filter((item): item is ContextRecord => Boolean(item))
    : []
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 64)
    : []
}

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numeric(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`
  const source = value as ContextRecord
  return `{${Object.keys(source).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(source[key])}`).join(',')}}`
}

function digest(value: unknown) {
  const source = stableSerialize(value)
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `ctx-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function frequency(values: string[]) {
  const map = new Map<string, { label: string; count: number }>()
  for (const raw of values) {
    const label = raw.trim()
    if (!label) continue
    const key = label.toLocaleLowerCase('es-MX')
    const existing = map.get(key)
    if (existing) existing.count += 1
    else map.set(key, { label, count: 1 })
  }
  return [...map.values()].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, 'es-MX'))
}

function renderTop(values: string[], limit = 4, minimumCount = 1) {
  const selected = frequency(values).filter((item) => item.count >= minimumCount).slice(0, limit)
  return selected.length ? selected.map((item) => `${item.label}×${item.count}`).join(', ') : 'ninguno'
}

function rounded(value: number) {
  return Math.round(value * 100) / 100
}

export function buildBoundedContextReading(scope: BoundedContextScope, selectedContext: unknown): BoundedContextReading | null {
  const context = record(selectedContext)
  if (!context) return null

  const observations = recordArray(context.observations)
  const hypotheses = recordArray(context.hypotheses)
  const outcomes = recordArray(context.outcomes)
  const investigations = recordArray(context.investigations)
  const evidenceCount = observations.length + hypotheses.length + outcomes.length + investigations.length

  const affectedSystems = observations.flatMap((item) => strings(item.affectedSystems))
  const actors = observations.flatMap((item) => strings(item.actors))
  const investigationSystems = investigations.flatMap((item) => strings(item.systems))
  const variables = investigations.flatMap((item) => strings(item.variables))
  const sourceFamilies = observations.map((item) => text(item.sourceFamily)).filter((item): item is string => Boolean(item))
  const hypothesisStatuses = hypotheses.map((item) => text(item.status)).filter((item): item is string => Boolean(item))
  const outcomeClasses = outcomes.map((item) => text(item.classification)).filter((item): item is string => Boolean(item))
  const expectedSignals = hypotheses.reduce((sum, item) => sum + strings(item.expectedSignals).length, 0)
  const contradictionSignals = hypotheses.reduce((sum, item) => sum + strings(item.contradictionSignals).length, 0)
  const confidenceValues = observations.map((item) => numeric(item.confidence)).filter((item): item is number => item !== null)
  const averageObservationConfidence = confidenceValues.length
    ? rounded(confidenceValues.reduce((sum, item) => sum + item, 0) / confidenceValues.length)
    : null

  const visibleSystems = [...affectedSystems, ...investigationSystems]
  const recurringFieldLabels = [...visibleSystems, ...actors, ...variables]
  const contextDigest = digest(context)
  const confidence = evidenceCount === 0
    ? 0.42
    : rounded(Math.min(0.78, 0.5 + Math.log10(evidenceCount + 1) * 0.12))
  const warnings: string[] = []

  if (evidenceCount === 0) warnings.push(`${scope}_context_empty`)

  if (scope === 'signal-vane') {
    if (!expectedSignals && !contradictionSignals && outcomes.length === 0) warnings.push('signal-vane_threshold_evidence_sparse')
    const summary = [
      `Signal Vane lectura contextual ${contextDigest}: ${observations.length} observaciones, ${hypotheses.length} hipotesis, ${outcomes.length} retornos y ${investigations.length} investigaciones.`,
      `Sistemas visibles: ${renderTop(visibleSystems)}; actores: ${renderTop(actors)}; fuentes: ${renderTop(sourceFamilies)}.`,
      `Senales esperadas=${expectedSignals}; contradicciones declaradas=${contradictionSignals}; estados de hipotesis=${renderTop(hypothesisStatuses)}; outcomes=${renderTop(outcomeClasses)}${averageObservationConfidence === null ? '' : `; confianza media declarada de observaciones=${averageObservationConfidence}`}.`,
      'Lectura DERIVED del contexto suministrado; no convierte proyeccion, recurrencia o hipotesis en hecho observado.',
    ].join(' ')
    return { digest: contextDigest, evidenceCount, confidence, summary, warnings }
  }

  const recurring = renderTop(recurringFieldLabels, 6, 2)
  if (recurring === 'ninguno') warnings.push('cluster-atlas_no_recurrence_above_threshold')
  const summary = [
    `Cluster Atlas lectura contextual ${contextDigest}: ${observations.length} observaciones, ${hypotheses.length} hipotesis, ${outcomes.length} retornos y ${investigations.length} investigaciones.`,
    `Recurrencias de campo con frecuencia >=2: ${recurring}; sistemas: ${renderTop(visibleSystems)}; variables Method Lab: ${renderTop(variables)}.`,
    `Actores: ${renderTop(actors)}; outcomes=${renderTop(outcomeClasses)}.`,
    'La recurrencia y co-presencia son DERIVED; no implican causalidad, cambio de regimen demostrado ni autorizan crear una entidad productiva.',
  ].join(' ')
  return { digest: contextDigest, evidenceCount, confidence, summary, warnings }
}
