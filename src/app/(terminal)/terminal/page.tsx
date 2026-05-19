'use client'

import { useEffect, useMemo, useState } from 'react'
import { LiturgiaDiagnosticPanel } from '@/observatory/components/root/LiturgiaDiagnosticPanel'
import { useTelemetryPulse } from '@/observatory/hooks/useTelemetryPulse'
import { useNodeStore } from '@/observatory/store/nodeStore'
import type { SfiAsset } from '@/lib/types'
import { inferOperationalReading, type SignalKind } from '@/lib/sfi/inference'

const signalKinds: Array<{ value: SignalKind; label: string }> = [
  { value: 'personal', label: 'personal' },
  { value: 'relacional', label: 'relacional' },
  { value: 'proyecto', label: 'proyecto' },
  { value: 'campania_redes', label: 'campaña/redes' },
  { value: 'documento', label: 'documento' },
  { value: 'audio', label: 'audio' },
  { value: 'codigo', label: 'código' },
  { value: 'url', label: 'URL' },
  { value: 'estrategia', label: 'estrategia' },
  { value: 'imagen', label: 'imagen' },
  { value: 'video', label: 'video' },
]

function textFromRecord(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key]
  return typeof value === 'string' ? value : ''
}

function assetLabel(asset: SfiAsset) {
  return textFromRecord(asset.target_system, 'name') || asset.asset_id
}

function summarizeAsset(asset: SfiAsset) {
  const reading = asset.metadata?.operational_reading as
    | ReturnType<typeof inferOperationalReading>
    | undefined
  if (reading?.risk?.label) return `${reading.risk.label} · ${reading.phenomenon}`
  return textFromRecord(asset.objective, 'declaration') || 'Lectura persistente sin resumen operativo.'
}

type AccessState = 'loading' | 'allowed' | 'payment'

function SignalIntake({ onCreated }: { onCreated: (assets: SfiAsset[]) => void }) {
  const [kind, setKind] = useState<SignalKind>('personal')
  const [signal, setSignal] = useState('')
  const [evidenceName, setEvidenceName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const reading = useMemo(
    () =>
      signal.trim()
        ? inferOperationalReading({ kind, signal, evidenceLabel: evidenceName })
        : null,
    [kind, signal, evidenceName],
  )

  const handleFile = async (file: File | null) => {
    if (!file) return
    setEvidenceName(file.name)
    if (file.type.startsWith('text/') || /\.(txt|md|json|csv|log|tsx?|jsx?|py|sql|css|html)$/i.test(file.name)) {
      const text = await file.text()
      setSignal((current) => [current, `\n\n[${file.name}]\n${text.slice(0, 12000)}`].filter(Boolean).join(''))
      return
    }
    setSignal((current) =>
      [
        current,
        `\n\n[EVIDENCIA ADJUNTA]\nArchivo: ${file.name}\nTipo: ${file.type || 'desconocido'}\nTamaño: ${file.size} bytes\nExtraccion completa requerida en seguimiento.`,
      ]
        .filter(Boolean)
        .join(''),
    )
  }

  const submit = async () => {
    if (!reading || !signal.trim()) return
    setSaving(true)
    setError('')

    const targetName = signal
      .split(/\n|\.|\?/)[0]
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 72) || `Señal ${kind}`

    const payload = {
      target_system: {
        name: targetName,
        type: kind,
        source: 'signal_intake',
      },
      objective: {
        declaration: reading.nextAction,
        observed_signal: signal.slice(0, 12000),
      },
      state_vector: reading.technical,
      current_phase: 'SIGNAL_ANALYZED',
      metadata: {
        source: 'terminal_signal_intake',
        signal_kind: kind,
        evidence_name: evidenceName || null,
        operational_reading: reading,
        eval_asset_active: ['campania_redes', 'audio', 'imagen', 'video'].includes(kind),
      },
    }

    try {
      const assetResponse = await fetch('/api/sfi/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const assetResult = await assetResponse.json().catch(() => null)
      if (!assetResponse.ok) throw new Error(assetResult?.error || 'asset_create_failed')

      const assetId = assetResult.asset.asset_id
      const measurementResponse = await fetch(`/api/sfi/assets/${encodeURIComponent(assetId)}/measurements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reading.technical),
      })
      const measurementResult = await measurementResponse.json().catch(() => null)
      if (!measurementResponse.ok) {
        console.error('[SFI_MEASUREMENT_CLIENT_ERROR]', measurementResult)
        throw new Error(measurementResult?.error || 'measurement_create_failed')
      }

      const listResponse = await fetch('/api/sfi/assets', { cache: 'no-store' })
      const listResult = await listResponse.json().catch(() => null)
      onCreated(Array.isArray(listResult?.assets) ? listResult.assets : [assetResult.asset])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'signal_intake_failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#060605] px-4 py-8 text-[#c8c4b8]">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col justify-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#C8A951]">SYSTEM FRICTION INSTITUTE</p>
        <h1 className="mt-4 max-w-3xl font-display text-2xl uppercase leading-tight tracking-[0.12em] text-[#C8A951]">
          entregar señal
        </h1>
        <p className="mt-5 max-w-2xl font-serif text-base leading-7 text-[#5c5c52]">
          El usuario no configura el sistema. Entrega una señal; SFI interpreta fricción, intervención y seguimiento.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="border border-[rgba(200,169,81,0.1)] bg-black/30 p-5">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {signalKinds.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setKind(item.value)}
                  className={`border px-3 py-3 font-mono text-[10px] uppercase tracking-[0.16em] ${
                    kind === item.value
                      ? 'border-[rgba(200,169,81,0.45)] bg-[rgba(200,169,81,0.08)] text-[#C8A951]'
                      : 'border-[rgba(200,169,81,0.08)] text-[#5c5c52]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <textarea
              value={signal}
              onChange={(event) => setSignal(event.target.value)}
              placeholder="Describe, pega, transcribe o deposita la señal observable..."
              className="mt-5 h-56 w-full resize-none border border-[rgba(200,169,81,0.1)] bg-[#060605] p-4 font-mono text-sm leading-6 text-[#c8c4b8] outline-none focus:border-[rgba(200,169,81,0.35)]"
            />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="cursor-pointer border border-[rgba(200,169,81,0.2)] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#C8A951]">
                adjuntar evidencia
                <input className="hidden" type="file" onChange={(event) => void handleFile(event.target.files?.[0] || null)} />
              </label>
              {evidenceName && <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#5c5c52]">{evidenceName}</span>}
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={!reading || saving}
              className="mt-5 w-full border border-[rgba(200,169,81,0.4)] bg-[rgba(200,169,81,0.07)] px-5 py-4 font-mono text-[10px] uppercase tracking-[0.24em] text-[#C8A951] disabled:opacity-40"
            >
              {saving ? 'analizando señal' : 'iniciar primera auditoría'}
            </button>
            {error && <p className="mt-4 border-l border-[#b85050] bg-[#b85050]/10 p-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[#b85050]">{error}</p>}
          </div>

          <div className="border border-[rgba(200,169,81,0.08)] bg-black/20 p-5">
            {reading ? (
              <div className="space-y-5">
                <ReadingLine title="fenómeno observado" value={reading.phenomenon} />
                <ReadingLine title="estabilidad operativa" value={`${reading.stability.label} · ${reading.stability.detail}`} />
                <ReadingLine title="trazabilidad" value={`${reading.traceability.label} · ${reading.traceability.detail}`} />
                <ReadingLine title="riesgo operativo" value={`${reading.risk.label} · ${reading.risk.detail}`} />
                <ReadingLine title="intervención propuesta" value={reading.intervention} />
                <ReadingLine title="siguiente acción" value={reading.nextAction} />
              </div>
            ) : (
              <div className="flex h-full min-h-80 items-center justify-center text-center font-mono text-[10px] uppercase tracking-[0.24em] text-[#2e2e2a]">
                esperando señal
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

function ReadingLine({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#2e2e2a]">{title}</p>
      <p className="mt-2 font-serif text-base leading-7 text-[#c8c4b8]">{value}</p>
    </div>
  )
}

function AssetHeader({ assets, activeAsset, onSelect }: { assets: SfiAsset[]; activeAsset: SfiAsset; onSelect: (assetId: string) => void }) {
  return (
    <div className="border-b border-[rgba(200,169,81,0.08)] bg-[#060605] px-5 py-3">
      <div className="flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-[0.18em] text-[#5c5c52]">
        <span className="text-[#C8A951]">SEÑALES PERSISTENTES: {assets.length}</span>
        <select
          value={activeAsset.asset_id}
          onChange={(event) => onSelect(event.target.value)}
          className="border border-[rgba(200,169,81,0.12)] bg-[#060605] px-3 py-2 text-[#C8A951]"
        >
          {assets.map((asset) => (
            <option key={asset.asset_id} value={asset.asset_id}>{assetLabel(asset)}</option>
          ))}
        </select>
        <span>{summarizeAsset(activeAsset)}</span>
      </div>
      <h1 className="mt-2 font-display text-sm uppercase tracking-[0.16em] text-[#C8A951]">{assetLabel(activeAsset)}</h1>
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
    return <SignalIntake onCreated={(nextAssets) => {
      setAssets(nextAssets)
      setActiveAssetId(nextAssets[0]?.asset_id || '')
    }} />
  }

  const activeAsset = assets.find((asset) => asset.asset_id === activeAssetId) || assets[0]

  return (
    <main className="min-h-screen bg-[#060605] text-paper">
      <AssetHeader assets={assets} activeAsset={activeAsset} onSelect={setActiveAssetId} />
      <LiturgiaDiagnosticPanel asset={activeAsset} nodeId={nodeId} />
    </main>
  )
}
