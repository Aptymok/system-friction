'use client'

import { useEffect, useState } from 'react'
import { SfiCognitiveCanvasTerminal } from '@/observatory/components/field/SfiCognitiveCanvasTerminal'
import { useTelemetryPulse } from '@/observatory/hooks/useTelemetryPulse'
import { useNodeStore } from '@/observatory/store/nodeStore'
import { getSfiRuntimeFlags } from '@/lib/config/sfiFlags'
import { readTerminalCanonicalState, type TerminalCanonicalClientResult } from '@/lib/terminal/canonicalClient'

type AccessState = 'loading' | 'allowed' | 'local'
type TerminalMode = 'legacy' | 'canonical' | 'degraded'

export default function TerminalPage() {
  useTelemetryPulse()
  const bootstrap = useNodeStore((state) => state.bootstrap)
  const [access, setAccess] = useState<AccessState>('loading')
  const [nodeId, setNodeId] = useState<string | null>(null)
  const [canPersist, setCanPersist] = useState(false)
  const [canonicalState, setCanonicalState] = useState<TerminalCanonicalClientResult | null>(null)
  const [terminalMode, setTerminalMode] = useState<TerminalMode>('legacy')

  function refreshCanonicalState(nextNodeId: string | null) {
    const flags = getSfiRuntimeFlags()

    if (!flags.canonicalFieldRead || !nextNodeId) {
      setTerminalMode('legacy')
      return
    }

    void readTerminalCanonicalState(nextNodeId)
      .then((result) => {
        setCanonicalState(result)
        setTerminalMode(result.warnings.length ? 'degraded' : 'canonical')
      })
      .catch(() => {
        setCanonicalState(null)
        setTerminalMode('degraded')
      })
  }

  useEffect(() => {
    let active = true

    async function hydrate() {
      void bootstrap()

      try {
        const controller = new AbortController()
        const timeout = window.setTimeout(() => controller.abort(), 3000)

        const response = await fetch('/api/node/bootstrap', {
          cache: 'no-store',
          signal: controller.signal,
        })

        window.clearTimeout(timeout)

        if (!response.ok) {
          if (active) setAccess('local')
          return
        }

        const data = await response.json()
        const role = data.profile?.role
        const licenseStatus = data.license?.status

        const isRoot =
          role === 'root' ||
          role === 'system'

        const hasAccess =
          isRoot ||
          data.entitlements?.full_access === true ||
          licenseStatus === 'root_bypass' ||
          licenseStatus === 'active' ||
          licenseStatus === 'trialing'

        if (active) {
          const nextNodeId = data.node?.id || null
          setNodeId(nextNodeId)
          setCanPersist(hasAccess)
          setAccess(hasAccess ? 'allowed' : 'local')
          refreshCanonicalState(nextNodeId)
        }
      } catch {
        if (active) setAccess('local')
      }
    }

    void hydrate()

    return () => {
      active = false
    }
  }, [bootstrap])

  if (access === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080808] text-[#C8A951]">
        <div className="border border-[rgba(200,169,81,0.12)] px-8 py-6 font-mono text-[10px] uppercase tracking-[0.24em]">
          HIDRATANDO CAMPO COGNITIVO
        </div>
      </main>
    )
  }

  return (
    <SfiCognitiveCanvasTerminal
      nodeId={access === 'allowed' ? nodeId : null}
      canPersist={access === 'allowed' && canPersist}
      canonicalState={canonicalState}
      mode={access === 'allowed' ? terminalMode : 'legacy'}
      onSignalDeclared={() => refreshCanonicalState(nodeId)}
    />
  )
}
