import { bootstrapSelfHealing } from './bootstrap'

let initialized = false

export function initKernel() {
  if (initialized) return
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') return

  initialized = true
  void bootstrapSelfHealing()
  console.log('[KERNEL] Self-healing initialized')
}
