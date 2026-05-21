'use client'

import { useEffect, useState } from 'react'
import { SfiFieldShell } from '@/observatory/components/field/SfiFieldShell'
import { useTelemetryPulse } from '@/observatory/hooks/useTelemetryPulse'
import { useNodeStore } from '@/observatory/store/nodeStore'
import type { SfiAsset } from '@/lib/types'
import { migrateLocalNodeToSupabase } from '@/observatory/persistence/migrateLocalNodeToSupabase'
import { getSfiRuntimeFlags } from '@/lib/config/sfiFlags'
import { readTerminalCanonicalState, type TerminalCanonicalClientResult } from '@/lib/terminal/canonicalClient'

type AccessState = 'loading' | 'allowed' | 'local'
type TerminalMode = 'legacy' | 'canonical' | 'degraded'

function canonicalFieldValue(fieldState: unknown, key: string) {
  if (!fieldState || typeof fieldState !== 'object') return null
  const value = (fieldState as Record<string, unknown>)[key]
  if (typeof value === 'string' || typeof value === 'number') return value
  return null
}

function TerminalStatusBadges({
  canonicalState,
  mode,
}: {
  canonicalState: TerminalCanonicalClientResult | null
  mode: TerminalMode
}) {
  const fieldSource = canonicalState?.fieldState ? 'derived' : 'missing'
  const signalCount = canonicalState?.signals?.signals.length ?? 0
  const sourceStatus = canonicalState?.sourceHealth?.status ?? 'unknown'

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[80] flex max-w-[calc(100vw-2rem)] flex-wrap justify-end gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#C8A951]">
      <span className="border border-[rgba(200,169,81,0.20)] bg-[#060605]/80 px-2 py-1 backdrop-blur-sm">
        CANONICAL: {fieldSource}
      </span>
      <span className="border border-[rgba(200,169,81,0.20)] bg-[#060605]/80 px-2 py-1 backdrop-blur-sm">
        SIGNALS: {signalCount}
      </span>
      <span className="border border-[rgba(200,169,81,0.20)] bg-[#060605]/80 px-2 py-1 backdrop-blur-sm">
        SOURCE: {sourceStatus}
      </span>
      <span className="border border-[rgba(200,169,81,0.20)] bg-[#060605]/80 px-2 py-1 backdrop-blur-sm">
        MODE: {mode}
      </span>
    </div>
  )
}

function TerminalFieldStatePanel({ canonicalState }: { canonicalState: TerminalCanonicalClientResult | null }) {
  const fieldState = canonicalState?.fieldState ?? null
  const sourceState = canonicalFieldValue(fieldState, 'sourceState') ?? (fieldState ? 'derived' : 'missing')
  const evidenceLevel = canonicalFieldValue(fieldState, 'evidenceLevel') ?? (fieldState ? 'behavioral' : 'none')
  const regime = canonicalFieldValue(fieldState, 'regime') ?? 'unknown'
  const confidence = canonicalFieldValue(fieldState, 'confidence') ?? 0
  const degradation = canonicalFieldValue(fieldState, 'degradation') ?? 0
  const operationalCapacity = canonicalFieldValue(fieldState, 'operationalCapacity') ?? 0
  const updatedAt = canonicalFieldValue(fieldState, 'updatedAt') ?? 'missing'

  return (
    <aside className="pointer-events-none fixed bottom-4 right-4 z-[80] w-[min(360px,calc(100vw-2rem))] border border-[rgba(200,169,81,0.18)] bg-[#060605]/85 p-3 font-mono text-[#C8A951] shadow-[0_0_24px_rgba(0,0,0,0.45)] backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between gap-3 text-[9px] uppercase tracking-[0.22em]">
        <span>FIELDSTATE</span>
        <span>{sourceState}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] uppercase tracking-[0.12em] text-[#e8d18a]">
        <span>regime</span>
        <span className="text-right">{regime}</span>
        <span>evidence</span>
        <span className="text-right">{evidenceLevel}</span>
        <span>confidence</span>
        <span className="text-right">{confidence}</span>
        <span>degradation</span>
        <span className="text-right">{degradation}</span>
        <span>capacity</span>
        <span className="text-right">{operationalCapacity}</span>
      </div>
      <div className="mt-2 border-t border-[rgba(200,169,81,0.12)] pt-2 text-[8px] uppercase tracking-[0.14em] text-[#8e7b42]">
        updated: {updatedAt}
      </div>
    </aside>
  )
}

export default function TerminalPage() {
  useTelemetryPulse()
  const bootstrap = useNodeStore((state) => state.bootstrap)
  const [access, setAccess] = useState<AccessState>('loading')
  const [email, setEmail] = useState('')
  const [nodeId, setNodeId] = useState<string | null>(null)
  const [assets, setAssets] = useState<SfiAsset[]>([])
  const [activeAssetId, setActiveAssetId] = useState('')
  const [localNode, setLocalNode] = useState<Record<string, any> | null>(null)
  const [canPersist, setCanPersist] = useState(false)
  const [canonicalState, setCanonicalState] = useState<TerminalCanonicalClientResult | null>(null)
  const [terminalMode, setTerminalMode] = useState<TerminalMode>('legacy')

  useEffect(() => {
    const stored = window.localStorage.getItem('sfi_local_node')
    if (stored) {
      try {
        setLocalNode(JSON.parse(stored))
      } catch {
        window.localStorage.removeItem('sfi_local_node')
      }
    }

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
        const userEmail = data.user?.email || data.profile?.email || ''
        const licenseStatus = data.license?.status

        const isRoot =
          role === 'root' ||
          role === 'system' ||
          userEmail.toLowerCase() === 'aptymok@gmail.com'

        const hasAccess =
          isRoot ||
          data.entitlements?.full_access === true ||
          licenseStatus === 'root_bypass' ||
          licenseStatus === 'active' ||
          licenseStatus === 'trialing'

        if (active) {
          const nextAssets = Array.isArray(data.sfi_assets) ? data.sfi_assets : []

          setEmail(userEmail)
          setNodeId(data.node?.id || null)
          setAssets(nextAssets)
          setActiveAssetId(nextAssets[0]?.asset_id || '')
          setCanPersist(hasAccess)
          setAccess(hasAccess ? 'allowed' : 'local')

          const flags = getSfiRuntimeFlags()

          if (flags.canonicalFieldRead && data.node?.id) {
            void readTerminalCanonicalState(data.node.id)
              .then((result) => {
                if (!active) return
                setCanonicalState(result)
                setTerminalMode(result.warnings.length ? 'degraded' : 'canonical')
              })
              .catch(() => {
                if (!active) return
                setCanonicalState(null)
                setTerminalMode('degraded')
              })
          }

          if (hasAccess && stored) {
            try {
              const local = JSON.parse(stored)

              if (local?.paymentState !== 'persisted') {
                const migration = await migrateLocalNodeToSupabase(local)

                if (migration.ok) {
                  const migrated = {
                    ...local,
                    paymentState: 'persisted',
                    supabaseAssetId: migration.assetId,
                    updatedAt: new Date().toISOString(),
                  }

                  window.localStorage.setItem('sfi_local_node', JSON.stringify(migrated))
                  setLocalNode(migrated)
                }
              }
            } catch {
              // Local migration is best effort; terminal remains usable.
            }
          }
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
      <main className="flex min-h-screen items-center justify-center bg-[#060605] text-paper">
        <div className="border border-[rgba(200,169,81,0.12)] px-8 py-6 font-mono text-[10px] uppercase tracking-[0.24em] text-[#C8A951]">
          HIDRATANDO NODO LONGITUDINAL
        </div>
      </main>
    )
  }

  if (access === 'local') {
    const encodedEmail = encodeURIComponent(email)

    return (
      <>
        <TerminalStatusBadges canonicalState={canonicalState} mode="legacy" />
        <TerminalFieldStatePanel canonicalState={canonicalState} />
        <SfiFieldShell
          nodeId={null}
          assets={[]}
          activeAssetId=""
          onAssetsChange={setAssets}
          onActiveAssetChange={setActiveAssetId}
          persistenceMode="local_only"
          localNode={localNode}
          paywallLinks={{
            full: `https://buy.stripe.com/3cIbJ29dY3qo2NVcWv5Ne01?prefilled_email=${encodedEmail}`,
            report: `https://buy.stripe.com/7sYbJ2eyif964W3aOn5Ne04?prefilled_email=${encodedEmail}`,
          }}
        />
      </>
    )
  }

  return (
    <>
      <TerminalStatusBadges canonicalState={canonicalState} mode={terminalMode} />
      <TerminalFieldStatePanel canonicalState={canonicalState} />
      <SfiFieldShell
        nodeId={nodeId}
        assets={assets}
        activeAssetId={activeAssetId}
        onAssetsChange={setAssets}
        onActiveAssetChange={setActiveAssetId}
        persistenceMode={canPersist ? 'supabase' : 'local_only'}
        localNode={localNode}
      />
    </>
  )
}
