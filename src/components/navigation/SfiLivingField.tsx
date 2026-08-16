'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import './sfi-living-field.css';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  size: number;
  group: number;
};

function routeMode(pathname: string) {
  if (pathname.startsWith('/root')) return 'root';
  if (pathname.startsWith('/studio')) return 'studio';
  if (pathname.startsWith('/observatory')) return 'observation';
  if (pathname.startsWith('/field')) return 'field';
  if (pathname.startsWith('/method-lab')) return 'lab';
  if (pathname.startsWith('/cases')) return 'case';
  if (pathname.startsWith('/atlas') || pathname.startsWith('/ledger')) return 'memory';
  if (pathname.startsWith('/mihm')) return 'mihm';
  if (pathname.startsWith('/friction')) return 'friction';
  if (pathname.startsWith('/login') || pathname.startsWith('/signup')) return 'access';
  return 'signal';
}

function target(mode: string, index: number, count: number, width: number, height: number) {
  const centerX = width * 0.52;
  const centerY = height * 0.5;
  const t = index / Math.max(1, count - 1);
  const angle = index * 2.3999632297;
  const min = Math.min(width, height);

  if (mode === 'root' || mode === 'mihm') {
    const ring = 1 + (index % 4);
    const radius = min * (0.055 + ring * 0.055);
    return [centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius] as const;
  }
  if (mode === 'studio' || mode === 'case') {
    const steps = [[0.17,0.24],[0.35,0.39],[0.52,0.28],[0.69,0.44],[0.45,0.68],[0.76,0.7]];
    const point = steps[index % steps.length];
    const spread = 38 + (index % 7) * 3;
    return [width * point[0] + Math.cos(angle) * spread, height * point[1] + Math.sin(angle) * spread] as const;
  }
  if (mode === 'observation') {
    const clusters = [[0.22,0.28],[0.48,0.22],[0.73,0.39],[0.33,0.71],[0.69,0.73]];
    const point = clusters[index % clusters.length];
    const radius = min * (0.035 + (index % 11) / 11 * 0.09);
    return [width * point[0] + Math.cos(angle) * radius, height * point[1] + Math.sin(angle) * radius] as const;
  }
  if (mode === 'friction') {
    return [width * (0.1 + t * 0.8), height * (0.5 + Math.sin(t * 12.5) * 0.22)] as const;
  }
  if (mode === 'memory') {
    const radius = min * (0.08 + t * 0.24);
    return [centerX + Math.cos(angle) * radius, height * (0.15 + t * 0.7)] as const;
  }
  if (mode === 'field') {
    const columns = 12;
    return [width * (0.12 + (index % columns) / (columns - 1) * 0.76), height * (0.18 + Math.floor(index / columns) / 5 * 0.64)] as const;
  }
  if (mode === 'lab') {
    const radius = 24 + (index % 28) * 5;
    return [centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius * 0.68] as const;
  }
  if (mode === 'access') {
    const radius = min * (0.08 + (index % 3) * 0.09);
    return [centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius * 0.82] as const;
  }
  return [width * (0.09 + 0.82 * (((index * 37) % count) / count)), height * (0.1 + 0.8 * (((index * 59) % count) / count))] as const;
}

export function SfiLivingField() {
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mode = routeMode(pathname);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const count = reduceMotion ? 34 : 78;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let pointerX = width / 2;
    let pointerY = height / 2;
    let frame = 0;
    let active = true;

    const particles: Particle[] = Array.from({ length: count }, (_, index) => ({
      x: width * (((index * 43) % count) / count),
      y: height * (((index * 71) % count) / count),
      vx: 0,
      vy: 0,
      phase: index * 0.73,
      size: 0.65 + (index % 5) * 0.16,
      group: index % 8,
    }));

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function pointer(event: PointerEvent) {
      pointerX = event.clientX;
      pointerY = event.clientY;
      document.documentElement.style.setProperty('--sfi-mx', `${pointerX}px`);
      document.documentElement.style.setProperty('--sfi-my', `${pointerY}px`);
    }

    function draw(time: number) {
      if (!active) return;
      context.clearRect(0, 0, width, height);
      const seconds = time * 0.001;

      particles.forEach((particle, index) => {
        const [baseX, baseY] = target(mode, index, count, width, height);
        let tx = baseX + Math.sin(seconds * 0.34 + particle.phase) * 4;
        let ty = baseY + Math.cos(seconds * 0.29 + particle.phase) * 4;
        const dx = particle.x - pointerX;
        const dy = particle.y - pointerY;
        const distance = Math.hypot(dx, dy) || 1;
        if (!reduceMotion && distance < 170) {
          const force = (170 - distance) / 170;
          tx += (dx / distance) * force * 24;
          ty += (dy / distance) * force * 24;
        }
        particle.vx += (tx - particle.x) * (reduceMotion ? 0.025 : 0.006);
        particle.vy += (ty - particle.y) * (reduceMotion ? 0.025 : 0.006);
        particle.vx *= reduceMotion ? 0.7 : 0.91;
        particle.vy *= reduceMotion ? 0.7 : 0.91;
        particle.x += particle.vx;
        particle.y += particle.vy;
      });

      for (let index = 0; index < particles.length; index += 1) {
        const a = particles[index];
        for (let offset = 1; offset < 9 && index + offset < particles.length; offset += 1) {
          const b = particles[index + offset];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance > 112) continue;
          const alpha = (1 - distance / 112) * 0.11;
          context.strokeStyle = `rgba(200,167,100,${alpha})`;
          context.lineWidth = 0.55;
          context.beginPath();
          context.moveTo(a.x, a.y);
          context.lineTo(b.x, b.y);
          context.stroke();
        }
      }

      particles.forEach((particle, index) => {
        const hot = index % 17 === 0;
        context.fillStyle = hot ? 'rgba(240,211,151,.55)' : 'rgba(232,226,213,.20)';
        context.beginPath();
        context.arc(particle.x, particle.y, hot ? 1.45 : particle.size, 0, Math.PI * 2);
        context.fill();
      });

      frame = window.requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', pointer, { passive: true });
    frame = window.requestAnimationFrame(draw);

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', pointer);
    };
  }, [mode]);

  return (
    <div className="sfi-living-field" data-mode={mode} aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="sfi-living-field__orbit" />
      <div className="sfi-living-field__vignette" />
      <div className="sfi-living-field__grain" />
      <div className="sfi-living-field__scan" />
    </div>
  );
}
