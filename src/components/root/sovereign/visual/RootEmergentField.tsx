'use client';

import { useEffect, useMemo, useRef } from 'react';
import './root-emergent-field.css';

export type RootEmergentTopology = 'I' | 'II' | 'III';
export type RootEmergentTone = 'ok' | 'warn' | 'bad' | 'idle';

export type RootEmergentNode = {
  id: string;
  moduleId: string;
  topology: RootEmergentTopology;
  label: string;
  value: string;
  detail: string;
  tone: RootEmergentTone;
  x: number;
  y: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  cluster: number;
  radius: number;
};

const TONE_RGB: Record<RootEmergentTone, string> = {
  ok: '200,169,81',
  warn: '240,211,151',
  bad: '169,76,59',
  idle: '170,166,156',
};

export function RootEmergentField({
  phi,
  sourceHealth,
  filter,
  activeModule,
  nodes,
  onActivate,
}: {
  phi: string;
  sourceHealth: string;
  filter: 'all' | RootEmergentTopology;
  activeModule: string | null;
  nodes: RootEmergentNode[];
  onActivate: (node: RootEmergentNode) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodeSignature = useMemo(() => nodes.map((node) => `${node.id}:${node.tone}:${node.value}`).join('|'), [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !nodes.length) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const safeCanvas: HTMLCanvasElement = canvas;
    const safeContext: CanvasRenderingContext2D = context;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const particleCount = reduceMotion ? 90 : 220;
    let width = 1;
    let height = 1;
    let dpr = 1;
    let frame = 0;
    let active = true;
    let pointerX = -1000;
    let pointerY = -1000;

    const particles: Particle[] = Array.from({ length: particleCount }, (_, index) => ({
      x: Math.random() * Math.max(1, window.innerWidth),
      y: Math.random() * Math.max(1, window.innerHeight),
      vx: 0,
      vy: 0,
      phase: index * 0.731,
      cluster: index % nodes.length,
      radius: 0.6 + (index % 5) * 0.18,
    }));

    const resize = () => {
      const rect = safeCanvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      safeCanvas.width = Math.round(width * dpr);
      safeCanvas.height = Math.round(height * dpr);
      safeContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const pointer = (event: PointerEvent) => {
      const rect = safeCanvas.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
    };

    const leave = () => {
      pointerX = -1000;
      pointerY = -1000;
    };

    const draw = (time: number) => {
      if (!active) return;
      safeContext.clearRect(0, 0, width, height);
      const seconds = time * 0.001;
      const rootX = width * 0.5;
      const rootY = height * 0.5;

      for (const particle of particles) {
        const node = nodes[particle.cluster % nodes.length];
        const visible = filter === 'all' || node.topology === filter;
        const selected = activeModule === node.moduleId;
        const nodeX = width * node.x / 100;
        const nodeY = height * node.y / 100;
        const localIndex = Math.floor(particle.cluster + particle.phase * 17);
        const angle = particle.phase * 4.7 + localIndex * 0.41;
        const baseRadius = selected ? 12 : visible ? 24 : 54;
        const radial = baseRadius + (localIndex % 9) * (selected ? 1.5 : 2.6);
        let targetX = nodeX + Math.cos(angle + seconds * 0.035) * radial;
        let targetY = nodeY + Math.sin(angle + seconds * 0.031) * radial * 0.72;

        if (!visible) {
          targetX = rootX + (targetX - rootX) * 1.24;
          targetY = rootY + (targetY - rootY) * 1.24;
        }

        const dx = particle.x - pointerX;
        const dy = particle.y - pointerY;
        const distance = Math.hypot(dx, dy) || 1;
        if (!reduceMotion && distance < 120) {
          const force = (120 - distance) / 120;
          targetX += dx / distance * force * 22;
          targetY += dy / distance * force * 22;
        }

        particle.vx += (targetX - particle.x) * (selected ? 0.012 : 0.0065);
        particle.vy += (targetY - particle.y) * (selected ? 0.012 : 0.0065);
        particle.vx *= 0.9;
        particle.vy *= 0.9;
        particle.x += particle.vx;
        particle.y += particle.vy;
      }

      safeContext.lineWidth = 0.55;
      particles.forEach((particle, index) => {
        const node = nodes[particle.cluster % nodes.length];
        const visible = filter === 'all' || node.topology === filter;
        if (!visible) return;
        for (let offset = 1; offset <= 9 && index + offset < particles.length; offset += 1) {
          const other = particles[index + offset];
          if (other.cluster !== particle.cluster) continue;
          const distance = Math.hypot(particle.x - other.x, particle.y - other.y);
          if (distance > 58) continue;
          const rgb = TONE_RGB[node.tone];
          safeContext.strokeStyle = `rgba(${rgb},${(1 - distance / 58) * 0.13})`;
          safeContext.beginPath();
          safeContext.moveTo(particle.x, particle.y);
          safeContext.lineTo(other.x, other.y);
          safeContext.stroke();
        }
      });

      nodes.forEach((node) => {
        const visible = filter === 'all' || node.topology === filter;
        if (!visible) return;
        const nodeX = width * node.x / 100;
        const nodeY = height * node.y / 100;
        const rgb = TONE_RGB[node.tone];
        safeContext.strokeStyle = `rgba(${rgb},${activeModule === node.moduleId ? 0.24 : 0.075})`;
        safeContext.setLineDash(activeModule === node.moduleId ? [] : [2, 8]);
        safeContext.beginPath();
        safeContext.moveTo(rootX, rootY);
        safeContext.quadraticCurveTo((rootX + nodeX) / 2 + Math.sin(node.x) * 24, (rootY + nodeY) / 2 + Math.cos(node.y) * 24, nodeX, nodeY);
        safeContext.stroke();
      });
      safeContext.setLineDash([]);

      for (const particle of particles) {
        const node = nodes[particle.cluster % nodes.length];
        const visible = filter === 'all' || node.topology === filter;
        const selected = activeModule === node.moduleId;
        const rgb = TONE_RGB[node.tone];
        const alpha = visible ? (selected ? 0.82 : 0.44) : 0.08;
        safeContext.fillStyle = `rgba(${rgb},${alpha})`;
        safeContext.beginPath();
        safeContext.arc(particle.x, particle.y, selected ? particle.radius * 1.35 : particle.radius, 0, Math.PI * 2);
        safeContext.fill();
      }

      safeContext.fillStyle = 'rgba(240,211,151,.8)';
      safeContext.beginPath();
      safeContext.arc(rootX, rootY, 2.1 + Math.sin(seconds * 1.7) * 0.45, 0, Math.PI * 2);
      safeContext.fill();
      safeContext.strokeStyle = 'rgba(200,169,81,.18)';
      safeContext.beginPath();
      safeContext.arc(rootX, rootY, 17 + Math.sin(seconds * 1.1) * 2.5, 0, Math.PI * 2);
      safeContext.stroke();

      frame = window.requestAnimationFrame(draw);
    };

    resize();
    safeCanvas.addEventListener('pointermove', pointer, { passive: true });
    safeCanvas.addEventListener('pointerleave', leave);
    window.addEventListener('resize', resize);
    frame = window.requestAnimationFrame(draw);

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      safeCanvas.removeEventListener('pointermove', pointer);
      safeCanvas.removeEventListener('pointerleave', leave);
      window.removeEventListener('resize', resize);
    };
  }, [activeModule, filter, nodeSignature, nodes]);

  return (
    <section className="root-emergent" aria-label="ROOT emergent institutional particle field">
      <canvas ref={canvasRef} className="root-emergent-canvas" aria-hidden="true" />
      <div className="root-emergent-copy">
        <span>ROOT / EMERGENT INSTITUTIONAL FIELD</span>
        <strong>Authority is visible as relation, not as a dashboard shell.</strong>
        <small>PARTICLE FIELD = INTERFACE REPRESENTATION · NOT EVIDENCE · NOT CAUSALITY</small>
      </div>
      <div className="root-emergent-core" aria-label="ROOT institutional core">
        <span>ROOT</span>
        <strong>ΦSFI {phi}</strong>
        <small>{sourceHealth}</small>
      </div>
      {nodes.map((node) => {
        const visible = filter === 'all' || node.topology === filter;
        const selected = activeModule === node.moduleId;
        return (
          <button
            key={node.id}
            type="button"
            className={`root-emergent-node ${selected ? 'is-active' : ''} ${visible ? '' : 'is-dim'}`}
            data-tone={node.tone}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            onClick={() => onActivate(node)}
            aria-pressed={selected}
          >
            <i>{node.moduleId}</i>
            <span>{node.label}</span>
            <strong>{node.value}</strong>
            <small>{node.detail}</small>
          </button>
        );
      })}
      <div className="root-emergent-legend">
        <span><i data-tone="ok" />OBSERVED / OPERATIONAL</span>
        <span><i data-tone="warn" />DECLARED / INFERRED / PENDING</span>
        <span><i data-tone="bad" />DEGRADED / BLOCKED</span>
      </div>
      <div className="root-emergent-scroll">SCROLL ↓ INSTRUMENT LAYER</div>
    </section>
  );
}
