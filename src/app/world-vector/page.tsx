'use client';

import { useEffect, useMemo, useState } from 'react';

type Row = Record<string, unknown>;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
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
  const selected = useMemo(() => {
    if (filter === 'global') return vectors[0] ?? null;
    return vectors.find((vector) => String(vector.domain ?? '').toLowerCase().includes(filter)) ?? vectors[0] ?? null;
  }, [filter, vectors]);
  const weakSignals = rows(state?.weak_signals);
  const persistent = rows(state?.persistent_signals);
  const sourceHealth = rows(state?.source_health);

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
        <div className="mt-3 grid gap-3 text-[11px] uppercase tracking-[0.14em] text-[#8a8172] md:grid-cols-5">
          <div>Regimen mundial <b className="block text-[#d8d0bd]">{String(state?.world_regime ?? 'sin datos suficientes')}</b></div>
          <div>Vector <b className="block text-[#d8d0bd]">{String(selected?.domain ?? state?.selected_vector ?? 'sin vector')}</b></div>
          <div>Direccion <b className="block text-[#d8d0bd]">{String(state?.direction ?? 'sin lectura')}</b></div>
          <div>Degradacion <b className="block text-[#d8d0bd]">{String(state?.degradation ?? 'sin lectura')}</b></div>
          <div>Ultimo calculo <b className="block text-[#d8d0bd]">{String(snapshot.observed_at ?? state?.calculated_at ?? 'sin timestamp')}</b></div>
        </div>
      </header>

      <section className="grid gap-4 p-5 font-mono lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4 border border-[#d8b64a24] bg-[#080706] p-4">
          <div className="text-[9px] uppercase tracking-[0.18em] text-[#e0c46c]">Filtros vectoriales</div>
          <select value={filter} onChange={(event) => setFilter(event.target.value)} className="w-full border border-[#d8b64a24] bg-[#050504] p-2 text-[11px]">
            {['global', 'cultura', 'discurso', 'musica', 'cine', 'escritura', 'tecnologia', 'economia', 'politica', 'territorio', 'plataforma'].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={timeRange} onChange={(event) => setTimeRange(event.target.value)} className="w-full border border-[#d8b64a24] bg-[#050504] p-2 text-[11px]">
            {['24h', '7d', '30d', '90d'].map((item) => <option key={item}>{item}</option>)}
          </select>
          <select value={signalType} onChange={(event) => setSignalType(event.target.value)} className="w-full border border-[#d8b64a24] bg-[#050504] p-2 text-[11px]">
            {['all', 'latente', 'emergente', 'persistente', 'degradada'].map((item) => <option key={item}>{item}</option>)}
          </select>
          <div className="text-[9px] text-[#7a7568]">Rango {timeRange}; tipo {signalType}. Las fuentes alimentan el vector y solo se resumen como salud tecnica.</div>
        </aside>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="border border-[#d8b64a24] bg-[#080706] p-4">
            <h2 className="text-[10px] uppercase tracking-[0.18em] text-[#e0c46c]">Senales debiles</h2>
            {weakSignals.map((signal, index) => (
              <div key={index} className="mt-3 border-b border-[#d8b64a14] pb-2 text-[11px]">
                <b>{String(signal.vector ?? signal.domain ?? 'senal')}</b>
                <div>recurrencia {String(signal.persistence ?? 'sin datos')} · coherencia {String(signal.trust ?? 'sin datos')}</div>
                <div>estado {String(signal.status ?? 'emergente')}</div>
              </div>
            ))}
            {!weakSignals.length ? <p className="mt-3 text-[11px] text-[#7a7568]">sin datos suficientes</p> : null}
          </section>

          <section className="border border-[#d8b64a24] bg-[#080706] p-4">
            <h2 className="text-[10px] uppercase tracking-[0.18em] text-[#e0c46c]">Persistencia</h2>
            {persistent.map((signal, index) => (
              <div key={index} className="mt-3 border-b border-[#d8b64a14] pb-2 text-[11px]">
                <b>{String(signal.domain ?? signal.vector)}</b>
                <div>duracion {String(signal.persistence)} · aceleracion {String(signal.velocity ?? 'sin datos')}</div>
                <div>coherencia {String(signal.trust ?? 'sin datos')} · cambio vectorial {String(signal.volatility ?? 'sin datos')}</div>
              </div>
            ))}
            {!persistent.length ? <p className="mt-3 text-[11px] text-[#7a7568]">sin persistencia suficiente</p> : null}
          </section>

          <section className="border border-[#d8b64a24] bg-[#080706] p-4">
            <h2 className="text-[10px] uppercase tracking-[0.18em] text-[#e0c46c]">Regimen / Direccion</h2>
            <div className="mt-3 text-[11px]">mundial: {String(state?.world_regime ?? 'sin datos')}</div>
            <div className="text-[11px]">filtro: {String(selected?.status ?? 'sin datos')}</div>
            <div className="text-[11px]">cambio detectado: {String(record(evaluation?.state).regime ? record(record(evaluation?.state).regime).changed : false)}</div>
            <div className="text-[11px]">direccion proyectada: {String(record(record(evaluation?.state).direction).projected ?? state?.direction ?? 'sin lectura')}</div>
            <div className="text-[11px]">confianza: {String(selected?.trust ?? 'sin lectura')}</div>
          </section>

          <section className="border border-[#d8b64a24] bg-[#080706] p-4 lg:col-span-2">
            <h2 className="text-[10px] uppercase tracking-[0.18em] text-[#e0c46c]">Evaluador opcional</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr_auto]">
              <select value={mode} onChange={(event) => setMode(event.target.value)} className="border border-[#d8b64a24] bg-[#050504] p-2 text-[11px]">
                {['MIHM', 'PSI', 'SCOREFRICTION'].map((item) => <option key={item}>{item}</option>)}
              </select>
              <textarea value={objectText} onChange={(event) => setObjectText(event.target.value)} className="h-24 border border-[#d8b64a24] bg-[#050504] p-2 text-[11px]" placeholder="texto/audio/objeto/analisis..." />
              <button disabled={!objectText.trim()} onClick={() => void runEvaluation()} className="border border-[#d8b64a44] px-3 text-[10px] uppercase tracking-[0.14em] text-[#e0c46c] disabled:text-[#6f6658]">Contrastar</button>
            </div>
            {evaluation ? <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap text-[10px] text-[#8a8172]">{JSON.stringify(evaluation.state ?? evaluation, null, 2)}</pre> : null}
          </section>

          <section className="border border-[#d8b64a24] bg-[#080706] p-4">
            <h2 className="text-[10px] uppercase tracking-[0.18em] text-[#e0c46c]">Salud de fuente</h2>
            {sourceHealth.map((source, index) => (
              <div key={index} className="mt-2 flex justify-between gap-3 text-[10px]">
                <span>{String(source.vector)}</span>
                <b>{String(source.health)}</b>
              </div>
            ))}
          </section>
        </div>
      </section>
    </main>
  );
}
