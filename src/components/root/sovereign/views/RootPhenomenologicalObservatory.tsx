'use client';

import { useEffect, useRef, useState } from 'react';
import type { RootSovereignState } from '@/lib/root/sovereign/rootSovereignState';

type PhenomenonDetail = {
  phenomenon: Record<string, unknown>;
  evidence: Array<Record<string, unknown>>;
  currentHypothesis: Record<string, unknown> | null;
};

type NodeGeometry = { id: string; x: number; y: number; r: number };

const DIRECTION_LABEL: Record<string, string> = {
  DEEPENING: '↓ PROFUNDIZACIÓN',
  EXPANSION: '↑ EXPANSIÓN',
  FRAGMENTATION: '← FRAGMENTACIÓN',
  CONVERGENCE: '→ CONVERGENCIA',
  INSTITUTIONALIZATION: '↗ INSTITUCIONALIZACIÓN',
  DEGRADATION: '↘ DEGRADACIÓN',
  ABSTRACTION: '↖ ABSTRACCIÓN',
  OPERATIONALIZATION: '↙ OPERACIONALIZACIÓN',
};

const ATTRACTOR_FAMILY = new Set(['EXPANSION', 'INSTITUTIONALIZATION', 'CONVERGENCE']);
const EJECTOR_FAMILY = new Set(['DEGRADATION', 'FRAGMENTATION']);

function directionColor(direction: string | null): string {
  if (!direction) return '150,140,110';
  if (ATTRACTOR_FAMILY.has(direction)) return '95,197,138';
  if (EJECTOR_FAMILY.has(direction)) return '224,108,103';
  return '208,100,167';
}

export function RootPhenomenologicalObservatory({
  state,
  onExit,
  onRefresh,
}: {
  state: RootSovereignState;
  onExit: () => void;
  onRefresh: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<NodeGeometry[]>([]);
  const frameRef = useRef(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PhenomenonDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [newCaseName, setNewCaseName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [evSource, setEvSource] = useState('');
  const [evDomain, setEvDomain] = useState('');
  const [evText, setEvText] = useState('');

  const phenomena = state.telemetry.data.phenomena;
  const instruments = state.telemetry.data.instruments;
  const selected = phenomena.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    fetch(`/api/ppoi/phenomena/${selectedId}`)
      .then((response) => response.json())
      .then((body) => {
        if (!cancelled && body.ok) setDetail(body);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const glitter = Array.from({ length: 140 }, () => ({
      x: Math.random(),
      y: Math.random(),
      s: Math.random() * 1.1 + 0.2,
      p: Math.random() * Math.PI * 2,
    }));

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = rect.width;
      canvas!.height = rect.height;
    }
    resize();
    window.addEventListener('resize', resize);

    // Salud agregada real: promedio de instrumentos con lectura + promedio de
    // compuestos PPOI disponibles. Si no hay nada, el núcleo queda apagado —
    // no se inventa un valor central.
    const instrumentValues = instruments.filter((item) => item.value !== null).map((item) => item.value as number);
    const phenomenonValues = phenomena.filter((item) => item.composite !== null).map((item) => item.composite as number);
    const allValues = [...instrumentValues, ...phenomenonValues.map((value) => value / 5)];
    const coreHealth = allValues.length ? allValues.reduce((sum, value) => sum + value, 0) / allValues.length : null;

    function draw() {
      const w = canvas!.width;
      const h = canvas!.height;
      const cx = w / 2;
      const cy = h / 2;
      const t = frameRef.current * 0.006;
      frameRef.current += 1;

      ctx!.fillStyle = '#060605';
      ctx!.fillRect(0, 0, w, h);

      for (const g of glitter) {
        const alpha = 0.15 + Math.sin(t * 2 + g.p) * 0.1;
        ctx!.fillStyle = `rgba(200,169,81,${Math.max(0.03, alpha)})`;
        ctx!.beginPath();
        ctx!.arc(g.x * w, g.y * h, g.s, 0, Math.PI * 2);
        ctx!.fill();
      }

      const maxOrbit = Math.min(w, h) * 0.42;
      const minOrbit = Math.min(w, h) * 0.14;

      // Anillos guía — contexto de escala, no datos.
      ctx!.strokeStyle = 'rgba(200,169,81,0.045)';
      ctx!.lineWidth = 1;
      [0.35, 0.65, 1].forEach((fraction) => {
        ctx!.beginPath();
        ctx!.arc(cx, cy, minOrbit + (maxOrbit - minOrbit) * fraction, 0, Math.PI * 2);
        ctx!.stroke();
      });

      // Núcleo — pulso decorativo, tamaño/color de salud real.
      const pulse = 1 + Math.sin(t * 1.6) * 0.05;
      const coreR = (coreHealth === null ? 18 : 16 + coreHealth * 26) * pulse;
      const coreRgb = coreHealth === null ? '90,85,70' : coreHealth > 0.6 ? '95,197,138' : coreHealth > 0.3 ? '200,169,81' : '224,108,103';
      const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, coreR * 2.4);
      grad.addColorStop(0, `rgba(${coreRgb},0.55)`);
      grad.addColorStop(0.4, `rgba(${coreRgb},0.16)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx!.fillStyle = grad;
      ctx!.beginPath();
      ctx!.arc(cx, cy, coreR * 2.4, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.fillStyle = `rgba(${coreRgb},0.9)`;
      ctx!.beginPath();
      ctx!.arc(cx, cy, Math.max(3, coreR * 0.22), 0, Math.PI * 2);
      ctx!.fill();

      // Nodos — posición real: radio = mezcla de eyección (aleja) y falta de
      // atracción (aleja); ángulo = distribución uniforme + rotación lenta.
      const geometry: NodeGeometry[] = [];
      phenomena.forEach((phenomenon, index) => {
        const angle = (index / Math.max(phenomena.length, 1)) * Math.PI * 2 + t * 0.15;
        const pull = phenomenon.ejectorPull * 0.7 + (1 - phenomenon.attractorPull) * 0.3;
        const radius = minOrbit + Math.min(1, Math.max(0, pull)) * (maxOrbit - minOrbit);
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        const r = 5 + Math.min(10, Math.abs(phenomenon.composite ?? 0) * 1.8);
        geometry.push({ id: phenomenon.id, x, y, r });

        const rgb = directionColor(phenomenon.direction);
        const isSelected = phenomenon.id === selectedId;
        ctx!.beginPath();
        ctx!.arc(x, y, r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(17,26,29,${isSelected ? 0.95 : 0.8})`;
        ctx!.fill();
        ctx!.strokeStyle = `rgba(${rgb},${isSelected ? 1 : 0.75})`;
        ctx!.lineWidth = isSelected ? 2 : 1.2;
        ctx!.stroke();

        ctx!.fillStyle = isSelected ? 'rgba(245,238,220,0.95)' : 'rgba(170,181,183,0.7)';
        ctx!.font = '9px "IBM Plex Mono", monospace';
        ctx!.textAlign = 'center';
        ctx!.fillText(phenomenon.fpCode, x, y - r - 8);
      });
      nodesRef.current = geometry;

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [phenomena, instruments, selectedId]);

  function handleCanvasClick(event: React.MouseEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hit = nodesRef.current.find((node) => Math.hypot(node.x - x, node.y - y) <= node.r + 6);
    setSelectedId(hit ? hit.id : null);
  }

  async function openCase() {
    if (!newCaseName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/ppoi/phenomena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCaseName.trim() }),
      });
      const body = await response.json();
      if (!body.ok) {
        setError(body.details || body.error);
        return;
      }
      setNewCaseName('');
      onRefresh();
    } finally {
      setBusy(false);
    }
  }

  async function addEvidence() {
    if (!selectedId || !evSource.trim() || !evDomain.trim() || !evText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/ppoi/phenomena/${selectedId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidenceType: 'texto',
          source: evSource.trim(),
          domain: evDomain.trim(),
          contentText: evText.trim(),
        }),
      });
      const body = await response.json();
      if (!body.ok) {
        setError(body.details || body.error);
        return;
      }
      setEvSource('');
      setEvDomain('');
      setEvText('');
      onRefresh();
      const refreshed = await fetch(`/api/ppoi/phenomena/${selectedId}`).then((response) => response.json());
      if (refreshed.ok) setDetail(refreshed);
    } finally {
      setBusy(false);
    }
  }

  const hypothesis = detail?.currentHypothesis;

  return (
    <div className="po-root">
      <button type="button" className="po-exit" onClick={onExit}>← CONSOLA</button>

      <div className="po-hud">
        {instruments.map((instrument) => (
          <span key={instrument.id}>
            {instrument.symbol} <strong>{instrument.value !== null ? instrument.value.toFixed(3) : '—'}</strong>
          </span>
        ))}
        <span>{new Date().toISOString().replace('T', ' ').slice(0, 19)}</span>
      </div>

      <canvas ref={canvasRef} className="po-canvas" onClick={handleCanvasClick} />

      {phenomena.length === 0 ? (
        <div className="po-empty">
          SIN FENÓMENOS OBSERVADOS TODAVÍA.<br />
          El núcleo permanece apagado hasta que exista al menos un expediente con evidencia calibrada.
        </div>
      ) : null}

      <div className="po-open-case">
        <span>ABRIR CASO</span>
        <input value={newCaseName} onChange={(event) => setNewCaseName(event.target.value)} placeholder="Nombre del fenómeno" />
        <button type="button" onClick={openCase} disabled={busy}>{busy ? '...' : 'ABRIR'}</button>
        {error ? <span style={{ color: '#e06c67' }}>{error}</span> : null}
      </div>

      {selected ? (
        <div className="po-panel">
          <button type="button" className="po-panel-close" onClick={() => setSelectedId(null)}>CERRAR ×</button>
          <span className="po-fp">{selected.fpCode}</span>
          <h2>{selected.name}</h2>
          <span className="po-composite">Φ𝒻 {selected.composite !== null ? selected.composite.toFixed(3) : '—'}</span>

          <dl>
            <div><dt>DIRECCIÓN</dt><dd>{selected.direction ? DIRECTION_LABEL[selected.direction] ?? selected.direction : '—'}</dd></div>
            <div><dt>RIVAL</dt><dd>{selected.rivalDirection ? DIRECTION_LABEL[selected.rivalDirection] ?? selected.rivalDirection : '—'}</dd></div>
            <div><dt>ATRACCIÓN</dt><dd>{selected.attractorPull.toFixed(3)}</dd></div>
            <div><dt>EYECCIÓN</dt><dd>{selected.ejectorPull.toFixed(3)}</dd></div>
          </dl>

          {loadingDetail ? <p style={{ fontSize: 9, color: '#5d574a' }}>Cargando expediente…</p> : null}

          {hypothesis ? (
            <>
              <p className="po-rationale">{String(hypothesis.rationale ?? '')}</p>
              <p className="po-rival">Rival: {String(hypothesis.rival_rationale ?? '')}</p>
            </>
          ) : null}

          <h3>EVIDENCIA ({detail?.evidence.length ?? 0})</h3>
          <div className="po-evidence-list">
            {(detail?.evidence ?? []).slice(0, 6).map((item) => (
              <div key={String(item.id)}>
                {String(item.evidence_type)} · {String(item.domain)} · {String(item.source)}
                {item.content_text ? <p style={{ marginTop: 3 }}>{String(item.content_text).slice(0, 140)}</p> : null}
              </div>
            ))}
          </div>

          <h3>CARGAR EVIDENCIA</h3>
          <label>
            FUENTE
            <input type="text" value={evSource} onChange={(event) => setEvSource(event.target.value)} />
          </label>
          <label>
            DOMINIO
            <input type="text" value={evDomain} onChange={(event) => setEvDomain(event.target.value)} />
          </label>
          <label>
            NOTA / OBSERVACIÓN
            <textarea rows={3} value={evText} onChange={(event) => setEvText(event.target.value)} />
          </label>
          <button type="button" className="po-submit" onClick={addEvidence} disabled={busy}>
            {busy ? 'RECALIBRANDO…' : 'CARGAR Y RECALIBRAR'}
          </button>
          {error ? <span style={{ color: '#e06c67', fontSize: 9 }}>{error}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
