'use client'

import { useEffect, useState } from 'react'
import { SfiFieldShell } from '@/observatory/components/field/SfiFieldShell'
import { useTelemetryPulse } from '@/observatory/hooks/useTelemetryPulse'
import { useNodeStore } from '@/observatory/store/nodeStore'
import type { SfiAsset } from '@/lib/types'

type AccessState = 'loading' | 'allowed' | 'payment'

export default function TerminalPage() {
  useTelemetryPulse()
  const bootstrap = useNodeStore((state) => state.bootstrap)
  const [access, setAccess] = useState<AccessState>('loading')
  const [email, setEmail] = useState('')
  const [nodeId, setNodeId] = useState<string | null>(null)
  const [assets, setAssets] = useState<SfiAsset[]>([])
  const [activeAssetId, setActiveAssetId] = useState('')

  useEffect(() => {
    let active = true
    async function hydrate() {
      await bootstrap()
      try {
        const response = await fetch('/api/node/bootstrap', { cache: 'no-store' })
        if (!response.ok) {
          if (active) setAccess('payment')
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
          setAccess(hasAccess ? 'allowed' : 'payment')
        }
      } catch {
        if (active) setAccess('payment')
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

  if (access === 'payment') {
    const encodedEmail = encodeURIComponent(email)
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#060605] px-4 text-[#c8c4b8]">
        <section className="w-full max-w-xl border border-[rgba(200,169,81,0.12)] bg-black/30 p-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#C8A951]">ACCESO LONGITUDINAL PENDIENTE</p>
          <h1 className="mt-4 font-display text-lg uppercase tracking-[0.16em] text-[#C8A951]">ADQUIRIR LINEA BASE</h1>
          <p className="mt-5 font-serif text-sm leading-7 text-[#5c5c52]">
            La sesion existe. Falta peaje de auditoria para abrir el campo operativo.
          </p>
          <div className="mt-7 grid gap-3 font-mono text-[10px] uppercase tracking-[0.18em]">
            <a className="border border-[rgba(200,169,81,0.45)] bg-[rgba(200,169,81,0.07)] px-5 py-4 text-center text-[#C8A951]" href={`https://buy.stripe.com/3cIbJ29dY3qo2NVcWv5Ne01?prefilled_email=${encodedEmail}`}>
              BUNDLE COMPLETO - $19 USD
            </a>
            <a className="border border-[rgba(200,169,81,0.22)] px-5 py-4 text-center text-[#C8A951]" href={`https://buy.stripe.com/7sYbJ2eyif964W3aOn5Ne04?prefilled_email=${encodedEmail}`}>
              SOLO DICTAMEN - $9 USD
            </a>
          </div>
        </section>
      </main>
    )
  }

  return (
    <SfiFieldShell
      nodeId={nodeId}
      assets={assets}
      activeAssetId={activeAssetId}
      onAssetsChange={setAssets}
      onActiveAssetChange={setActiveAssetId}
    />
  )
}
