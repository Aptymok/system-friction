'use client';

import { useEffect, useRef } from 'react';

export function SfiFieldCanvas({
  className = '',
  density = 0.52,
  drift = 0.35,
}: {
  className?: string;
  density?: number;
  drift?: number;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let raf = 0;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = '#060605';
      ctx.fillRect(0, 0, rect.width, rect.height);

      const cols = 18;
      const rows = 10;
      const stepX = rect.width / cols;
      const stepY = rect.height / rows;
      ctx.lineWidth = 1;

      for (let y = 0; y <= rows; y += 1) {
        ctx.beginPath();
        for (let x = 0; x <= cols; x += 1) {
          const px = x * stepX;
          const wave = Math.sin(frame * 0.012 + x * 0.7 + y * 0.2) * 8 * drift;
          const py = y * stepY + wave;
          if (x === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = `rgba(200,169,81,${0.025 + density * 0.035})`;
        ctx.stroke();
      }

      for (let i = 0; i < 24; i += 1) {
        const angle = i * 2.399 + frame * 0.004;
        const radius = Math.min(rect.width, rect.height) * (0.12 + ((i * 17) % 31) / 100);
        const x = rect.width / 2 + Math.cos(angle) * radius;
        const y = rect.height / 2 + Math.sin(angle * 1.3) * radius * 0.62;
        ctx.fillStyle = `rgba(200,169,81,${0.05 + density * 0.10})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.1 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

      frame += 1;
      raf = window.requestAnimationFrame(draw);
    };

    draw();
    return () => window.cancelAnimationFrame(raf);
  }, [density, drift]);

  return <canvas ref={ref} className={`block h-full w-full ${className}`} aria-hidden="true" />;
}
