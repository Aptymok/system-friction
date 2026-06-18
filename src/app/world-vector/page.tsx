'use client';

import { useEffect, useMemo, useState } from 'react';

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function num(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pct(value: unknown) {
  return `${Math.round(num(value) * 100)}%`;
}

function text(value: unknown, fallback = 'sin datos') {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function sourceDetails(source: Row) {
  return rows(source.source_details);
}

function tone(value: unknown) {
  const n = num(value);
  if (n >= 0.65) return 'text-[#d9f99d]';
  if (n >= 0.45) return 'text-[#e0c46c]';
  return 'text-[#fca5a5]';
}

function normalizeFilter(filter: string) {
  const map: Record<string, string> = {
    global: 'global',
    cultura: 'CULTURAL',
    discurso: 'MEMETIC',
    musica: 'CULTURAL',
    cine: 'CULTURAL',
    escritura: 'CULTURAL',
    tecnologia: 'TECH',
    economia: 'ECONOMY',
    politica: 'GEOPOLITICAL',
    territorio: 'GEO_DIGITAL',
    plataforma: 'GEO_DIGITAL',
    institucional: 'INSTITUTIONAL',
    clima: 'CLIMATE',
    bio: 'BIO',
    afectivo: 'AFFECTIVE',
  };
  return map[filter] ?? filter.toUpperCase();
}

export default function WorldVectorPage() {
  const [state, setState] = useState<Row | null>(null);
  const [filter, setFilter] = useState('global');
  const [signalType, setSignalType] = useState('all');
  const [timeRange, setTimeRange] = useState('7d');
  const [objectText, setObjectText] = useState('');
  const [mode, setMode] = useState('MIHM');
  const [evaluation, setEvaluation] = useState<Row | null>(null);

  useEffect(() => {
    fetch('/api/worldspect/operational-state', { cache: 'no-store' })
      .then((response) => response.json())
      .then(setState)
      .catch((error) => setState({ ok: false, status: 'unavailable', error: error instanceof Error ? error.message : 'worldspect_unavailable' }));
  }, []);

  const snapshot = record(state?.snapshot);
  const vectors = rows(snapshot.vectors);
  const vectorReadout = rows(state?.vector_readout);
  const sourceHealth = rows(state?.source_health);
  const sourceMix = record(state?.source_mix);
  const selectedKey = normalizeFilter(filter);

  const selected = useMemo(() => {
    if (selectedKey === 'global') return vectorReadout[0] ?? vectors[0] ?? null;
    return vectorReadout.find((vector) => String(vector.domain ?? '') === selectedKey) ?? vectors.find((vector) => String(vector.domain ?? '') === selectedKey) ?? vectorReadout[0] ?? vectors[0] ?? null;
  }, [selectedKey, vectorReadout, vectors]);

  const selectedSource = useMemo(() => {
    if (!selected) return null;
    return sourceHealth.find((source) => String(source.vector ?? '') === String(selected.domain ?? '')) ?? null;
  }, [selected, sourceHealth]);

  const weakSignals = rows(state?.weak_signals);
  const persistent = rows(state?.persistent_signals);

  async function runEvaluation() {
    const response = await fetch('/api/scorefriction/operational-cycle', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        case_id: `WSV-${Date.now().toString(36)}`,
        objective: `Contraste ${mode} contra ${filter}`,
        scope: filter === 'global' ? 'world' : 'culture',
        analysis_modes: [mode, 'WSV', 'SCOREFRICTION', 'AMV'],
        evaluated_object: objectText,
        run_contrast: true,
      }),
    }).then((res) => res.json());
    setEvaluation(response);
  }

  return (
    <main className="min-h-screen bg-[#050504] text-[#d8d0bd]">
      <header className="border-b border-[#d8b64a24] bg-[#080706] px-5 py-4 font-mono">
        <div className="text-[10px] uppercase tracking-[0.3em] text-[#e0c46c]">WorldSpectrumVector Observatory</div>
        <div className="mt-3 grid gap-3 text-[11px] uppercase tracking-[0.14em] text-[#8a8172] md:grid-cols-6">
          <div>Regimen mundial <b className="block text-[#d8d0bd]">{String(state?.world_regime ?? 'sin datos')}</b></div>
          <div>Vector <b className="block text-[#d8d0bd]">{String(selected?.domain ?? state?.selected_vector ?? 'sin vector')}</b></div>
          <div>Direccion <b className="block text-[#d8d0bd]">{String(state?.direction ?? 'sin lectura')}</b></div>
          <div>Degradacion <b className="block text-[#d8d0bd]">{pct(state?.degradation)}</b></div>
          <div>Cobertura <b className="block text-[#d8d0bd]">{pct(sourceMix.sourceCoverage ?? snapshot.sourceCoverage)}</b></div>
          <div>Ultimo calculo <b className="block text-[#d8d0bd]">{String(snapshot.observed_at ?? state?.calculated_at ?? 'sin timestamp')}</b></div>
        </div>
      </header>

      <section className="grid gap-4 p-5 font-mono xl:grid-cols-[300px_1fr_380px]">
        <aside className="space-y-4 border border-[#d8b64a24] bg-[#080706] p-4">
          <div className="text-[9px] uppercase tracking-[0.18em] text-[#e0c46c]">Filtros vectoriales</div>
          <select value={filter} onChange={(event) => setFilter(event.target.value)} className="w-full border border-[#d8b64a24] bg-[#050504] p-2 text-[11px]">
            {['global', 'cultura', 'discurso', 'musica', 'cine', 'escritura', 'tecnologia', 'economia', 'politica', 'territorio', 'plataforma', 'institucional', 'clima', 'bio', 'afectivo'].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={timeRange} onChange={(event) => setTimeRange(event.target.value)} className="w-full border border-[#d8b64a24] bg-[#050504] p-2 text-[11px]">
            {['24h', '7d', '30d', '90d'].map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={signalType} onChange={(event) => setSignalType(event.target.value)} className="w-full border border-[#d8b64a24] bg-[#050504] p-2 text-[11px]">
            {['all', 'latente', 'emergente', 'persistente', 'degradada'].map((item) => <option key={item}>{item}</option>)}
          </select>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="border border-[#d8b64a18] bg-black/30 p-3">publicas<br /><b className="text-[#e0c46c]">{String(sourceMix.publicSourceCount ?? 0)}</b></div>
            <div className="border border-[#d8b64a18] bg-black/30 p-3">internas<br /><b className="text-[#e0c46c]">{String(sourceMix.internalSourceCount ?? 0)}</b></div>
            <div className="border border-[#d8b64a18] bg-black/30 p-3">real input<br /><b className="text-[#e0c46c]">{String(sourceMix.realInputCount ?? 0)}</b></div>
            <div className="border border-[#d8b64a18] bg-black/30 p-3">degradadas<br /><b className="text-[#e0c46c]">{String(sourceMix.missingOrDegradedCount ?? 0)}</b></div>
          </div>

          <div className="text-[9px] leading-5 text-[#7a7568]">
            Las fuentes no son contenido principal. Alimentan el vector. Se muestra su salud, tipo y peso operativo para trazabilidad mÃ­nima.
          </div>
        </aside>

        <section className="min-h-[560px] border border-[#d8b64a24] bg-[radial-gradient(circle_at_center,#171208_0%,#050504_58%,#000_100%)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[9px] uppercase tracking-[0.24em] text-[#e0c46c]">Campo vivo seleccionado</div>
              <h1 className="mt-2 text-3xl uppercase tracking-[0.18em] text-[#f5e7bd]">{String(selected?.domain ?? 'WORLD')}</h1>
              <p className="mt-2 max-w-2xl text-[11px] leading-6 text-[#9c9282]">{text(selected?.interpretation, 'observaciÃ³n activa')} Â· rÃ©gimen {String(state?.world_regime ?? 'LOW')} Â· direcciÃ³n {String(state?.direction ?? 'low signal')}</p>
            </div>
            <div className="text-right text-[10px] uppercase tracking-[0.14em] text-[#8a8172]">
              trust <b className={`block text-xl ${tone(selected?.trust)}`}>{pct(selected?.trust)}</b>
              persistencia <b className={`block text-xl ${tone(selected?.persistence)}`}>{pct(selected?.persistence)}</b>
            </div>
          </div>

          <div className="relative mt-8 h-[320px] overflow-hidden border border-[#d8b64a18] bg-black/30">
            <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#e0c46c66] bg-[#e0c46c10] shadow-[0_0_90px_rgba(224,196,108,0.15)]" />
            <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#e0c46c] bg-[#e0c46c22] shadow-[0_0_40px_rgba(224,196,108,0.35)]" />
            {vectorReadout.map((vector, index) => {
              const angle = (Math.PI * 2 * index) / Math.max(1, vectorReadout.length);
              const radius = 128 + num(vector.persistence) * 44;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              return (
                <div key={String(vector.domain ?? index)} className="absolute left-1/2 top-1/2" style={{ transform: `translate(${x}px, ${y}px)` }}>
                  <div className="h-3 w-3 rounded-full bg-[#e0c46c] shadow-[0_0_18px_rgba(224,196,108,0.75)]" />
                  <div className="mt-1 whitespace-nowrap text-[9px] uppercase tracking-[0.12em] text-[#d8d0bd]">{String(vector.domain)}</div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="border border-[#d8b64a18] bg-black/30 p-3 text-[10px]">valor<br /><b className="text-[#e0c46c]">{pct(selected?.value)}</b></div>
            <div className="border border-[#d8b64a18] bg-black/30 p-3 text-[10px]">degradaciÃ³n<br /><b className="text-[#e0c46c]">{pct(selected?.degradation)}</b></div>
            <div className="border border-[#d8b64a18] bg-black/30 p-3 text-[10px]">fuentes<br /><b className="text-[#e0c46c]">{String(selected?.source_count ?? 0)}</b></div>
          </div>

          <div className="mt-5 border border-[#d8b64a18] bg-black/30 p-4">
            <div className="text-[9px] uppercase tracking-[0.18em] text-[#e0c46c]">Fuentes del vector</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedSource && sourceDetails(selectedSource).length ? sourceDetails(selectedSource).map((source) => (
                <span key={String(source.id)} className="border border-[#d8b64a24] bg-[#080706] px-2 py-1 text-[9px] text-[#d8d0bd]">
                  {String(source.label)} Â· {String(source.kind)}
                </span>
              )) : <span className="text-[10px] text-[#7a7568]">sin fuentes activas</span>}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="border border-[#d8b64a24] bg-[#080706] p-4">
            <h2 className="text-[10px] uppercase tracking-[0.18em] text-[#e0c46c]">Salud de fuente</h2>
            {sourceHealth.map((source, index) => (
              <div key={index} className="mt-3 border-b border-[#d8b64a14] pb-3 text-[10px]">
                <div className="flex justify-between gap-3">
                  <b>{String(source.vector)}</b>
                  <span className={source.health === 'real input' ? 'text-[#d9f99d]' : 'text-[#fca5a5]'}>{String(source.health)}</span>
                </div>
                <div className="mt-1 text-[#8a8172]">{String(source.source_count ?? 0)} fuentes Â· {text(source.interpretation, '')}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {sourceDetails(source).map((detail) => (
                    <span key={String(detail.id)} className="border border-[#d8b64a18] px-1.5 py-0.5 text-[8px] text-[#9c9282]">{String(detail.provider)}</span>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <section className="border border-[#d8b64a24] bg-[#080706] p-4">
            <h2 className="text-[10px] uppercase tracking-[0.18em] text-[#e0c46c]">SeÃ±ales dÃ©biles</h2>
            {weakSignals.map((signal, index) => (
              <div key={index} className="mt-3 border-b border-[#d8b64a14] pb-2 text-[11px]">
                <b>{String(signal.vector ?? signal.domain ?? 'seÃ±al')}</b>
                <div>recurrencia {pct(signal.persistence)} Â· coherencia {pct(signal.trust)}</div>
                <div>estado {String(signal.status ?? 'emergente')}</div>
              </div>
            ))}
            {!weakSignals.length ? <p className="mt-3 text-[11px] text-[#7a7568]">sin datos suficientes</p> : null}
          </section>

          <section className="border border-[#d8b64a24] bg-[#080706] p-4">
            <h2 className="text-[10px] uppercase tracking-[0.18em] text-[#e0c46c]">Persistencia</h2>
            {persistent.slice(0, 8).map((signal, index) => (
              <div key={index} className="mt-3 border-b border-[#d8b64a14] pb-2 text-[11px]">
                <b>{String(signal.domain ?? signal.vector)}</b>
                <div>duraciÃ³n {pct(signal.persistence)} Â· aceleraciÃ³n {pct(signal.velocity)}</div>
                <div>coherencia {pct(signal.trust)} Â· cambio vectorial {pct(signal.volatility)}</div>
              </div>
            ))}
          </section>
        </aside>

        <section className="border border-[#d8b64a24] bg-[#080706] p-4 xl:col-span-3">
          <h2 className="text-[10px] uppercase tracking-[0.18em] text-[#e0c46c]">Evaluador opcional</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr_auto]">
            <select value={mode} onChange={(event) => setMode(event.target.value)} className="border border-[#d8b64a24] bg-[#050504] p-2 text-[11px]">
              {['MIHM', 'PSI', 'SCOREFRICTION'].map((item) => <option key={item}>{item}</option>)}
            </select>
            <textarea value={objectText} onChange={(event) => setObjectText(event.target.value)} className="h-24 border border-[#d8b64a24] bg-[#050504] p-2 text-[11px]" placeholder="texto/audio/objeto/anÃ¡lisis..." />
            <button disabled={!objectText.trim()} onClick={() => void runEvaluation()} className="border border-[#d8b64a44] px-3 text-[10px] uppercase tracking-[0.14em] text-[#e0c46c] disabled:text-[#6f6658]">Contrastar</button>
          </div>
          {evaluation ? <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap text-[10px] text-[#8a8172]">{JSON.stringify(evaluation.state ?? evaluation, null, 2)}</pre> : null}
        </section>
      </section>
    </main>
  );
}
