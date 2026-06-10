'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AmvChat } from '@/components/amv/AmvChat';
import { SfiMark } from '@/components/sfi/SfiMark';
import { SfiNodeCard } from '@/components/sfi/SfiNodeCard';
import { FOUNDATION_COPY } from './foundation-copy';
import { FOUNDATION_NODES, type FoundationNode } from './foundation-nodes';
import { nodeAlpha, projectNode, strokeAlpha, visibleAtScale, visualRadius } from './repository-math';

type Pointer = { x: number; y: number };

const INITIAL_VIEW = { camX: 0, camY: 0, scale: 0.62 };

export function FoundationRepositoryField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ active: boolean; start: Pointer; camX: number; camY: number }>({ active: false, start: { x: 0, y: 0 }, camX: 0, camY: 0 });
  const [view, setView] = useState(INITIAL_VIEW);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [pointer, setPointer] = useState<Pointer>({ x: -100, y: -100 });
  const [trail, setTrail] = useState<Pointer[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);

  const nodeById = useMemo(() => new Map(FOUNDATION_NODES.map((node) => [node.id, node])), []);
  const selected = selectedId ? nodeById.get(selectedId) ?? null : null;

  useEffect(() => {
    const update = () => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (rect) setSize({ width: rect.width, height: rect.height });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let raf = 0;
    const dpr = window.devicePixelRatio || 1;

    const draw = () => {
      canvas.width = Math.max(1, Math.floor(size.width * dpr));
      canvas.height = Math.max(1, Math.floor(size.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.width, size.height);
      ctx.fillStyle = '#060605';
      ctx.fillRect(0, 0, size.width, size.height);

      drawGrid(ctx, size.width, size.height, frame, view);
      drawConnections(ctx, frame, view, size, hoveredId, selectedId, nodeById);
      drawNodes(ctx, frame, view, size, hoveredId, selectedId);

      frame += 1;
      raf = window.requestAnimationFrame(draw);
    };

    draw();
    return () => window.cancelAnimationFrame(raf);
  }, [hoveredId, nodeById, selectedId, size, view]);

  function currentProjection(node: FoundationNode) {
    return projectNode(node, { ...view, ...size });
  }

  function findNode(point: Pointer) {
    return [...FOUNDATION_NODES].reverse().find((node) => {
      if (!visibleAtScale(node, view.scale, selectedId)) return false;
      const p = currentProjection(node);
      const dx = point.x - p.x;
      const dy = point.y - p.y;
      return Math.sqrt(dx * dx + dy * dy) <= Math.max(12, p.radius);
    }) ?? null;
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    setPointer(point);
    setTrail((items) => [point, ...items].slice(0, 8));

    if (dragRef.current.active) {
      const dx = (event.clientX - dragRef.current.start.x) / view.scale;
      const dy = (event.clientY - dragRef.current.start.y) / view.scale;
      setView((current) => ({ ...current, camX: dragRef.current.camX - dx, camY: dragRef.current.camY - dy }));
      return;
    }

    setHoveredId(findNode(point)?.id ?? null);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const node = findNode(point);
    if (node) {
      setSelectedId(node.id);
      return;
    }
    dragRef.current = { active: true, start: { x: event.clientX, y: event.clientY }, camX: view.camX, camY: view.camY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    dragRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const next = Math.max(0.42, Math.min(1.65, view.scale - event.deltaY * 0.0012));
    setView((current) => ({ ...current, scale: next }));
  }

  return (
    <main className="sfi-screen relative min-h-screen overflow-hidden bg-[#060605] text-[#c8c4b8]">
      {!entered ? (
        <section className="absolute inset-0 z-50 grid place-items-center bg-[#060605]">
          <div className="repo-entry text-center">
            <div className="mb-10 flex justify-center"><SfiMark className="h-20 w-20" /></div>
            <p className="sfi-title text-[10px] text-[#c8a95199]">System Friction Institute</p>
            <h1 className="mt-8 font-serif text-[clamp(2.4rem,8vw,7.5rem)] italic leading-[0.9] text-[#e8ddc3]">
              {FOUNDATION_COPY.entryTitle.map((line) => <span key={line} className="block">{line}</span>)}
            </h1>
            <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.26em] text-[#8a8678]">Repositorio Fundacional / v1.0 / 2026</p>
            <button onClick={() => setEntered(true)} className="mt-12 border border-[#c8a95133] px-6 py-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[#c8a951] hover:bg-[#c8a95110]">
              navegar el campo
            </button>
          </div>
        </section>
      ) : null}

      <header className="pointer-events-none fixed left-0 right-0 top-0 z-30 flex h-[30px] items-center border-b border-[#c8a95112] bg-[#060605]/90 px-4 backdrop-blur">
        <SfiMark className="mr-3 h-4 w-4" />
        <div className="sfi-title text-[9px] text-[#c8a951]">SYSTEM FRICTION INSTITUTE</div>
        <div className="ml-auto font-mono text-[9px] uppercase tracking-[0.2em] text-[#4a4a45]">Repositorio Fundacional / Campo Vivo</div>
      </header>

      <div
        ref={wrapRef}
        className="relative h-screen cursor-none overflow-hidden"
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        <div className="pointer-events-none fixed z-40 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#c8a95166] mix-blend-screen" style={{ left: pointer.x, top: pointer.y }} />
        {trail.map((item, index) => (
          <div
            key={`${item.x}-${item.y}-${index}`}
            className="pointer-events-none fixed z-40 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c8a951]"
            style={{ left: item.x, top: item.y, opacity: 0.35 - index * 0.035 }}
          />
        ))}

        <aside className="pointer-events-auto absolute bottom-5 left-5 z-20 w-48 border border-[#c8a95122] bg-[#050507cc] p-3 backdrop-blur">
          <div className="font-mono text-[8px] uppercase tracking-[0.26em] text-[#6b5820]">FIELD MAP</div>
          <div className="mt-3 h-28 border border-[#c8a95114] bg-[#060605]">
            <svg viewBox="-760 -600 1760 1220" className="h-full w-full">
              {FOUNDATION_NODES.map((node) => (
                <circle key={node.id} cx={node.x} cy={node.y} r={node.id === selectedId ? 22 : Math.max(5, visualRadius(node) * 0.18)} fill={node.id === selectedId ? '#c8a951' : '#6b5820'} opacity={node.weight} />
              ))}
            </svg>
          </div>
          <div className="mt-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.14em] text-[#8a8678]">
            <span>{hoveredId ?? 'CAMPO'}</span>
            <span>{view.scale.toFixed(2)}x</span>
          </div>
        </aside>
      </div>

      {selected ? (
        <SfiNodeCard superLabel={selected.superLabel} title={selected.title} onClose={() => setSelectedId(null)}>
          <div className="space-y-5">
            <p className="whitespace-pre-line">{FOUNDATION_COPY[selected.contentKey]}</p>
            <div className="grid grid-cols-2 gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8a8678]">
              <Metric label="evidence" value={selected.evidenceCount} />
              <Metric label="private" value={selected.privateEvidenceCount} />
              <Metric label="density" value={selected.density.toFixed(2)} />
              <Metric label="degradation" value={selected.degradation.toFixed(2)} />
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.connections.map((id) => {
                const target = nodeById.get(id);
                if (!target) return null;
                return (
                  <button key={id} onClick={() => setSelectedId(id)} className="border border-[#c8a95122] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.16em] text-[#a89469] hover:border-[#c8a951] hover:text-[#f0d172]">
                    {target.label}
                  </button>
                );
              })}
            </div>
            {selected.id === 'AMV' ? (
              <AmvChat
                module="repository"
                sessionId="repository-amv-node"
                title="AMV / nodo fundacional"
                context={{ nodeId: selected.id, title: selected.title, evidenceCount: selected.evidenceCount }}
                compact
              />
            ) : null}
          </div>
        </SfiNodeCard>
      ) : null}

      <style jsx>{`
        .repo-entry {
          animation: repo-entry 2.2s ease-out both;
        }
        @keyframes repo-entry {
          from { opacity: 0; filter: blur(18px); transform: translateY(16px) scale(0.98); }
          to { opacity: 1; filter: blur(0); transform: translateY(0) scale(1); }
        }
      `}</style>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-[#c8a95114] p-2">
      <div className="text-[#4a4a45]">{label}</div>
      <div className="mt-1 text-[#c8a951]">{value}</div>
    </div>
  );
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, frame: number, view: typeof INITIAL_VIEW) {
  ctx.save();
  ctx.strokeStyle = 'rgba(200,169,81,0.035)';
  ctx.lineWidth = 1;
  const gap = 42 * view.scale;
  const offsetX = (-view.camX * view.scale + frame * 0.05) % gap;
  const offsetY = (-view.camY * view.scale) % gap;
  for (let x = offsetX; x < width; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.sin(frame * 0.01 + x * 0.01) * 10, height);
    ctx.stroke();
  }
  for (let y = offsetY; y < height; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + Math.cos(frame * 0.01 + y * 0.01) * 10);
    ctx.stroke();
  }
  ctx.restore();
}

function drawConnections(
  ctx: CanvasRenderingContext2D,
  frame: number,
  view: typeof INITIAL_VIEW,
  size: { width: number; height: number },
  hoveredId: string | null,
  selectedId: string | null,
  nodeById: Map<string, FoundationNode>
) {
  for (const node of FOUNDATION_NODES) {
    if (!visibleAtScale(node, view.scale, selectedId)) continue;
    const from = projectNode(node, { ...view, ...size });
    for (const targetId of node.connections) {
      const target = nodeById.get(targetId);
      if (!target || !visibleAtScale(target, view.scale, selectedId)) continue;
      const to = projectNode(target, { ...view, ...size });
      const active = hoveredId === node.id || hoveredId === target.id || selectedId === node.id || selectedId === target.id;
      const pulse = 0.04 + Math.sin(frame * 0.025 + node.x * 0.01) * 0.025;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = `rgba(200,169,81,${active ? 0.34 : 0.07 + pulse})`;
      ctx.lineWidth = active ? 1.4 : 0.7;
      ctx.stroke();
    }
  }
}

function drawNodes(
  ctx: CanvasRenderingContext2D,
  frame: number,
  view: typeof INITIAL_VIEW,
  size: { width: number; height: number },
  hoveredId: string | null,
  selectedId: string | null
) {
  const ordered = [...FOUNDATION_NODES].sort((a, b) => a.z - b.z);
  for (const node of ordered) {
    if (!visibleAtScale(node, view.scale, selectedId)) continue;
    const p = projectNode(node, { ...view, ...size });
    const active = hoveredId === node.id || selectedId === node.id;
    const alpha = nodeAlpha(node);
    const stroke = strokeAlpha(node);
    const pulse = Math.sin(frame * 0.035 + node.x * 0.02) * 2.5;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + pulse + (active ? 7 : 0), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,169,81,${active ? 0.10 : 0.035 * alpha})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(6,6,5,${0.78 + node.degradation * 0.15})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(200,169,81,${active ? 0.92 : stroke})`;
    ctx.lineWidth = active ? 2 : 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(2.5, p.radius * 0.16), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,169,81,${alpha})`;
    ctx.fill();

    if (p.radius > 10 || active) {
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = active ? '#e8ddc3' : 'rgba(200,196,184,0.72)';
      ctx.fillText(node.label, p.x, p.y + p.radius + 17);
    }
  }
}
