'use client'

import { useEffect } from 'react'
import { useNodeStore } from '@/observatory/store/nodeStore'

export function useTelemetryPulse() {
  useEffect(() => {
    const state = useNodeStore.getState()
    state.loadSnapshotHistory()

    if (!state.snapshotHistory.length) {
      state.addSnapshot('Inicio de observación', 'Nodo operacional inicializado')
    }

    const tick = () => {
      const current = useNodeStore.getState()
      if (current.metrics.nti > 0.75) {
        current.ingestSignal('contradiction', 'Aumento de trazabilidad interna')
      } else if (current.metrics.ldi > 0.5) {
        current.ingestSignal('evasion', 'Latencia de decisión creciente')
      } else {
        current.ingestSignal('syncPulse', 'Pulso de sincronización')
      }
    }

    const interval = window.setInterval(tick, 16000)
    return () => window.clearInterval(interval)
  }, [])
}
