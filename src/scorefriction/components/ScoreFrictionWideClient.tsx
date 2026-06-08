'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

type LayerId = 'cultural' | 'biologico' | 'digital' | 'institucional' | 'ecosistemico';
type FocusVariable = 'cultural' | 'ritmo' | 'genero' | 'dolencia_social' | 'letra' | 'densidad_emocional' | 'energia_corporal' | 'protoatractor' | 'eyector';
type Regime = 'Homeostatico' | 'Ausencia operativa' | 'Proto-critico';
type EvidenceState = 'alta' | 'parcial' | 'minima' | 'ausencia operativa';
type AmvResponse = {
  ok: boolean;
  response?: {
    evento?: string;
    resultado?: string;
    efecto?: string;
    ventana?: string;
    ruta_unica?: string;
  };
  sourceTrust?: 'observed' | 'derived' | 'degraded' | 'untrusted';
  warnings?: string[];
  error?: string;
};

const LAYERS: Array<{ id: LayerId; label: string; value: number }> = [
  { id: 'cultural', label: 'cultural', value: 0.62 },
  { id: 'biologico', label: 'biologico', value: 0.31 },
  { id: 'digital', label: 'digital', value: 0.48 },
  { id: 'institucional', label: 'institucional', value: 0.36 },
  { id: 'ecosistemico', label: 'ecosistemico', value: 0.27 },
];

const FOCUS_VARIABLES: FocusVariable[] = [
  'cultural',
  'ritmo',
  'genero',
  'dolencia_social',
  'letra',
  'densidad_emocional',
  'energia_corporal',
  'protoatractor',
  'eyector',
];

const ATTRACTORS = [
  { label: 'patron cultural declarado', strength: 42 },
  { label: 'ritmo como acoplamiento', strength: 36 },
  { label: 'protoatractor narrativo', strength: 31 },
];

const EJECTORS = [
  { label: 'saturacion performativa', strength: 28 },
  { label: 'ruido sin umbral', strength: 24 },
  { label: 'ausencia de linaje', strength: 21 },
];

const INITIAL_RESPONSE = {
  evento: 'Sin evento enviado.',
  resultado: 'Lectura local / sin evidencia externa.',
  efecto: 'No alimenta regimen ni declara fuente externa.',
  ventana: 'Pendiente de objeto cultural o fenomeno declarado.',
  ruta_unica: 'Mantener observacion AMV scoped.',
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function FieldCanvas({ activeLayers, phi }: { activeLayers: LayerId[]; phi: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let animationId = 0;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#060606';
      ctx.fillRect(0, 0, width, height);

      const density = 32;
      const layerWeight = Math.max(1, activeLayers.length);
      ctx.lineWidth = 1;

      for (let x = 0; x <= width; x += density) {
        for (let y = 0; y <= height; y += density) {
          const wave = Math.sin((x * 0.019) + (frame * 0.018)) + Math.cos((y * 0.021) - (frame * 0.014));
          const pull = wave * 5 * layerWeight;
          const alpha = 0.1 + Math.abs(wave) * 0.08;
          ctx.strokeStyle = `rgba(184, 146, 75, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + pull, y - pull * 0.55);
          ctx.stroke();
        }
      }

      const attractors = [
        [width * 0.24, height * 0.36, 18],
        [width * 0.52, height * 0.58, 25],
        [width * 0.72, height * 0.32, 15],
      ] as const;
      const ejectors = [
        [width * 0.35, height * 0.72, 18],
        [width * 0.82, height * 0.67, 21],
      ] as const;

      attractors.forEach(([x, y, radius], index) => {
        const pulse = Math.sin(frame * 0.04 + index) * 3;
        ctx.strokeStyle = 'rgba(67, 210, 164, 0.68)';
        ctx.fillStyle = 'rgba(67, 210, 164, 0.14)';
        ctx.beginPath();
        ctx.arc(x, y, radius + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#7ee6c4';
        ctx.fillRect(x - 2, y - 2, 4, 4);
      });

      ejectors.forEach(([x, y, radius], index) => {
        const pulse = Math.cos(frame * 0.05 + index) * 4;
        ctx.strokeStyle = 'rgba(224, 91, 56, 0.72)';
        ctx.fillStyle = 'rgba(224, 91, 56, 0.12)';
        ctx.beginPath();
        ctx.arc(x, y, radius + pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 6, y - 4);
        ctx.lineTo(x + 6, y - 4);
        ctx.lineTo(x, y + 7);
        ctx.closePath();
        ctx.fillStyle = '#f08a5d';
        ctx.fill();
      });

      ctx.fillStyle = 'rgba(234, 216, 170, 0.9)';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(`Φ_SF ${phi.toFixed(2)} · lectura local`, 18, 28);
      ctx.fillStyle = 'rgba(216, 208, 189, 0.58)';
      ctx.fillText(`capas activas ${activeLayers.join(' / ') || 'sin capas'}`, 18, height - 20);

      frame += 1;
      animationId = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      window.cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [activeLayers, phi]);

  return <canvas ref={canvasRef} className="h-[460px] w-full border border-[#2b261d] bg-[#060606]" aria-label="Campo vectorial ScoreFriction" />;
}

function MiniMetric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="border border-[#2b261d] bg-[#0a0907] p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8d826e]">{label}</div>
      <div className="mt-2 font-serif text-2xl text-[#ead8aa]">{value}</div>
      <div className="mt-1 text-[11px] text-[#8d826e]">{note}</div>
    </div>
  );
}

function Bar({ label, value, tone = 'gold' }: { label: string; value: number; tone?: 'gold' | 'teal' | 'red' }) {
  const color = tone === 'teal' ? 'bg-[#43d2a4]' : tone === 'red' ? 'bg-[#e05b38]' : 'bg-[#b8924b]';
  return (
    <div className="space-y-1">
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-[#a89c86]">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-2 bg-[#17130f]">
        <div className={cn('h-full', color)} style={{ width: `${Math.max(8, value * 100)}%` }} />
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-[#2b261d] bg-[#0c0b09]/92 p-4 shadow-[0_0_32px_rgba(0,0,0,0.26)]">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#b8924b]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function evidenceFromTrust(trust: AmvResponse['sourceTrust']): EvidenceState {
  if (trust === 'observed') return 'alta';
  if (trust === 'derived') return 'parcial';
  if (trust === 'degraded') return 'minima';
  return 'ausencia operativa';
}

export function ScoreFrictionWideClient() {
  const [activeLayers, setActiveLayers] = useState<LayerId[]>(['cultural', 'digital', 'institucional']);
  const [focusVariables, setFocusVariables] = useState<FocusVariable[]>(['cultural', 'letra', 'densidad_emocional']);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [amv, setAmv] = useState<AmvResponse>({ ok: false, response: INITIAL_RESPONSE, sourceTrust: 'degraded' });
  const [outputNote, setOutputNote] = useState('Persistencia pendiente para salidas fuera de JSON visible.');

  const phi = useMemo(() => {
    const base = 0.28 + (activeLayers.length * 0.045) + (focusVariables.length * 0.035);
    return Math.min(0.74, base);
  }, [activeLayers.length, focusVariables.length]);
  const ldi = Number((0.38 + focusVariables.length * 0.06).toFixed(2));
  const rce = Number((0.34 + activeLayers.length * 0.04).toFixed(2));
  const regime: Regime = amv.sourceTrust === 'derived' ? 'Homeostatico' : message.trim() ? 'Proto-critico' : 'Ausencia operativa';
  const evidenceState = evidenceFromTrust(amv.sourceTrust);
  const visibleResponse = amv.response ?? INITIAL_RESPONSE;

  const toggleLayer = (layer: LayerId) => {
    setActiveLayers((current) => current.includes(layer) ? current.filter((item) => item !== layer) : [...current, layer]);
  };

  const toggleFocus = (variable: FocusVariable) => {
    setFocusVariables((current) => {
      if (current.includes(variable)) return current.filter((item) => item !== variable);
      if (current.length >= 3) return current;
      return [...current, variable];
    });
  };

  const submitAmv = async () => {
    const clean = message.trim();
    if (!clean) return;
    setBusy(true);
    setOutputNote('AMV calcula lectura scoped; la UI muestra una ruta dominante.');

    try {
      const response = await fetch('/api/amv', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          scope: 'scorefriction',
          message: clean,
          selectedContext: {
            mode: 'wide',
            focusVariables,
            activeLayers,
          },
        }),
      });
      const data = (await response.json()) as AmvResponse;
      if (!response.ok || !data.ok) throw new Error(data.error ?? 'amv_unavailable');
      setAmv(data);
    } catch {
      setAmv({
        ok: false,
        sourceTrust: 'degraded',
        response: {
          evento: clean,
          resultado: 'AMV no disponible. Lectura local sin persistencia.',
          efecto: 'No declara evidencia externa ni alimenta regimen.',
          ventana: 'Reintentar cuando /api/amv este disponible.',
          ruta_unica: 'Mantener observacion local sin abrir rutas paralelas.',
        },
        warnings: ['amv_unavailable'],
      });
    } finally {
      setBusy(false);
    }
  };

  const exportJson = async () => {
    setOutputNote('Solicitando contrato JSON visible...');
    try {
      const response = await fetch('/api/amv/export', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scope: 'scorefriction', mode: 'wide', visibleResponse, focusVariables, activeLayers }),
      });
      setOutputNote(response.ok ? 'Informe de Campo JSON solicitado sin escritura local.' : 'Contrato disponible / persistencia pendiente.');
    } catch {
      setOutputNote('Contrato disponible / persistencia pendiente.');
    }
  };

  return (
    <main className="min-h-screen bg-[#050504] text-[#d8d0bd]">
      <header className="border-b border-[#2b261d] bg-[#0b0a08]">
        <div className="mx-auto flex max-w-[1560px] flex-col gap-4 px-5 py-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-[#b8924b]">System Friction Institute · ScoreFriction Wide</p>
            <h1 className="mt-2 font-serif text-4xl text-[#ead8aa]">Campo de Observacion Cultural</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#958a77]">
              Consola AMV para leer acoplamiento cultural, WSV global, MIHM basal, RCE, atractores, eyectores y evidencia visible sin declarar fuentes externas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
            <span className="border border-[#b8924b]/40 bg-[#17130d] px-3 py-2 text-[#ead8aa]">Regimen · {regime}</span>
            <span className="border border-[#43d2a4]/30 px-3 py-2 text-[#7ee6c4]">Pulso activo</span>
            <Link href="/scorefriction" className="border border-[#2b261d] px-3 py-2 text-[#a89469] hover:border-[#b8924b] hover:text-[#ead8aa]">Observatorio</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1560px] gap-4 px-5 py-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          <Panel title="Field Canvas · Φ_SF">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <FieldCanvas activeLayers={activeLayers} phi={phi} />
              <div className="space-y-3">
                <div className="border border-[#2b261d] bg-[#080706] p-3">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8d826e]">Capas activables</div>
                  <div className="mt-3 grid gap-2">
                    {LAYERS.map((layer) => (
                      <button
                        key={layer.id}
                        type="button"
                        onClick={() => toggleLayer(layer.id)}
                        className={cn(
                          'border px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.12em]',
                          activeLayers.includes(layer.id)
                            ? 'border-[#43d2a4]/60 bg-[#0b211b] text-[#7ee6c4]'
                            : 'border-[#2b261d] bg-[#0a0907] text-[#8d826e]',
                        )}
                      >
                        {layer.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="border border-[#2b261d] bg-[#080706] p-3 text-xs leading-5 text-[#a89c86]">
                  Estado demo-local: lectura local / sin evidencia externa. El canvas no declara datos reales.
                </div>
              </div>
            </div>
          </Panel>

          <div className="grid gap-3 md:grid-cols-5">
            <MiniMetric label="NTI Obs." value="basal" note="sin evidencia externa" />
            <MiniMetric label="LDI" value={ldi.toFixed(2)} note="basal" />
            <MiniMetric label="IHG" value="0.41" note="basal" />
            <MiniMetric label="Φ_SF" value={phi.toFixed(2)} note="lectura local" />
            <MiniMetric label="RCE" value={rce.toFixed(2)} note="sin cierre real" />
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Panel title="AMV ScoreFriction">
              <div className="flex flex-col gap-3">
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void submitAmv();
                  }}
                  placeholder="Evento de campo · cancion · fenomeno · institucion..."
                  className="border border-[#2b261d] bg-[#070706] px-4 py-3 text-sm text-[#ead8aa] outline-none placeholder:text-[#635947] focus:border-[#b8924b]"
                />
                <button
                  type="button"
                  onClick={() => void submitAmv()}
                  disabled={busy || !message.trim()}
                  className="w-fit border border-[#b8924b]/60 bg-[#17130d] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#ead8aa] disabled:opacity-40"
                >
                  {busy ? 'Leyendo campo...' : 'Enviar a AMV'}
                </button>
              </div>
              <div className="mt-4 grid gap-2 text-sm leading-6">
                <p><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#b8924b]">evento</span><br />{visibleResponse.evento}</p>
                <p><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#b8924b]">resultado</span><br />{visibleResponse.resultado}</p>
                <p><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#b8924b]">efecto</span><br />{visibleResponse.efecto}</p>
                <p><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#b8924b]">ventana</span><br />{visibleResponse.ventana}</p>
                <p><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#b8924b]">ruta unica</span><br />{visibleResponse.ruta_unica}</p>
              </div>
            </Panel>

            <Panel title="Focus Variables · max 3">
              <div className="grid gap-2">
                {FOCUS_VARIABLES.map((variable) => {
                  const active = focusVariables.includes(variable);
                  const blocked = !active && focusVariables.length >= 3;
                  return (
                    <button
                      key={variable}
                      type="button"
                      onClick={() => toggleFocus(variable)}
                      disabled={blocked}
                      className={cn(
                        'border px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.12em]',
                        active ? 'border-[#b8924b]/70 bg-[#17130d] text-[#ead8aa]' : 'border-[#2b261d] text-[#958a77]',
                        blocked && 'opacity-35',
                      )}
                    >
                      {variable}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-[#8d826e]">{focusVariables.length}/3 activas · se envian en selectedContext.</p>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Signal Vane Mini">
              <div className="space-y-3">
                {[0.22, 0.38, 0.31, 0.53, 0.44, 0.29, 0.47].map((value, index) => (
                  <Bar key={index} label={`t-${6 - index}`} value={value} tone={index % 3 === 0 ? 'red' : 'gold'} />
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-[#a89c86]">Patron candidato: friccion cultural debil. Ventana relativa: ciclo corto. {evidenceState === 'ausencia operativa' ? 'Ausencia operativa.' : 'Lectura degradada.'}</p>
            </Panel>
            <Panel title="MIHM / RCE">
              <div className="space-y-3 text-sm leading-6 text-[#b8ad98]">
                <p>Φ · {phi.toFixed(2)}</p>
                <p>RCE · {rce.toFixed(2)}</p>
                <p>MIHM basal · ScoreFriction</p>
                <p className="text-xs text-[#8d826e]">MIHM objeto-campo pendiente si no hay fenomeno declarado.</p>
              </div>
            </Panel>
          </div>
        </section>

        <aside className="space-y-4">
          <Panel title="WorldSpect Vector">
            <div className="space-y-3">
              {LAYERS.map((layer) => (
                <Bar key={layer.id} label={layer.label} value={activeLayers.includes(layer.id) ? layer.value : layer.value * 0.45} tone={layer.id === 'cultural' ? 'teal' : 'gold'} />
              ))}
            </div>
            <p className="mt-3 text-xs text-[#8d826e]">WSV basal/degraded. Sin fuentes externas declaradas.</p>
          </Panel>

          <Panel title="Atractores / Eyectores">
            <div className="space-y-4">
              <div className="space-y-2">
                {ATTRACTORS.map((item) => (
                  <div key={item.label} className="flex items-center justify-between border border-[#21483d] bg-[#08130f] px-3 py-2 text-sm">
                    <span><span className="text-[#43d2a4]">▲</span> {item.label}</span>
                    <span className="font-mono text-xs text-[#7ee6c4]">{item.strength}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {EJECTORS.map((item) => (
                  <div key={item.label} className="flex items-center justify-between border border-[#5b2d22] bg-[#160c09] px-3 py-2 text-sm">
                    <span><span className="text-[#f08a5d]">▼</span> {item.label}</span>
                    <span className="font-mono text-xs text-[#f08a5d]">{item.strength}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#8d826e]">Si falta evidencia externa, fuerza visible queda como lectura local; sin lectura suficiente para regimen.</p>
            </div>
          </Panel>

          <Panel title="Cobertura de Evidencia">
            <div className="space-y-3">
              <Bar label="fuentes culturales" value={evidenceState === 'parcial' ? 0.46 : 0.18} tone="gold" />
              <Bar label="senales biologicas" value={0.12} tone="red" />
              <Bar label="observacion ecosistemica" value={0.16} tone="gold" />
              <Bar label="lectura institucional" value={0.24} tone="gold" />
            </div>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#b8924b]">Estado · {evidenceState}</p>
          </Panel>

          <Panel title="Outputs Accionables">
            <div className="grid gap-2">
              <button type="button" disabled title="contrato disponible / persistencia pendiente" className="border border-[#2b261d] px-3 py-2 text-left text-xs text-[#706653]">Brief Creativo · campo actual</button>
              <button type="button" onClick={() => void exportJson()} className="border border-[#b8924b]/50 px-3 py-2 text-left text-xs text-[#ead8aa]">Informe de Campo · JSON</button>
              <button type="button" disabled title="contrato disponible / persistencia pendiente" className="border border-[#2b261d] px-3 py-2 text-left text-xs text-[#706653]">Lectura Cultural · texto</button>
              <button type="button" disabled title="contrato disponible / persistencia pendiente" className="border border-[#2b261d] px-3 py-2 text-left text-xs text-[#706653]">Matriz de Escenarios</button>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#8d826e]">{outputNote}</p>
          </Panel>
        </aside>
      </div>

      <footer className="sticky bottom-0 border-t border-[#2b261d] bg-[#080706]/96 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1560px] flex-wrap gap-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[#a89c86]">
          <span>regimen {regime}</span>
          <span>φ_sf {phi.toFixed(2)}</span>
          <span>ldi {ldi.toFixed(2)}</span>
          <span>rce {rce.toFixed(2)}</span>
          <span>nodos activos {activeLayers.length + focusVariables.length}</span>
          <span>scope scorefriction</span>
        </div>
      </footer>
    </main>
  );
}
