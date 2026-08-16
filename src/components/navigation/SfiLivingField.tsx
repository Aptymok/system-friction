'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import './sfi-living-field.css';
import './sfi-surface-convergence.css';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  size: number;
  group: number;
};

type AnchorPoint = {
  x: number;
  y: number;
  rx: number;
  ry: number;
};

type FieldMode = 'signal'|'observation'|'system'|'friction'|'mihm'|'evidence'|'studio'|'memory'|'lab'|'trajectory'|'governance'|'field'|'research'|'root'|'final'|'case'|'access';

function routeMode(pathname: string): FieldMode {
  if (pathname.startsWith('/root')) return 'root';
  if (pathname.startsWith('/pipeline')) return 'system';
  if (pathname.startsWith('/studio')) return 'studio';
  if (pathname.startsWith('/observatory')) return 'observation';
  if (pathname.startsWith('/field')) return 'field';
  if (pathname.startsWith('/method-lab')) return 'lab';
  if (pathname.startsWith('/cases')) return 'case';
  if (pathname.startsWith('/member')) return 'case';
  if (pathname.startsWith('/atlas') || pathname.startsWith('/ledger')) return 'memory';
  if (pathname.startsWith('/library') || pathname.startsWith('/repository') || pathname.startsWith('/research') || pathname.startsWith('/publications') || pathname.startsWith('/founder-edition')) return 'research';
  if (pathname.startsWith('/entity') || pathname.startsWith('/world-vector')) return 'system';
  if (pathname.startsWith('/mihm')) return 'mihm';
  if (pathname.startsWith('/friction')) return 'friction';
  if (pathname.startsWith('/contact')) return 'field';
  if (pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot') || pathname.startsWith('/reset') || pathname.startsWith('/verify')) return 'access';
  return 'signal';
}

function sceneMode(id: string): FieldMode {
  if (id === 'observation') return 'observation';
  if (id === 'system') return 'system';
  if (id === 'friction') return 'friction';
  if (id === 'mihm') return 'mihm';
  if (id === 'evidence') return 'evidence';
  if (id === 'studio') return 'studio';
  if (id === 'twin') return 'memory';
  if (id === 'simulation') return 'lab';
  if (id === 'trajectories') return 'trajectory';
  if (id === 'governance') return 'governance';
  if (id === 'field') return 'field';
  if (id === 'research') return 'research';
  if (id === 'root') return 'root';
  if (id === 'institute') return 'final';
  return 'signal';
}

function sfiTarget(index: number, count: number, width: number, height: number) {
  const sCount = Math.floor(count * 0.36);
  const fCount = Math.floor(count * 0.34);
  const group = index < sCount ? 0 : index < sCount + fCount ? 1 : 2;
  const localIndex = group === 0 ? index : group === 1 ? index - sCount : index - sCount - fCount;
  const localCount = group === 0 ? sCount : group === 1 ? fCount : count - sCount - fCount;
  const t = localIndex / Math.max(1, localCount - 1);
  const centerY = height * 0.5;
  const scaleY = Math.min(height * 0.28, 245);
  const thickness = ((localIndex % 5) - 2) * 2.4;

  if (group === 0) {
    const y = centerY - scaleY + t * scaleY * 2;
    const x = width * 0.30 + Math.sin(t * Math.PI * 2.15 + Math.PI * 0.15) * Math.min(width * 0.055, 70) + thickness;
    return [x, y] as const;
  }

  if (group === 1) {
    const baseX = width * 0.50;
    const verticalShare = 0.54;
    if (t < verticalShare) {
      const vt = t / verticalShare;
      return [baseX + thickness, centerY - scaleY + vt * scaleY * 2] as const;
    }
    const barT = (t - verticalShare) / (1 - verticalShare);
    const top = localIndex % 2 === 0;
    return [baseX + barT * Math.min(width * 0.09, 120), centerY + (top ? -scaleY : -scaleY * 0.05) + thickness] as const;
  }

  const baseX = width * 0.72;
  const cap = localIndex % 4;
  if (cap === 0 || cap === 1) {
    return [baseX + (t - 0.5) * Math.min(width * 0.065, 86), centerY + (cap === 0 ? -scaleY : scaleY) + thickness] as const;
  }
  return [baseX + thickness, centerY - scaleY + t * scaleY * 2] as const;
}

function target(mode: FieldMode, index: number, count: number, width: number, height: number) {
  const centerX = width * 0.52;
  const centerY = height * 0.5;
  const t = index / Math.max(1, count - 1);
  const angle = index * 2.3999632297;
  const min = Math.min(width, height);

  if (mode === 'final') return sfiTarget(index, count, width, height);
  if (mode === 'root' || mode === 'mihm') {
    const ring = 1 + (index % 4);
    const radius = min * (0.055 + ring * 0.055);
    return [centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius] as const;
  }
  if (mode === 'system') {
    const ring = index % 3;
    const radius = min * (0.15 + ring * 0.105);
    const a = t * Math.PI * 6 + ring * 0.47;
    return [centerX + Math.cos(a) * radius, centerY + Math.sin(a) * radius * 0.72] as const;
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
    return [width * (0.1 + t * 0.8), height * (0.5 + Math.sin(t * 12.5) * 0.22) + ((index % 2) ? -17 : 17)] as const;
  }
  if (mode === 'evidence') {
    const columns = 9;
    const rows = Math.ceil(count / columns);
    return [width * (0.18 + (index % columns) / (columns - 1) * 0.64), height * (0.16 + Math.floor(index / columns) / Math.max(1, rows - 1) * 0.68)] as const;
  }
  if (mode === 'memory') {
    const radius = min * (0.08 + t * 0.24);
    return [centerX + Math.cos(angle) * radius, height * (0.15 + t * 0.7)] as const;
  }
  if (mode === 'field') {
    const columns = 12;
    return [width * (0.12 + (index % columns) / (columns - 1) * 0.76), height * (0.18 + Math.floor(index / columns) / Math.max(1, Math.ceil(count / columns) - 1) * 0.64)] as const;
  }
  if (mode === 'lab') {
    const radius = 24 + (index % 28) * 5;
    return [centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius * 0.68] as const;
  }
  if (mode === 'trajectory') {
    const branch = index % 4;
    const bt = Math.floor(index / 4) / Math.max(1, Math.ceil(count / 4) - 1);
    return [width * (0.1 + bt * 0.8), height * (0.5 + (branch - 1.5) * 0.13 * Math.pow(bt, 1.2) + Math.sin(bt * 5 + branch) * 0.025)] as const;
  }
  if (mode === 'governance') {
    const band = index % 5;
    const col = Math.floor(index / 5);
    return [width * (0.16 + (col / Math.max(1, Math.ceil(count / 5) - 1)) * 0.68), height * (0.2 + band * 0.15)] as const;
  }
  if (mode === 'research') {
    const column = index % 3;
    const row = Math.floor(index / 3);
    return [width * (0.24 + column * 0.25) + Math.sin(row) * 14, height * (0.15 + (row % 16) * 0.045)] as const;
  }
  if (mode === 'access') {
    const radius = min * (0.08 + (index % 3) * 0.09);
    return [centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius * 0.82] as const;
  }
  return [width * (0.09 + 0.82 * (((index * 37) % count) / count)), height * (0.1 + 0.8 * (((index * 59) % count) / count))] as const;
}

function colorForMode(mode: FieldMode) {
  if (mode === 'observation' || mode === 'evidence') return [105, 165, 164] as const;
  if (mode === 'studio' || mode === 'lab' || mode === 'trajectory' || mode === 'memory') return [138, 127, 167] as const;
  if (mode === 'friction') return [169, 76, 59] as const;
  return [200, 167, 100] as const;
}

export function SfiLivingField() {
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const route = routeMode(pathname);

  useEffect(() => {
    const currentCanvas = canvasRef.current;
    if (!currentCanvas) return;
    const currentContext = currentCanvas.getContext('2d');
    if (!currentContext) return;
    const surface: HTMLCanvasElement = currentCanvas;
    const paint: CanvasRenderingContext2D = currentContext;

    document.body.dataset.sfiSurfaceMode = route;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const count = reduceMotion ? 38 : pathname === '/' ? 128 : 96;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let pointerX = width / 2;
    let pointerY = height / 2;
    let frame = 0;
    let active = true;
    let activeMode: FieldMode = route;
    let anchors: AnchorPoint[] = [];
    let drawTick = 0;

    const particles: Particle[] = Array.from({ length: count }, (_, index) => ({
      x: width * (((index * 43) % count) / count),
      y: height * (((index * 71) % count) / count),
      vx: 0,
      vy: 0,
      phase: index * 0.73,
      size: 0.65 + (index % 5) * 0.16,
      group: index % 8,
    }));

    function collectAnchors() {
      if (pathname === '/' || pathname === '/root') {
        anchors = [];
        return;
      }
      const candidates = Array.from(document.querySelectorAll<HTMLElement>('[data-sfi-field-anchor], main section[id], main > section, main article'));
      const next: AnchorPoint[] = [];
      const seen = new Set<string>();
      for (const element of candidates) {
        const rect = element.getBoundingClientRect();
        if (rect.width < 90 || rect.height < 46 || rect.bottom < -80 || rect.top > height + 80) continue;
        const key = `${Math.round(rect.left / 24)}:${Math.round(rect.top / 24)}:${Math.round(rect.width / 24)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        next.push({
          x: Math.max(32, Math.min(width - 32, rect.left + rect.width * 0.5)),
          y: Math.max(32, Math.min(height - 32, rect.top + rect.height * 0.5)),
          rx: Math.max(24, Math.min(rect.width * 0.28, 150)),
          ry: Math.max(18, Math.min(rect.height * 0.24, 110)),
        });
        if (next.length >= 12) break;
      }
      anchors = next;
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      surface.width = Math.round(width * dpr);
      surface.height = Math.round(height * dpr);
      surface.style.width = `${width}px`;
      surface.style.height = `${height}px`;
      paint.setTransform(dpr, 0, 0, dpr, 0, 0);
      collectAnchors();
    }

    function pointer(event: PointerEvent) {
      pointerX = event.clientX;
      pointerY = event.clientY;
      document.documentElement.style.setProperty('--sfi-mx', `${pointerX}px`);
      document.documentElement.style.setProperty('--sfi-my', `${pointerY}px`);
    }

    const sceneObserver = pathname === '/' ? new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      activeMode = sceneMode((visible.target as HTMLElement).id);
      surface.parentElement?.setAttribute('data-mode', activeMode);
      document.body.dataset.sfiSurfaceMode = activeMode;
    }, { threshold: [0.22,0.42,0.62] }) : null;
    if (sceneObserver) document.querySelectorAll<HTMLElement>('.is-scene').forEach((scene) => sceneObserver.observe(scene));

    function draw(time: number) {
      if (!active) return;
      paint.clearRect(0, 0, width, height);
      const seconds = time * 0.001;
      drawTick += 1;
      if (drawTick % 42 === 0) collectAnchors();
      const modeColor = colorForMode(activeMode);

      if (anchors.length > 1) {
        paint.lineWidth = 0.7;
        for (let index = 0; index < anchors.length - 1; index += 1) {
          const a = anchors[index];
          const b = anchors[index + 1];
          paint.strokeStyle = `rgba(${modeColor[0]},${modeColor[1]},${modeColor[2]},.11)`;
          paint.setLineDash([3, 8]);
          paint.beginPath();
          paint.moveTo(a.x, a.y);
          paint.quadraticCurveTo((a.x + b.x) * 0.5, Math.min(a.y, b.y) - 28, b.x, b.y);
          paint.stroke();
        }
        paint.setLineDash([]);
      }

      particles.forEach((particle, index) => {
        const fallback = target(activeMode, index, count, width, height);
        const anchor = anchors.length ? anchors[index % anchors.length] : null;
        const localAngle = index * 2.3999632297 + particle.group * 0.17;
        const localRadius = 0.22 + ((index * 13) % 19) / 25;
        const baseX = anchor ? anchor.x + Math.cos(localAngle) * anchor.rx * localRadius : fallback[0];
        const baseY = anchor ? anchor.y + Math.sin(localAngle) * anchor.ry * localRadius : fallback[1];
        const settle = activeMode === 'final' ? 0.012 : anchors.length ? 0.0085 : 0.006;
        const drift = activeMode === 'final' ? 1.2 : anchors.length ? 2.2 : 4;
        let tx = baseX + Math.sin(seconds * 0.34 + particle.phase) * drift;
        let ty = baseY + Math.cos(seconds * 0.29 + particle.phase) * drift;
        const dx = particle.x - pointerX;
        const dy = particle.y - pointerY;
        const distance = Math.hypot(dx, dy) || 1;
        if (!reduceMotion && activeMode !== 'final' && distance < 170) {
          const force = (170 - distance) / 170;
          tx += (dx / distance) * force * 24;
          ty += (dy / distance) * force * 24;
        }
        particle.vx += (tx - particle.x) * (reduceMotion ? 0.025 : settle);
        particle.vy += (ty - particle.y) * (reduceMotion ? 0.025 : settle);
        particle.vx *= reduceMotion ? 0.7 : 0.91;
        particle.vy *= reduceMotion ? 0.7 : 0.91;
        particle.x += particle.vx;
        particle.y += particle.vy;
      });

      const linkLimit = activeMode === 'evidence' ? 76 : activeMode === 'governance' ? 102 : activeMode === 'final' ? 48 : anchors.length ? 92 : 116;
      for (let index = 0; index < particles.length; index += 1) {
        const a = particles[index];
        for (let offset = 1; offset < 9 && index + offset < particles.length; offset += 1) {
          const b = particles[index + offset];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance > linkLimit) continue;
          const alpha = (1 - distance / linkLimit) * (activeMode === 'final' ? 0.15 : anchors.length ? 0.16 : 0.11);
          paint.strokeStyle = `rgba(${modeColor[0]},${modeColor[1]},${modeColor[2]},${alpha})`;
          paint.lineWidth = 0.55;
          paint.beginPath();
          paint.moveTo(a.x, a.y);
          paint.lineTo(b.x, b.y);
          paint.stroke();
        }
      }

      particles.forEach((particle, index) => {
        const hot = index % 17 === 0;
        const normalAlpha = anchors.length ? 0.34 : 0.20;
        paint.fillStyle = hot
          ? 'rgba(240,211,151,.72)'
          : activeMode === 'final'
            ? 'rgba(232,226,213,.32)'
            : `rgba(${modeColor[0]},${modeColor[1]},${modeColor[2]},${normalAlpha})`;
        paint.beginPath();
        paint.arc(particle.x, particle.y, hot ? 1.55 : particle.size, 0, Math.PI * 2);
        paint.fill();
      });

      frame = window.requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', collectAnchors, { passive: true });
    window.addEventListener('pointermove', pointer, { passive: true });
    frame = window.requestAnimationFrame(draw);

    return () => {
      active = false;
      sceneObserver?.disconnect();
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', collectAnchors);
      window.removeEventListener('pointermove', pointer);
      if (document.body.dataset.sfiSurfaceMode === activeMode || document.body.dataset.sfiSurfaceMode === route) delete document.body.dataset.sfiSurfaceMode;
    };
  }, [pathname, route]);

  return (
    <div className="sfi-living-field" data-mode={route} aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="sfi-living-field__orbit" />
      <div className="sfi-living-field__vignette" />
      <div className="sfi-living-field__grain" />
      <div className="sfi-living-field__scan" />
    </div>
  );
}