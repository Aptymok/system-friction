'use client'

import { useEffect, useState } from 'react'
import { SfiFieldShell } from '@/observatory/components/field/SfiFieldShell'
import { useTelemetryPulse } from '@/observatory/hooks/useTelemetryPulse'
import { useNodeStore } from '@/observatory/store/nodeStore'
import type { SfiAsset } from '@/lib/types'
import { migrateLocalNodeToSupabase } from '@/observatory/persistence/migrateLocalNodeToSupabase'

type AccessState = 'loading' | 'allowed' | 'local'

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
        const response = await fetch('/api/node/bootstrap', { cache: 'no-store', signal: controller.signal })
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
    )
  }

  return (
    <SfiFieldShell
      nodeId={nodeId}
      assets={assets}
      activeAssetId={activeAssetId}
      onAssetsChange={setAssets}
      onActiveAssetChange={setActiveAssetId}
      persistenceMode={canPersist ? 'supabase' : 'local_only'}
      localNode={localNode}
    />
  )
}
