'use client';

import { useMemo, useState } from 'react';

const WORLD_OBSERVATORY_RUNTIME = '/field/world-observatory/index.html?v=20260802.1911';

type LayerKey =
  | 'observations'
  | 'entities'
  | 'energy'
  | 'attractors'
  | 'trajectories'
  | 'hypotheses'
  | 'time'
  | 'cognitive';

const LAYERS: Array<{ key: LayerKey; label: string; code: string; persisted: boolean }> = [
  { key: 'observations', label: 'OBSERVATIONS', code: 'EXT', persisted: true },
  { key: 'entities', label: 'ENTITIES', code: 'ACT', persisted: false },
  { key: 'energy', label: 'ENERGY', code: 'PHY', persisted: false },
  { key: 'attractors', label: 'ATTRACTORS', code: 'DRV', persisted: false },
  { key: 'trajectories', label: 'TRAJECTORIES', code: 'REL', persisted: true },
  { key: 'hypotheses', label: 'HYPOTHESES', code: 'HYP', persisted: true },
  { key: 'time', label: 'TIME', code: '30D', persisted: true },
  { key: 'cognitive', label: 'COGNITIVE ACETATE', code: 'OBS', persisted: false },
];

export function WorldFieldShell() {
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    observations: true,
    entities: false,
    energy: false,
    attractors: false,
    trajectories: true,
    hypotheses: true,
    time: true,
    cognitive: false,
  });
  const [subject, setSubject] = useState('');

  const acetateLabel = useMemo(() => {
    if (!subject) return 'SIN SUJETO SELECCIONADO';
    return `SUBJECT · ${subject} · PROFILE NOT YET PERSISTED`;
  }, [subject]);

  function toggleLayer(key: LayerKey) {
    setLayers((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <main className="relative h-screen w-full overflow-hidden bg-black text-[#b8d0e0]">
      <iframe
        src={WORLD_OBSERVATORY_RUNTIME}
        title="SFI WORLD FIELD"
        className="absolute inset-0 h-full w-full border-0"
        allow="fullscreen"
      />

      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-500 ${layers.cognitive ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background:
            'repeating-linear-gradient(118deg, rgba(225,238,242,.035) 0 1px, transparent 1px 13px), radial-gradient(circle at 62% 44%, rgba(216,169,78,.13), transparent 34%), linear-gradient(135deg, rgba(230,240,245,.05), rgba(120,170,190,.018))',
          mixBlendMode: 'screen',
        }}
      />

      <aside className="absolute left-5 top-5 z-20 w-[210px] border border-cyan-200/10 bg-[#020509]/75 p-3 font-mono backdrop-blur-md">
        <div className="mb-1 text-[10px] tracking-[0.28em] text-[#d8a94e]">WORLD FIELD</div>
        <div className="mb-3 text-[8px] leading-relaxed tracking-[0.14em] text-[#6d8795]">
          PLANETARY FRICTION MAP · OBSERVED WORLD
        </div>

        <div className="mb-2 text-[8px] tracking-[0.2em] text-[#69828f]">FIELD LAYERS</div>
        {LAYERS.map((layer) => (
          <button
            key={layer.key}
            type="button"
            onClick={() => toggleLayer(layer.key)}
            className={`mb-1 flex w-full items-center justify-between border px-2 py-1.5 text-left text-[8px] tracking-[0.08em] transition ${
              layers[layer.key]
                ? 'border-[#d8a94e]/55 bg-[#d8a94e]/10 text-[#d8e8f5]'
                : 'border-cyan-200/10 bg-transparent text-[#607986]'
            }`}
          >
            <span>{layer.label}</span>
            <span className={layer.persisted ? 'text-emerald-300' : 'text-[#d8a94e]'}>
              {layer.persisted ? layer.code : `${layer.code}·SCHEMA`}
            </span>
          </button>
        ))}

        <div className="mt-3 border-t border-cyan-200/10 pt-3">
          <label htmlFor="world-field-subject" className="mb-1 block text-[8px] tracking-[0.18em] text-[#69828f]">
            OBSERVER / SUBJECT
          </label>
          <select
            id="world-field-subject"
            value={subject}
            onChange={(event) => {
              const value = event.target.value;
              setSubject(value);
              if (value) setLayers((current) => ({ ...current, cognitive: true }));
            }}
            className="w-full border border-[#d8a94e]/30 bg-[#020509] px-2 py-1.5 text-[9px] text-[#d8e8f5] outline-none"
          >
            <option value="">SIN SUJETO</option>
            <option value="SFI">SFI</option>
            <option value="JUAN">JUAN</option>
            <option value="KXTXR">KXTXR</option>
          </select>
        </div>

        <a
          href="/observatory"
          className="mt-3 block border border-cyan-200/10 px-2 py-2 text-center text-[8px] tracking-[0.16em] text-[#8aa4b2] hover:border-[#d8a94e]/50 hover:text-[#d8a94e]"
        >
          OPEN PUBLIC OBSERVATORY →
        </a>
      </aside>

      {layers.cognitive ? (
        <div className="pointer-events-none absolute right-5 top-5 z-20 border border-white/15 bg-[#020509]/45 px-3 py-2 font-mono backdrop-blur-sm">
          <div className="text-[8px] tracking-[0.22em] text-white/55">OBSERVER-RELATIVE · COGNITIVE ACETATE</div>
          <div className="mt-1 text-[9px] tracking-[0.12em] text-[#d8a94e]">{acetateLabel}</div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-5 right-5 z-20 max-w-[340px] border border-cyan-200/10 bg-[#020509]/70 px-3 py-2 font-mono text-[8px] leading-relaxed text-[#718b98] backdrop-blur-md">
        <strong className="text-[#d8e8f5]">WORLD FIELD</strong> representa observaciones externas persistidas.
        <span className="text-[#d8a94e]"> COGNITIVE ACETATE</span> es una proyección relativa al sujeto y nunca modifica la fricción observada.
      </div>
    </main>
  );
}
