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

function boundedPercent(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value || 0)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n * 100)))
}

function metricText(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value || 0)
  if (!Number.isFinite(n)) return '0.00'
  return n.toFixed(2)
}

function TerminalObservabilityHud({
  canonicalState,
  mode,
}: {
  canonicalState: TerminalCanonicalClientResult | null
  mode: TerminalMode
}) {
  const fieldState = canonicalState?.fieldState ?? null
  const signalCount = canonicalState?.signals?.signals.length ?? 0
  const sourceStatus = canonicalState?.sourceHealth?.status ?? 'unknown'
  const sourceState = canonicalFieldValue(fieldState, 'sourceState') ?? (fieldState ? 'derived' : 'missing')
  const evidenceLevel = canonicalFieldValue(fieldState, 'evidenceLevel') ?? (fieldState ? 'behavioral' : 'none')
  const regime = canonicalFieldValue(fieldState, 'regime') ?? 'unknown'
  const confidence = canonicalFieldValue(fieldState, 'confidence') ?? 0
  const degradation = canonicalFieldValue(fieldState, 'degradation') ?? 0
  const operationalCapacity = canonicalFieldValue(fieldState, 'operationalCapacity') ?? 0
  const updatedAt = canonicalFieldValue(fieldState, 'updatedAt') ?? 'missing'
  const degradationPct = boundedPercent(degradation)
  const capacityPct = boundedPercent(operationalCapacity)
  const confidencePct = boundedPercent(confidence)

  const flowNodes = [
    { label: 'SIGNAL', value: String(signalCount), state: signalCount > 0 ? 'active' : 'latent' },
    { label: 'FIELD', value: String(sourceState), state: sourceState === 'missing' ? 'latent' : 'derived' },
    { label: 'DEGRAD', value: `${degradationPct}%`, state: degradationPct > 45 ? 'critical' : degradationPct > 0 ? 'watch' : 'latent' },
    { label: 'SOURCE', value: String(sourceStatus), state: sourceStatus === 'healthy' ? 'active' : 'latent' },
  ]

  return (
    <section className="pointer-events-none fixed inset-x-3 top-3 z-[90] font-mono text-[#C8A951] sm:inset-x-auto sm:right-4 sm:top-4 sm:w-[390px]">
      <div className="border border-[rgba(200,169,81,0.16)] bg-[#060605]/88 shadow-[0_0_34px_rgba(0,0,0,0.58)] backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-[rgba(200,169,81,0.10)] px-3 py-2">
          <div className="flex min-w-0 flex-col">
            <span className="text-[8px] uppercase tracking-[0.30em] text-[#8e7b42]">SFI · TERMINAL</span>
            <span className="truncate text-[10px] uppercase tracking-[0.16em] text-[#e8d18a]">observatorio de campo</span>
          </div>
          <div className="flex items-center gap-2 text-[8px] uppercase tracking-[0.16em]">
            <span className="border border-[rgba(200,169,81,0.18)] px-2 py-1 text-[#C8A951]">{mode}</span>
            <span className="border border-[rgba(200,169,81,0.18)] px-2 py-1 text-[#8e7b42]">{regime}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-0 border-b border-[rgba(200,169,81,0.08)]">
          {flowNodes.map((item, index) => (
            <div key={item.label} className="relative flex flex-col items-center gap-1 border-r border-[rgba(200,169,81,0.08)] px-2 py-2 last:border-r-0">
              <span
                className={[
                  'h-2.5 w-2.5 rotate-45 border',
                  item.state === 'active' ? 'border-[#40B070] bg-[#40B070]/25 shadow-[0_0_10px_rgba(64,176,112,0.45)]' : '',
                  item.state === 'derived' ? 'border-[#C8A951] bg-[#C8A951]/20 shadow-[0_0_10px_rgba(200,169,81,0.35)]' : '',
                  item.state === 'watch' ? 'border-[#b08030] bg-[#b08030]/20' : '',
                  item.state === 'critical' ? 'border-[#E04040] bg-[#E04040]/20 shadow-[0_0_10px_rgba(224,64,64,0.35)]' : '',
                  item.state === 'latent' ? 'border-[rgba(200,169,81,0.18)] bg-transparent' : '',
                ].join(' ')}
              />
              <span className="text-[7px] uppercase tracking-[0.16em] text-[#8e7b42]">{item.label}</span>
              <span className="max-w-full truncate text-[8px] uppercase tracking-[0.08em] text-[#e8d18a]">{item.value}</span>
              {index < flowNodes.length - 1 && <span className="absolute right-[-5px] top-[15px] text-[9px] text-[rgba(200,169,81,0.30)]">→</span>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-[#8e7b42]">
          <MetricBar label="ρ" value={confidencePct} raw={metricText(confidence)} />
          <MetricBar label="D" value={degradationPct} raw={metricText(degradation)} />
          <MetricBar label="CO" value={capacityPct} raw={metricText(operationalCapacity)} />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[rgba(200,169,81,0.08)] px-3 py-2 text-[7px] uppercase tracking-[0.12em] text-[#6f6338]">
          <span className="truncate">evidence: {evidenceLevel}</span>
          <span className="truncate text-right">updated: {updatedAt}</span>
        </div>
      </div>
    </section>
  )
}

function MetricBar({ label, value, raw }: { label: string; value: number; raw: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span>{label}</span>
        <span className="text-[#e8d18a]">{raw}</span>
      </div>
      <div className="h-px w-full bg-[rgba(200,169,81,0.12)]">
        <div className="h-px bg-[#C8A951]" style={{ width: `${value}%` }} />
      </div>
    </div>
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
        <TerminalObservabilityHud canonicalState={canonicalState} mode="legacy" />
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
      <TerminalObservabilityHud canonicalState={canonicalState} mode={terminalMode} />
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
