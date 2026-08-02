'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Database, MapPin, RefreshCw, ShieldCheck, SunMedium } from 'lucide-react';

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

type SolarState = {
  utc: string;
  subsolarLat: number;
  subsolarLng: number;
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

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

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
  return `${Math.round(clamp(value, 0, 1) * 100)}%`;
}

function solarPosition(now: Date) {
  const julianDay = now.getTime() / 86400000 + 2440587.5;
  const n = julianDay - 2451545.0;
  const meanLongitude = ((280.46 + 0.9856474 * n) % 360 + 360) % 360;
  const meanAnomaly = ((357.528 + 0.9856003 * n) % 360 + 360) % 360;
  const anomalyRad = meanAnomaly * Math.PI / 180;
  const eclipticLongitude = meanLongitude + 1.915 * Math.sin(anomalyRad) + 0.02 * Math.sin(2 * anomalyRad);
  const obliquity = 23.439 - 0.0000004 * n;
  const lambda = eclipticLongitude * Math.PI / 180;
  const epsilon = obliquity * Math.PI / 180;
  const declination = Math.asin(Math.sin(epsilon) * Math.sin(lambda));
  const rightAscension = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda));
  const gmst = ((280.46061837 + 360.98564736629 * (julianDay - 2451545.0)) % 360 + 360) % 360;
  const subsolarLongitude = ((rightAscension * 180 / Math.PI - gmst + 540) % 360) - 180;

  return {
    lat: declination * 180 / Math.PI,
    lng: subsolarLongitude,
  };
}

function SolarTerminator({
  onSolarState,
}: {
  onSolarState: (state: SolarState) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let frame = 0;
    let timer: ReturnType<typeof setInterval> | null = null;

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;

      const width = Math.max(1, Math.round(parent.clientWidth));
      const height = Math.max(1, Math.round(parent.clientHeight));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const context = canvas.getContext('2d');
      if (!context) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      const now = new Date();
      const sun = solarPosition(now);
      const sunLat = sun.lat * Math.PI / 180;
      const step = 3;

      for (let y = 0; y < height; y += step) {
        const lat = (90 - (y / height) * 180) * Math.PI / 180;
        for (let x = 0; x < width; x += step) {
          const lng = ((x / width) * 360 - 180) * Math.PI / 180;
          const hourAngle = lng - sun.lng * Math.PI / 180;
          const solarElevation = Math.asin(
            Math.sin(lat) * Math.sin(sunLat)
            + Math.cos(lat) * Math.cos(sunLat) * Math.cos(hourAngle),
          ) * 180 / Math.PI;

          let fill = '';
          if (solarElevation < -18) fill = 'rgba(0, 5, 14, 0.72)';
          else if (solarElevation < -12) fill = 'rgba(2, 11, 23, 0.58)';
          else if (solarElevation < -6) fill = 'rgba(8, 20, 34, 0.42)';
          else if (solarElevation < 0) fill = 'rgba(96, 56, 24, 0.22)';
          else if (solarElevation < 6) fill = 'rgba(224, 149, 64, 0.08)';

          if (fill) {
            context.fillStyle = fill;
            context.fillRect(x, y, step + 1, step + 1);
          }
        }
      }

      const sunX = ((sun.lng + 180) / 360) * width;
      const sunY = ((90 - sun.lat) / 180) * height;
      const gradient = context.createRadialGradient(sunX, sunY, 0, sunX, sunY, Math.max(width, height) * 0.18);
      gradient.addColorStop(0, 'rgba(255, 211, 132, 0.18)');
      gradient.addColorStop(0.35, 'rgba(222, 154, 70, 0.08)');
      gradient.addColorStop(1, 'rgba(222, 154, 70, 0)');
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      onSolarState({
        utc: now.toISOString(),
        subsolarLat: sun.lat,
        subsolarLng: sun.lng,
      });
    };

    const queueDraw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };

    queueDraw();
    timer = setInterval(queueDraw, 30000);
    window.addEventListener('resize', queueDraw);

    return () => {
      cancelAnimationFrame(frame);
      if (timer) clearInterval(timer);
      window.removeEventListener('resize', queueDraw);
    };
  }, [onSolarState]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-[2] h-full w-full" aria-hidden="true" />;
}

export function FieldMapConsole() {
  const [data, setData] = useState<MapResponse | null>(null);
  const [selected, setSelected] = useState<FieldCase | null>(null);
  const [draft, setDraft] = useState<GeoDraft>(EMPTY_DRAFT);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [solar, setSolar] = useState<SolarState | null>(null);

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
        body: JSON.stringify({ ...draft, lat: Number(draft.lat), lng: Number(draft.lng) }),
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
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#809099]">Textura SFI 2:1, terminador solar UTC y nodos FIELD reales. La iluminación describe día, crepúsculo y noche; no modifica los valores observacionales.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 border border-[#35505b] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#9fc6cf]">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </button>
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
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-[#05090c] p-4">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#6f8089]">{label}</span>
            <strong className="mt-2 block text-xl text-[#f0e3c1]">{value}</strong>
          </div>
        ))}
      </section>

      <div className="grid min-h-[calc(100vh-174px)] xl:grid-cols-[1fr_360px]">
        <section className="relative min-h-[58vh] overflow-hidden border-r border-[#24323a] bg-[#020609]">
          <div className="absolute inset-0 bg-[url('/field/sfi-field-world-skin.webp')] bg-cover bg-center opacity-95" />
          <SolarTerminator onSolarState={setSolar} />
          <div className="pointer-events-none absolute inset-0 z-[3] bg-[linear-gradient(rgba(68,104,116,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(68,104,116,.06)_1px,transparent_1px)] bg-[size:5%_10%]" />

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

          {!located.length ? (
            <div className="absolute inset-0 z-20 grid place-items-center">
              <div className="max-w-md border border-[#6f5831] bg-[#05090ce8] p-6 text-center">
                <MapPin className="mx-auto h-7 w-7 text-[#d7b66e]" />
                <strong className="mt-3 block text-lg text-[#f1e5c8]">SIN OBSERVACIONES GEOLOCALIZADAS</strong>
                <p className="mt-2 text-sm leading-6 text-[#87949a]">El mapa permanece sin nodos hasta que una ubicación real sea declarada y persistida para un caso FIELD.</p>
              </div>
            </div>
          ) : null}

          <div className="absolute bottom-4 left-4 z-20 border border-[#31434b] bg-[#04090cd9] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-[#8aa1aa]">
            EQUIRECTANGULAR 2:1 · SOLAR TERMINATOR · UTC
          </div>
          <div className="absolute right-4 top-4 z-20 border border-[#6f5831] bg-[#04090ce6] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#d5b36b]">
            <span className="flex items-center gap-2"><SunMedium className="h-3.5 w-3.5" /> {solar ? new Date(solar.utc).toLocaleTimeString('es-MX', { timeZone: 'UTC', hour12: false }) : 'CALCULANDO'} UTC</span>
            {solar ? <small className="mt-1 block text-[#8b9aa0]">SUBSOLAR {solar.subsolarLat.toFixed(2)}°, {solar.subsolarLng.toFixed(2)}°</small> : null}
          </div>
        </section>

        <aside className="bg-[#05090c] p-4">
          {selected?.geo ? (
            <section className="border border-[#2e414a] bg-[#071015] p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#7faeb8]">OBSERVACIÓN SELECCIONADA</span>
                <Crosshair className="h-4 w-4 text-[#d4aa58]" />
              </div>
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
                <option value="exact_point">Punto exacto</option>
                <option value="neighborhood">Colonia / barrio</option>
                <option value="city">Ciudad</option>
                <option value="metropolitan_area">Área metropolitana</option>
                <option value="state">Estado</option>
                <option value="country">País</option>
              </select>
              <label className="grid gap-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#74868e]">
                Confianza geográfica · {confidence(draft.confidence)}
                <input type="range" min="0" max="1" step="0.05" value={draft.confidence} onChange={(event) => setDraft((current) => ({ ...current, confidence: Number(event.target.value) }))} />
              </label>
              <button type="button" onClick={() => void saveGeo()} disabled={loading || !draft.caseId || !draft.lat || !draft.lng} className="border border-[#8b6b34] bg-[#9d7838] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#080a0b] disabled:opacity-40">
                Persistir ubicación
              </button>
            </div>
          </section>

          <section className="mt-4 border border-[#2e414a] bg-[#071015] p-4">
            <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[#78aab5]"><ShieldCheck className="h-4 w-4" /> Contrato epistemológico</div>
            {(data?.limits ?? []).map((item) => <p key={item} className="mt-2 text-xs leading-5 text-[#7f8d93]">{item}</p>)}
            <p className="mt-2 text-xs leading-5 text-[#7f8d93]">La sombra solar es contexto astronómico calculado en cliente. No es evidencia FIELD ni modifica métricas.</p>
          </section>

          {message ? <div className="mt-4 border border-[#6f5831] bg-[#171106] p-3 text-xs text-[#d8bd7f]">{message}</div> : null}
        </aside>
      </div>
    </main>
  );
}
