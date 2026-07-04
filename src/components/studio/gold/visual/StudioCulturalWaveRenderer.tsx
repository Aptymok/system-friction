'use client';

import { useEffect, useRef } from 'react';
import type { StudioGoldState } from '@/lib/studio/gold/studioGoldState';

type Props = {
  wave: StudioGoldState['culturalWave'];
};

function drawLabel(ctx: CanvasRenderingContext2D, label: string, x: number, y: number) {
  ctx.save();
  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.fillStyle = 'rgba(216, 210, 194, 0.72)';
  const words = label.split(' ');
  const lines = words.length > 2 ? [words.slice(0, 2).join(' '), words.slice(2).join(' ')] : [label];
  lines.forEach((line, index) => ctx.fillText(line, x + 6, y + index * 13));
  ctx.restore();
}

export function StudioCulturalWaveRenderer({ wave }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !parent || !ctx) return;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const rect = parent.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);

    const particles = Array.from({ length: 1500 }, (_, index) => {
      const point = wave.points[index % Math.max(1, wave.points.length)] ?? { x: 0, y: 0.5, amplitude: 0, density: 0 };
      return {
        seed: index * 12.9898,
        x: (index * 0.61803398875) % 1,
        y: point.y,
        lane: index % 9,
        density: point.density,
      };
    });

    const draw = (time: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const t = time * 0.001;
      ctx.clearRect(0, 0, width, height);

      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(5, 6, 8, 0.98)');
      gradient.addColorStop(1, 'rgba(8, 11, 15, 0.94)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(width * 0.04, height * 0.16);
      const gridWidth = width * 0.92;
      const gridHeight = height * 0.68;
      ctx.strokeStyle = 'rgba(193, 132, 45, 0.13)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 18; i += 1) {
        const p = i / 18;
        const y = gridHeight * (0.2 + p * 0.82);
        const perspective = (p - 0.5) * gridWidth * 0.16;
        ctx.beginPath();
        ctx.moveTo(gridWidth * 0.02 + perspective, y);
        ctx.lineTo(gridWidth * 0.98 - perspective, y);
        ctx.stroke();
      }
      for (let i = 0; i <= 22; i += 1) {
        const p = i / 22;
        ctx.beginPath();
        ctx.moveTo(gridWidth * p, gridHeight * 0.08);
        ctx.lineTo(gridWidth * (0.18 + p * 0.64), gridHeight * 1.02);
        ctx.stroke();
      }

      wave.markers.forEach((marker) => {
        const x = gridWidth * marker.x;
        ctx.strokeStyle = 'rgba(244, 199, 106, 0.50)';
        ctx.beginPath();
        ctx.moveTo(x, gridHeight * 0.04);
        ctx.lineTo(x, gridHeight * 0.72);
        ctx.stroke();
        ctx.fillStyle = 'rgba(244, 199, 106, 0.85)';
        ctx.fillRect(x - 1, gridHeight * 0.04, 2, 7);
        drawLabel(ctx, marker.label, x, gridHeight * 0.04);
      });

      const strands = 10;
      for (let lane = 0; lane < strands; lane += 1) {
        const alpha = 0.16 + lane * 0.035;
        ctx.beginPath();
        wave.points.forEach((point, index) => {
          const x = point.x * gridWidth;
          const pulse = Math.sin(t * (0.38 + wave.waveSpeed * 0.08) + point.x * 9 + lane * 0.58);
          const laneOffset = (lane - strands / 2) * (4 + point.density * 10);
          const y = gridHeight * (0.5 + (point.y - 0.5) * 0.84) + pulse * point.amplitude * 22 + laneOffset;
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = `rgba(244, 199, 106, ${alpha})`;
        ctx.lineWidth = lane === 5 ? 1.8 : 0.75;
        ctx.shadowColor = 'rgba(226, 161, 58, 0.35)';
        ctx.shadowBlur = lane === 5 ? 12 : 4;
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      particles.forEach((particle) => {
        const drift = (particle.x + t * (0.006 + wave.waveSpeed * 0.002) + particle.lane * 0.013) % 1;
        const point = wave.points[Math.floor(drift * (wave.points.length - 1))] ?? wave.points[0];
        const noise = Math.sin(particle.seed + t * 1.7) * 0.04;
        const x = drift * gridWidth;
        const y = gridHeight * (0.5 + ((point?.y ?? particle.y) - 0.5) * 0.9 + noise) + (particle.lane - 4) * 9;
        const size = 0.5 + (point?.density ?? particle.density) * 1.4;
        ctx.fillStyle = `rgba(226, 161, 58, ${0.12 + (point?.density ?? 0) * 0.55})`;
        ctx.fillRect(x, y, size, size);
      });

      ctx.restore();
      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      observer.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [wave]);

  return <canvas ref={canvasRef} className="sfi-studio-gold__wave-canvas" aria-label="Animated cultural wave field" />;
}
