'use client';

import { useEffect, useRef } from 'react';
import './emergent-particle-field.css';

export type EmergentAnchor = {
  x: number;
  y: number;
  weight?: number;
  tone?: 'gold' | 'cyan' | 'violet' | 'amber' | 'red' | 'bone';
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  anchor: number;
  size: number;
};

const TONES: Record<NonNullable<EmergentAnchor['tone']>, [number, number, number]> = {
  gold: [200, 167, 100],
  cyan: [105, 165, 164],
  violet: [138, 127, 167],
  amber: [214, 164, 83],
  red: [169, 76, 59],
  bone: [232, 226, 213],
};

export function EmergentParticleField({
  anchors,
  density = 190,
  className = '',
  active = true,
}: {
  anchors: EmergentAnchor[];
  density?: number;
  className?: string;
  active?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const anchorsKey = JSON.stringify(anchors);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    if (!canvas || !host || !active) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let pointerX = -9999;
    let pointerY = -9999;
    const parsedAnchors = JSON.parse(anchorsKey) as EmergentAnchor[];
    const safeAnchors = parsedAnchors.length ? parsedAnchors : [{ x: 0.5, y: 0.5, weight: 1, tone: 'gold' as const }];
    const particles: Particle[] = Array.from({ length: Math.max(48, Math.min(360, density)) }, (_, index) => ({
      x: Math.random(),
      y: Math.random(),
      vx: 0,
      vy: 0,
      phase: Math.random() * Math.PI * 2,
      anchor: index % safeAnchors.length,
      size: 0.55 + Math.random() * 1.25,
    }));

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onPointer = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
    };
    const onLeave = () => { pointerX = -9999; pointerY = -9999; };

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    host.addEventListener('pointermove', onPointer);
    host.addEventListener('pointerleave', onLeave);
    resize();

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      const t = time * 0.001;

      particles.forEach((particle, index) => {
        const anchor = safeAnchors[particle.anchor % safeAnchors.length];
        const weight = Math.max(0.25, Math.min(2.4, anchor.weight ?? 1));
        const targetX = anchor.x * width + Math.cos(t * 0.34 + particle.phase) * (15 + 18 / weight);
        const targetY = anchor.y * height + Math.sin(t * 0.29 + particle.phase * 1.31) * (12 + 15 / weight);
        particle.vx += (targetX - particle.x * width) * 0.00022 * weight;
        particle.vy += (targetY - particle.y * height) * 0.00022 * weight;

        const px = particle.x * width;
        const py = particle.y * height;
        const dx = px - pointerX;
        const dy = py - pointerY;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 140) {
          const force = (140 - dist) / 140;
          particle.vx += (dx / dist) * force * 0.045;
          particle.vy += (dy / dist) * force * 0.045;
        }

        particle.vx *= 0.935;
        particle.vy *= 0.935;
        particle.x += particle.vx / Math.max(1, width);
        particle.y += particle.vy / Math.max(1, height);

        if (particle.x < -0.08 || particle.x > 1.08 || particle.y < -0.08 || particle.y > 1.08) {
          particle.x = 0.08 + Math.random() * 0.84;
          particle.y = 0.08 + Math.random() * 0.84;
          particle.vx = 0;
          particle.vy = 0;
        }

        if (index % 2 === 0) {
          for (let j = index + 1; j < Math.min(particles.length, index + 13); j += 2) {
            const other = particles[j];
            const ox = other.x * width;
            const oy = other.y * height;
            const d = Math.hypot(px - ox, py - oy);
            if (d < 78) {
              const rgb = TONES[anchor.tone ?? 'gold'];
              ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(1 - d / 78) * 0.115})`;
              ctx.lineWidth = 0.6;
              ctx.beginPath();
              ctx.moveTo(px, py);
              ctx.lineTo(ox, oy);
              ctx.stroke();
            }
          }
        }
      });

      particles.forEach((particle) => {
        const anchor = safeAnchors[particle.anchor % safeAnchors.length];
        const rgb = TONES[anchor.tone ?? 'gold'];
        const px = particle.x * width;
        const py = particle.y * height;
        const pulse = 0.54 + 0.28 * Math.sin(t * 1.05 + particle.phase);
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${Math.max(0.18, pulse)})`;
        ctx.beginPath();
        ctx.arc(px, py, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });

      frame = window.requestAnimationFrame(draw);
    };

    frame = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(frame);
      ro.disconnect();
      host.removeEventListener('pointermove', onPointer);
      host.removeEventListener('pointerleave', onLeave);
    };
  }, [active, anchorsKey, density]);

  return <canvas ref={ref} className={`sfi-emergent-particle-field ${className}`} aria-hidden="true" />;
}
