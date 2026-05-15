export interface MetricsInput {
  narrative?: string
  responses?: Array<{ question_number: number; answer: string }>
  history?: Array<{ ihg: number; nti: number; narrative?: string | null; created_at?: string }>
}

export interface CalculatedMetrics {
  ihg: number
  nti: number
  ldi: number
  loop_score: number
  divergence: number
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const tokenize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3)

export class MetricsEngine {
  static calculateIHG(input: MetricsInput): number {
    const text = `${input.narrative || ''} ${(input.responses || []).map((r) => r.answer).join(' ')}`
    const words = tokenize(text)
    if (words.length === 0 && !input.history?.length) return 0

    const evasion = ['intentar', 'quizas', 'deberia', 'podria', 'luego', 'cuando', 'depende', 'pero', 'aunque']
    const action = ['hago', 'decido', 'ejecuto', 'implementar', 'termine', 'entrego', 'mido', 'bloqueo']
    const contradiction = ['quiero', 'pero', 'necesito', 'aunque', 'siempre', 'nunca']

    const evasionScore = words.filter((w) => evasion.includes(w)).length
    const actionScore = words.filter((w) => action.includes(w)).length
    const contradictionScore = contradiction.filter((w) => words.includes(w)).length
    const historyAvg = input.history?.length
      ? input.history.slice(0, 5).reduce((sum, h) => sum + h.ihg, 0) / input.history.slice(0, 5).length
      : 0

    const raw = actionScore * 0.16 - evasionScore * 0.18 - contradictionScore * 0.07 + historyAvg * 0.28
    return clamp(raw, -1, 1)
  }

  static calculateNTI(input: MetricsInput): number {
    const text = `${input.narrative || ''} ${(input.responses || []).map((r) => r.answer).join(' ')}`
    if (!text.trim()) return 0.5
    const words = tokenize(text)
    const firstPerson = words.filter((w) => ['yo', 'mio', 'hice', 'quiero', 'evito', 'decido'].includes(w)).length
    const vague = words.filter((w) => ['algo', 'cosas', 'ellos', 'alguien', 'normal', 'problema'].includes(w)).length
    const specificity = Math.min(0.2, words.length / 260)
    return clamp(0.48 + firstPerson * 0.035 - vague * 0.03 + specificity, 0, 1)
  }

  static calculateLDI(input: MetricsInput): number {
    const text = `${input.narrative || ''} ${(input.responses || []).map((r) => r.answer).join(' ')}`
    const hoursMatch = text.match(/(\d+)\s*(h|hora|horas|dia|dias|semana|semanas|mes|meses)/i)
    if (!hoursMatch) return input.history?.length ? 48 : 72

    const value = Number(hoursMatch[1])
    const unit = hoursMatch[2].toLowerCase()
    if (unit.startsWith('h')) return value
    if (unit.startsWith('dia')) return value * 24
    if (unit.startsWith('semana')) return value * 168
    return value * 720
  }

  static calculateLoopScore(input: MetricsInput): number {
    const current = tokenize(input.narrative || '')
    const history = input.history?.slice(0, 4).flatMap((h) => tokenize(h.narrative || '')) || []
    if (current.length < 3 || history.length < 3) return 0
    const repeated = current.filter((w) => history.includes(w)).length
    return clamp(repeated / Math.max(5, current.length), 0, 1)
  }

  static calculateDivergence(ihg: number, nti: number): number {
    return clamp((1 - Math.abs(ihg)) * (1 - nti), 0, 1)
  }

  static calculateAll(input: MetricsInput): CalculatedMetrics {
    const ihg = this.calculateIHG(input)
    const nti = this.calculateNTI(input)
    const ldi = this.calculateLDI(input)
    const loop_score = this.calculateLoopScore(input)
    const divergence = this.calculateDivergence(ihg, nti)
    return { ihg, nti, ldi, loop_score, divergence }
  }
}