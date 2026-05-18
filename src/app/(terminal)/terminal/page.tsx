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

type CreateAssetPayload = {
  target_system: Record<string, unknown>
  objective: Record<string, unknown>
  state_vector: Record<string, unknown>
  current_phase: string
  metadata: Record<string, unknown>
}

function classifyRegime(phi: number) {
  if (phi > 0.6) return 'HOMEOSTATIC'
  if (phi > 0.3) return 'TRANSITION'
  return 'CRITICAL'
}

function calculatePhi(ihg: number, nti: number, ldiHours: number, xi: number) {
  const ldiNormalized = Math.max(0, ldiHours / 72)
  return Number(((ihg * nti) / (1 + ldiNormalized) + xi).toFixed(3))
}

function EmptyAssetsState({ onCreated }: { onCreated: (assets: SfiAsset[]) => void }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const form = new FormData(event.currentTarget)
    const ihg = Number(form.get('ihg') || 0)
    const nti = Number(form.get('nti') || 0)
    const ldiHours = Number(form.get('ldi_hours') || 0)
    const xi = Number(form.get('xi_noise') || 0)
    const phi = calculatePhi(ihg, nti, ldiHours, xi)
    const regime = classifyRegime(phi)

    const payload: CreateAssetPayload = {
      target_system: {
        name: String(form.get('target_name') || '').trim(),
        type: String(form.get('target_type') || '').trim(),
        location: String(form.get('target_location') || '').trim(),
      },
      objective: {
        declaration: String(form.get('objective') || '').trim(),
      },
      state_vector: {
        IHG: ihg,
        NTI_obs: nti,
        LDI_hours: ldiHours,
        xi_noise: xi,
        PHI_SF: phi,
        regime,
        runway_days: null,
      },
      current_phase: 'PHASE_0_ASSET_CREATED',
      metadata: {
        source: 'terminal_minimal_form',
      },
    }

    try {
      const assetResponse = await fetch('/api/sfi/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const assetResult = await assetResponse.json()
      if (!assetResponse.ok) throw new Error(assetResult.error || 'asset_create_failed')

      const assetId = assetResult.asset.asset_id
      const measurementResponse = await fetch(`/api/sfi/assets/${encodeURIComponent(assetId)}/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.state_vector),
      })
      const measurementResult = await measurementResponse.json().catch(() => null)
      if (!measurementResponse.ok) {
        console.error('[SFI_MEASUREMENT_CLIENT_ERROR]', measurementResult)
        throw new Error(measurementResult?.error || 'measurement_create_failed')
      }

      const listResponse = await fetch('/api/sfi/assets', { cache: 'no-store' })
      const listResult = await listResponse.json()
      onCreated(Array.isArray(listResult.assets) ? listResult.assets : [assetResult.asset])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'asset_create_failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#060605] px-4 py-8 text-[#c8c4b8]">
      <section className="w-full max-w-3xl border border-[rgba(200,169,81,0.12)] bg-black/30 p-7">
        <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#C8A951]">SFI-EVAL-ASSET</p>
        <h1 className="mt-4 font-display text-lg uppercase tracking-[0.16em] text-[#C8A951]">ESTADO VACIO OPERATIVO</h1>
        <p className="mt-5 font-serif text-sm leading-7 text-[#5c5c52]">
          No existen assets persistentes para esta sesion. El observatorio queda listo para leer datos reales desde Supabase cuando se registre el primer asset.
        </p>
        <form onSubmit={submit} className="mt-7 grid gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Field name="target_name" label="nombre del sistema observado" required />
            <Field name="target_type" label="tipo" required />
            <Field name="target_location" label="ubicacion" required />
          </div>
          <Field name="objective" label="objetivo declarado" required />
          <div className="grid gap-4 md:grid-cols-4">
            <Field name="ihg" label="IHG" type="number" step="0.01" defaultValue="0.5" required />
            <Field name="nti" label="NTI_obs" type="number" step="0.01" defaultValue="0.5" required />
            <Field name="ldi_hours" label="LDI_hours" type="number" step="1" defaultValue="0" required />
            <Field name="xi_noise" label="xi_noise" type="number" step="0.001" defaultValue="0.05" required />
          </div>
          <button disabled={saving} className="border border-[rgba(200,169,81,0.35)] bg-[rgba(200,169,81,0.07)] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[#C8A951] disabled:opacity-50">
            {saving ? 'CREANDO ASSET' : 'CREAR ASSET'}
          </button>
          {error && <p className="border-l border-[#b85050] bg-[#b85050]/10 p-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#b85050]">{error}</p>}
        </form>
      </section>
    </main>
  )
}

function Field({
  name,
  label,
  type = 'text',
  step,
  defaultValue,
  required,
}: {
  name: string
  label: string
  type?: string
  step?: string
  defaultValue?: string
  required?: boolean
}) {
  return (
    <label className="block font-mono text-[10px] uppercase tracking-[0.18em] text-[#5c5c52]">
      {label}
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        required={required}
        className="mt-2 w-full border-0 border-b border-[rgba(200,169,81,0.18)] bg-black/30 px-3 py-3 font-mono text-sm text-[#c8c4b8] outline-none focus:border-[#C8A951]"
      />
    </label>
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
    return <EmptyAssetsState onCreated={setAssets} />
  }

  const activeAsset = assets[0]

  return (
    <main className="min-h-screen bg-[#060605] text-paper">
      <AssetHeader assets={assets} activeAsset={activeAsset} />
      <LiturgiaDiagnosticPanel asset={activeAsset} />
    </main>
  );
}
