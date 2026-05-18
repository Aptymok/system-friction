'use client'

import { useEffect, useState } from 'react'
import { LiturgiaDiagnosticPanel } from '@/observatory/components/root/LiturgiaDiagnosticPanel'
import { useTelemetryPulse } from '@/observatory/hooks/useTelemetryPulse'
import { useNodeStore } from '@/observatory/store/nodeStore'
import type { SfiAsset } from '@/lib/types'

function assetLabel(asset: SfiAsset) {
  const name = asset.target_system?.name
  return typeof name === 'string' && name.trim() ? name : asset.asset_id
}

function stateValue(asset: SfiAsset, key: string) {
  const value = asset.state_vector?.[key]
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return value
  return '-'
}

function EmptyAssetsState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#060605] px-4 text-[#c8c4b8]">
      <section className="w-full max-w-2xl border border-[rgba(200,169,81,0.12)] bg-black/30 p-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#C8A951]">SFI-EVAL-ASSET</p>
        <h1 className="mt-4 font-display text-lg uppercase tracking-[0.16em] text-[#C8A951]">ESTADO VACIO OPERATIVO</h1>
        <p className="mt-5 font-serif text-sm leading-7 text-[#5c5c52]">
          No existen assets persistentes para esta sesion. El observatorio queda listo para leer datos reales desde Supabase cuando se registre el primer asset.
        </p>
        <div className="mt-6 grid gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#5c5c52]">
          <span>assets: 0</span>
          <span>produccion simulada: desactivada</span>
          <span>social engine: inactivo</span>
        </div>
      </section>
    </main>
  )
}

function AssetHeader({ assets, activeAsset }: { assets: SfiAsset[]; activeAsset: SfiAsset }) {
  return (
    <div className="border-b border-[rgba(200,169,81,0.08)] bg-[#060605] px-5 py-3">
      <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#5c5c52]">
        <span className="text-[#C8A951]">ASSETS REALES: {assets.length}</span>
        <span>{activeAsset.asset_id}</span>
        <span>PHI {stateValue(activeAsset, 'PHI_SF')}</span>
        <span>IHG {stateValue(activeAsset, 'IHG')}</span>
        <span>NTI {stateValue(activeAsset, 'NTI_obs')}</span>
        <span>LDI {stateValue(activeAsset, 'LDI_hours')}h</span>
        <span>REGIMEN {stateValue(activeAsset, 'regime')}</span>
      </div>
      <h1 className="mt-2 font-display text-sm uppercase tracking-[0.16em] text-[#C8A951]">{assetLabel(activeAsset)}</h1>
    </div>
  )
}

export default function TerminalPage() {
  useTelemetryPulse()
  const bootstrap = useNodeStore((state) => state.bootstrap)
  const [access, setAccess] = useState<'loading' | 'allowed' | 'payment'>('loading')
  const [email, setEmail] = useState('')
  const [assets, setAssets] = useState<SfiAsset[]>([])

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
          setEmail(userEmail)
          setAssets(Array.isArray(data.sfi_assets) ? data.sfi_assets : [])
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
            La sesion existe. Falta peaje de auditoria para abrir el observatorio horizontal.
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

  if (!assets.length) {
    return <EmptyAssetsState />
  }

  const activeAsset = assets[0]

  return (
    <main className="min-h-screen bg-[#060605] text-paper">
      <AssetHeader assets={assets} activeAsset={activeAsset} />
      <LiturgiaDiagnosticPanel asset={activeAsset} />
    </main>
  );
}
