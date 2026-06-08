export type AmvProjectionRequest = {
  scope: string
  subject?: string
  scenario?: string
  horizon?: 'now' | 'short' | 'medium' | 'long'
}

export type AmvProjectionScenario = {
  id: string
  label: string
  probability: number
  impact: 'low' | 'medium' | 'high'
  evidenceBoundary: string
}

export type AmvProjectionResult = {
  ok: true
  sandboxOnly: true
  feedsRegime: false
  executesIntervention: false
  scope: string
  subject: string
  scenarios: AmvProjectionScenario[]
  warnings: string[]
}
