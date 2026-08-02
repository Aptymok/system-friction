'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Crosshair, Database, MapPin, RefreshCw, ShieldCheck } from 'lucide-react';

type GeoPrecision = 'exact_point' | 'neighborhood' | 'city' | 'metropolitan_area' | 'state' | 'country';

type Geo = {
  lat: number;
  lng: number;
  countryCode: string;
  country: string;
  admin1: string;
  city: string;
  label: string;
  precision: GeoPrecision;
  confidence: number;
  source: string;
  observedAt: string;
};

type FieldCase = {
  id: string;
  title: string;
  domain: string;
  status: string;
  verificationWindow: string;
  createdAt: string;
  evidenceCount: number;
  geo: Geo | null;
};

type MapResponse = {
  ok: boolean;
  sourceState?: string;
  generatedAt?: string;
  cases?: FieldCase[];
  summary?: { total: number; located: number; unlocated: number; evidence: number; countries: number };
  limits?: string[];
  error?: string;
  details?: string;
};

type GeoDraft = {
  caseId: string;
  lat: string;
  lng: string;
  countryCode: string;
  country: string;
  admin1: string;
  city: string;
  label: string;
  precision: GeoPrecision;
  confidence: number;
};

const EMPTY_DRAFT: GeoDraft = {
  caseId: '',
  lat: '',
  lng: '',
  countryCode: '',
  country: '',
  admin1: '',
  city: '',
  label: '',
  precision: 'city',
  confidence: 0.7,
};

function xy(geo: Geo) {
  return {
    left: `${((geo.lng + 180) / 360) * 100}%`,
    top: `${((90 - geo.lat) / 180) * 100}%`,
  };
}

function date(value: string) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime())
    ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed)
    : value || 'SIN FECHA';
}

function confidence(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export function FieldMapConsole() {
  const [data, setData] = useState<MapResponse | null>(null);
  const [selected, setSelected] = useState<FieldCase | null>(null);
  const [draft, setDraft] = useState<GeoDraft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/field/map', { cache: 'no-store', credentials: 'include' });
      const body = await response.json().catch(() => null) as MapResponse | null;
      if (!response.ok || !body?.ok) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setData(body);
      const fresh = body.cases?.find((item) => item.id === selected?.id) ?? null;
      if (fresh) setSelected(fresh);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'field_map_load_failed');
    } finally {
      setLoading(false);
    }
  }, [selected?.id]);

  useEffect(() => { void load(); }, [load]);

  const cases = data?.cases ?? [];
  const located = useMemo(() => cases.filter((item) => item.geo), [cases]);
  const unlocated = useMemo(() => cases.filter((item) => !item.geo), [cases]);

  async function saveGeo() {
    if (!draft.caseId) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/field/map', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          lat: Number(draft.lat),
          lng: Number(draft.lng),
        }),
      });
      const body = await response.json().catch(() => null) as { ok?: boolean; error?: string; details?: string } | null;
      if (!response.ok || !body?.ok) throw new Error(body?.details ?? body?.error ?? `HTTP ${response.status}`);
      setDraft(EMPTY_DRAFT);
      setMessage('Ubicación persistida. El nodo ahora proviene de FIELD, no de un mock.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'field_map_geo_write_failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#020507] text-[#d9e2df]">
      <header className="flex flex-col gap-4 border-b border-[#24323a] bg-[#05090c] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#b9924c]">SFI · FIELD / MAP</div>
          <h1 className="mt-2 text-2xl font-semibold text-[#eef3ef]">Campo geográfico de observaciones persistidas</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#809099]">Sólo se dibujan casos FIELD con coordenadas guardadas explícitamente. No se infiere ubicación desde texto y no existen nodos de demostración.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 border border-[#35505b] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#9fc6cf]"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar</button>
          <Link href="/field" className="border border-[#6f5831] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#d7b66e]">FIELD</Link>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-px border-b border-[#24323a] bg-[#24323a] md:grid-cols-5">
        {[
          ['CASOS', data?.summary?.total ?? 0],
          ['LOCALIZADOS', data?.summary?.located ?? 0],
          ['SIN UBICACIÓN', data?.summary?.unlocated ?? 0],
          ['EVIDENCIAS', data?.summary?.evidence ?? 0],
          ['PAÍSES', data?.summary?.countries ?? 0],
        ].map(([label, value]) => <div key={String(label)} className="bg-[#05090c] p-4"><span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#6f8089]">{label}</span><strong className="mt-2 block text-xl text-[#f0e3c1]">{value}</strong></div>)}
      </section>

      <div className="grid min-h-[calc(100vh-174px)] xl:grid-cols-[1fr_360px]">
        <section className="relative min-h-[58vh] overflow-hidden border-r border-[#24323a] bg-[#020609]">
          <div className="absolute inset-0 bg-[url('/field-map-skin.svg')] bg-cover bg-center opacity-90" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(68,104,116,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(68,104,116,.08)_1px,transparent_1px)] bg-[size:5%_10%]" />
          {located.map((item) => {
            const position = xy(item.geo as Geo);
            const active = selected?.id === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item)}
                title={item.title}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={position}
              >
                <span className={`block rounded-full border ${active ? 'h-8 w-8 border-[#ffe0a0] bg-[#d5a55255]' : 'h-5 w-5 border-[#7fd4e4] bg-[#58bdd044]'} shadow-[0_0_22px_rgba(92,197,216,.72)]`} />
              </button>
            );
          })}
          {!located.length ? <div className="absolute inset-0 grid place-items-center"><div className="max-w-md border border-[#6f5831] bg-[#05090ce8] p-6 text-center"><MapPin className="mx-auto h-7 w-7 text-[#d7b66e]"/><strong className="mt-3 block text-lg text-[#f1e5c8]">SIN OBSERVACIONES GEOLOCALIZADAS</strong><p className="mt-2 text-sm leading-6 text-[#87949a]">El mapa permanece vacío hasta que una ubicación real sea declarada y persistida para un caso FIELD.</p></div></div> : null}
          <div className="absolute bottom-4 left-4 border border-[#31434b] bg-[#04090cd9] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#8aa1aa]">EQUIRECTANGULAR · LAT/LON · NO INFERRED GEO</div>
        </section>

        <aside className="bg-[#05090c] p-4">
          {selected?.geo ? (
            <section className="border border-[#2e414a] bg-[#071015] p-4">
              <div className="flex items-center justify-between"><span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#7faeb8]">OBSERVACIÓN SELECCIONADA</span><Crosshair className="h-4 w-4 text-[#d4aa58]" /></div>
              <h2 className="mt-3 text-lg text-[#f0e5ca]">{selected.title}</h2>
              <dl className="mt-4 grid gap-2 text-xs">
                <div className="flex justify-between gap-4"><dt className="text-[#6f8089]">Ubicación</dt><dd className="text-right">{selected.geo.label || [selected.geo.city, selected.geo.admin1, selected.geo.country].filter(Boolean).join(', ') || `${selected.geo.lat}, ${selected.geo.lng}`}</dd></div>
                <div className="flex justify-between"><dt className="text-[#6f8089]">Dominio</dt><dd>{selected.domain}</dd></div>
                <div className="flex justify-between"><dt className="text-[#6f8089]">Estado</dt><dd>{selected.status}</dd></div>
                <div className="flex justify-between"><dt className="text-[#6f8089]">Precisión</dt><dd>{selected.geo.precision}</dd></div>
                <div className="flex justify-between"><dt className="text-[#6f8089]">Confianza geo</dt><dd>{confidence(selected.geo.confidence)}</dd></div>
                <div className="flex justify-between"><dt className="text-[#6f8089]">Evidencia</dt><dd>{selected.evidenceCount}</dd></div>
                <div className="flex justify-between"><dt className="text-[#6f8089]">Observado</dt><dd>{date(selected.geo.observedAt)}</dd></div>
              </dl>
              <div className="mt-4 border-t border-[#26363d] pt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[#73858d]">SOURCE · {selected.geo.source}</div>
            </section>
          ) : null}

          <section className="mt-4 border border-[#2e414a] bg-[#071015] p-4">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#d0a85b]"><Database className="h-4 w-4" /> Asignar ubicación real</div>
            <p className="mt-2 text-xs leading-5 text-[#7f8d93]">La coordenada se guarda en <code>field_cases.metadata.geo</code>. No se geocodifica ni se deduce.</p>
            <div className="mt-4 grid gap-3">
              <select value={draft.caseId} onChange={(event) => setDraft((current) => ({ ...current, caseId: event.target.value }))} className="border border-[#2b3c44] bg-[#030608] p-2 text-sm">
                <option value="">Selecciona caso sin ubicación</option>
                {unlocated.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input value={draft.lat} onChange={(event) => setDraft((current) => ({ ...current, lat: event.target.value }))} placeholder="Latitud" inputMode="decimal" className="border border-[#2b3c44] bg-[#030608] p-2 text-sm" />
                <input value={draft.lng} onChange={(event) => setDraft((current) => ({ ...current, lng: event.target.value }))} placeholder="Longitud" inputMode="decimal" className="border border-[#2b3c44] bg-[#030608] p-2 text-sm" />
              </div>
              <div className="grid grid-cols-[90px_1fr] gap-2">
                <input value={draft.countryCode} onChange={(event) => setDraft((current) => ({ ...current, countryCode: event.target.value }))} placeholder="MX" maxLength={3} className="border border-[#2b3c44] bg-[#030608] p-2 text-sm uppercase" />
                <input value={draft.country} onChange={(event) => setDraft((current) => ({ ...current, country: event.target.value }))} placeholder="País" className="border border-[#2b3c44] bg-[#030608] p-2 text-sm" />
              </div>
              <input value={draft.admin1} onChange={(event) => setDraft((current) => ({ ...current, admin1: event.target.value }))} placeholder="Estado / provincia" className="border border-[#2b3c44] bg-[#030608] p-2 text-sm" />
              <input value={draft.city} onChange={(event) => setDraft((current) => ({ ...current, city: event.target.value }))} placeholder="Ciudad / área metropolitana" className="border border-[#2b3c44] bg-[#030608] p-2 text-sm" />
              <input value={draft.label} onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))} placeholder="Etiqueta geográfica visible" className="border border-[#2b3c44] bg-[#030608] p-2 text-sm" />
              <select value={draft.precision} onChange={(event) => setDraft((current) => ({ ...current, precision: event.target.value as GeoPrecision }))} className="border border-[#2b3c44] bg-[#030608] p-2 text-sm">
                <option value="exact_point">Punto exacto</option><option value="neighborhood">Colonia / barrio</option><option value="city">Ciudad</option><option value="metropolitan_area">Área metropolitana</option><option value="state">Estado</option><option value="country">País</option>
              </select>
              <label className="grid gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#74868e]">Confianza geográfica · {confidence(draft.confidence)}<input type="range" min="0" max="1" step="0.05" value={draft.confidence} onChange={(event) => setDraft((current) => ({ ...current, confidence: Number(event.target.value) }))} /></label>
              <button type="button" disabled={loading || !draft.caseId || !draft.lat || !draft.lng} onClick={() => void saveGeo()} className="border border-[#b28b43] bg-[#ad8640] px-3 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#050403] disabled:opacity-40">Persistir ubicación</button>
            </div>
          </section>

          <section className="mt-4 border border-[#26363d] bg-[#04080a] p-4">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#7fa58b]"><ShieldCheck className="h-4 w-4" /> Contrato epistemológico</div>
            {(data?.limits ?? []).map((item) => <p key={item} className="mt-2 text-xs leading-5 text-[#78868c]">{item}</p>)}
          </section>
          {message ? <div className="mt-4 border border-[#684d32] bg-[#17100a] p-3 text-xs leading-5 text-[#d4b378]">{message}</div> : null}
        </aside>
      </div>
    </main>
  );
}
