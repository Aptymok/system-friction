import { bootstrapSelfHealing } from './bootstrap'

let initialized = false

export function initKernel() {
  if (initialized) return

  initialized = true
  bootstrapSelfHealing()
  console.log('[KERNEL] Self-healing initialized')
}
