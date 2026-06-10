import { sha256 } from '@/lib/sfi/evidence'

export type AmvRequiredAction = 'answer' | 'ask_human' | 'propose_observation' | 'refuse' | 'defer'
export type AmvSourceTrust = 'verified' | 'declared' | 'inferred' | 'unknown'

export type AmvInput = {
  module: string
  sessionId: string
  message: string
  context?: Record<string, unknown>
}

export type AmvMemoryReference = {
  id: string
  createdAt: string
  module: string
  summary: string
  evidenceHash: string
}

export type AmvInference = {
  intent: string
  uncertainty: number
  impact: number
  requiredAction: AmvRequiredAction
  usedMemory: string[]
  sourceTrust: AmvSourceTrust
}

export type AmvMemoryDelta = {
  id: string
  module: string
  sessionId: string
  kind: 'registro' | 'inferencia' | 'hipotesis' | 'propuesta' | 'verificacion'
  message: string
  response: string
  summary: string
  inference: AmvInference
  evidenceHash: string
  createdAt: string
  context?: Record<string, unknown>
}

export type AmvResponse = {
  ok: boolean
  response: string
  inference: AmvInference
  memoryDelta: AmvMemoryDelta
  requiresHumanValidation: boolean
  nextObservation: string | null
}

const HIGH_UNCERTAINTY = 0.65
const HIGH_IMPACT = 0.7

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function hasContext(context: AmvInput['context']) {
  return Boolean(context && Object.keys(context).length > 0)
}

function sourceTrustFor(input: AmvInput, memory: AmvMemoryReference[]): AmvSourceTrust {
  const context = input.context ?? {}
  if (typeof context.evidenceHash === 'string' || typeof context.hash === 'string') return 'verified'
  if (hasContext(input.context)) return 'declared'
  if (memory.length > 0) return 'inferred'
  return 'unknown'
}

function inferIntent(text: string) {
  const lower = text.toLowerCase()
  if (/(borrar|delete|secreto|credential|token|password|filtra)/.test(lower)) return 'refuse_unsafe_or_private'
  if (/(registra|guarda|log|bitacora|memoria)/.test(lower)) return 'registro'
  if (/(verifica|comprueba|corrobora|evidencia|fuente)/.test(lower)) return 'verificacion'
  if (/(propone|ruta|observa|observacion|siguiente)/.test(lower)) return 'propuesta'
  if (/(hipotesis|hipótesis|podria|podría|supone|infer)/.test(lower)) return 'hipotesis'
  return 'lectura'
}

function estimateImpact(text: string, input: AmvInput) {
  const lower = text.toLowerCase()
  let impact = 0.28
  if (/(publica|publish|deploy|commit|push|supabase|schema|delete|borrar|registr)/.test(lower)) impact += 0.32
  if (/(scorefriction|mop-h|moph|root|repository|repositorio|amv)/.test(input.module.toLowerCase())) impact += 0.12
  if (/(decide|ejecuta|cambia|muta|intervencion|intervención)/.test(lower)) impact += 0.22
  if (hasContext(input.context)) impact += 0.08
  return clamp01(impact)
}

function estimateUncertainty(text: string, input: AmvInput, memory: AmvMemoryReference[]) {
  const lower = text.toLowerCase()
  let uncertainty = 0.72
  if (hasContext(input.context)) uncertainty -= 0.18
  if (memory.length > 0) uncertainty -= Math.min(0.18, memory.length * 0.06)
  if (/(evidencia|hash|fuente|verifica|corrobora)/.test(lower)) uncertainty -= 0.08
  if (/(creo|quizas|quizás|tal vez|supongo|sin datos|no se)/.test(lower)) uncertainty += 0.12
  if (text.length < 12) uncertainty += 0.08
  return clamp01(uncertainty)
}

function requiredAction(intent: string, uncertainty: number, impact: number): AmvRequiredAction {
  if (intent === 'refuse_unsafe_or_private') return 'refuse'
  if (impact > HIGH_IMPACT) return 'ask_human'
  if (uncertainty > HIGH_UNCERTAINTY) return 'ask_human'
  if (intent === 'propuesta' || intent === 'hipotesis') return 'propose_observation'
  return 'answer'
}

export function inferAmv(input: AmvInput, memory: AmvMemoryReference[] = []): AmvInference {
  const text = normalizeText(input.message)
  const intent = inferIntent(text)
  const uncertainty = estimateUncertainty(text, input, memory)
  const impact = estimateImpact(text, input)
  return {
    intent,
    uncertainty,
    impact,
    requiredAction: requiredAction(intent, uncertainty, impact),
    usedMemory: memory.slice(0, 5).map((item) => item.id),
    sourceTrust: sourceTrustFor(input, memory),
  }
}

export function composeAmvResponse(input: AmvInput, inference: AmvInference, memory: AmvMemoryReference[] = []) {
  const message = normalizeText(input.message)
  const evidenceLabel = inference.sourceTrust === 'unknown' ? 'sin evidencia externa conectada' : `soporte ${inference.sourceTrust}`
  const memoryLabel = memory.length ? `${memory.length} registro(s) de memoria local usados` : 'sin memoria previa util'

  if (inference.requiredAction === 'refuse') {
    return [
      `Registro: recibi una solicitud de riesgo en ${input.module}.`,
      'Inferencia: puede exponer credenciales, secretos o acciones destructivas.',
      'Hipotesis: la intencion necesita reformularse como observacion verificable.',
      'Propuesta: no ejecuto ni detallo ese vector; pide una revision segura y acotada.',
      'Verificacion: requiere humano antes de cualquier accion.',
    ].join('\n')
  }

  if (inference.uncertainty > HIGH_UNCERTAINTY) {
    return [
      `Registro: "${message}" en ${input.module}; ${evidenceLabel}; ${memoryLabel}.`,
      'Inferencia: la senal es insuficiente para afirmar una conclusion.',
      'Hipotesis: puede haber un patron, pero queda marcado como hipotesis no verificada.',
      'Propuesta: aporta fuente, hash, captura, evento o estado de runtime antes de cerrar lectura.',
      'Verificacion: AMV consulta; no afirma conocimiento sin evidencia.',
    ].join('\n')
  }

  if (inference.impact > HIGH_IMPACT) {
    return [
      `Registro: "${message}" en ${input.module}; ${evidenceLabel}.`,
      'Inferencia: la accion puede cambiar estado operativo o persistencia.',
      'Hipotesis: el efecto puede ser util, pero el riesgo excede respuesta autonoma.',
      'Propuesta: preparar una observacion con criterio de cierre y responsable humano.',
      'Verificacion: validacion humana requerida antes de ejecutar.',
    ].join('\n')
  }

  return [
    `Registro: "${message}" en ${input.module}; ${evidenceLabel}; ${memoryLabel}.`,
    `Inferencia: intent=${inference.intent}; incertidumbre=${inference.uncertainty.toFixed(2)}; impacto=${inference.impact.toFixed(2)}.`,
    'Hipotesis: la lectura es operativa y limitada al contexto recibido.',
    'Propuesta: conservar la traza y observar si aparece evidencia nueva o contradiccion.',
    'Verificacion: respuesta emitida como lectura trazable, no como certeza absoluta.',
  ].join('\n')
}

export function nextObservationFor(input: AmvInput, inference: AmvInference) {
  if (inference.requiredAction === 'refuse') return 'Reformular la solicitud sin secretos, credenciales ni operaciones destructivas.'
  if (inference.uncertainty > HIGH_UNCERTAINTY) return 'Anadir evidencia verificable: fuente, hash, timestamp, evento o captura del estado observado.'
  if (inference.impact > HIGH_IMPACT) return 'Solicitar validacion humana y definir criterio de cierre antes de ejecutar.'
  if (inference.requiredAction === 'propose_observation') return `Abrir observacion en ${input.module} con evento, resultado esperado y ventana de verificacion.`
  return null
}

export function createAmvMemoryDelta(input: AmvInput, response: string, inference: AmvInference): AmvMemoryDelta {
  const createdAt = new Date().toISOString()
  const raw = JSON.stringify({ input, response, inference, createdAt })
  const evidenceHash = sha256(raw)
  const kind: AmvMemoryDelta['kind'] =
    inference.intent === 'registro' ? 'registro' :
    inference.intent === 'verificacion' ? 'verificacion' :
    inference.intent === 'hipotesis' ? 'hipotesis' :
    inference.intent === 'propuesta' ? 'propuesta' :
    'inferencia'

  return {
    id: `amv_mem_${evidenceHash.slice(0, 16)}`,
    module: input.module,
    sessionId: input.sessionId,
    kind,
    message: normalizeText(input.message),
    response,
    summary: `${kind}:${input.module}:${normalizeText(input.message).slice(0, 96)}`,
    inference,
    evidenceHash,
    createdAt,
    context: input.context,
  }
}

export function createAmvResponse(input: AmvInput, memory: AmvMemoryReference[] = []): AmvResponse {
  const inference = inferAmv(input, memory)
  const response = composeAmvResponse(input, inference, memory)
  const memoryDelta = createAmvMemoryDelta(input, response, inference)
  return {
    ok: true,
    response,
    inference,
    memoryDelta,
    requiresHumanValidation: inference.impact > HIGH_IMPACT || inference.uncertainty > HIGH_UNCERTAINTY,
    nextObservation: nextObservationFor(input, inference),
  }
}
