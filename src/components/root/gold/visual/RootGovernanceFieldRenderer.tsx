'use client';

import { useEffect, useRef } from 'react';
import type { RootGovernanceState, RootGovernanceViewMode } from './rootGoldTypes';

type Props = {
  field: RootGovernanceState['governanceField'];
  mode: RootGovernanceViewMode;
  playing: boolean;
};

function drawTopology(canvas: HTMLCanvasElement, field: Props['field'], mode: RootGovernanceViewMode, playing: boolean, frame = 0) {
  const parent = canvas.parentElement;
  const rect = parent?.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect?.width || canvas.clientWidth || 900));
  const height = Math.max(300, Math.floor(rect?.height || canvas.clientHeight || 460));
  const ratio = window.devicePixelRatio || 1;
  if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const t = frame * 0.016;
  const cx = width / 2;
  const cy = height / 2;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#050608';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(193,132,45,0.11)';
  ctx.lineWidth = 1;
  const gridStep = mode === 'malla' ? 34 : 54;
  for (let x = -gridStep; x < width + gridStep; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + width * 0.12, height);
    ctx.stroke();
  }
  for (let y = 18; y < height; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(cx, cy);
  for (let ring = 1; ring <= 5; ring += 1) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 54 * ring, 22 * ring, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(244,199,106,${0.08 + ring * 0.025})`;
    ctx.stroke();
  }
  for (let i = 0; i < 24; i += 1) {
    const a = (Math.PI * 2 * i) / 24 + t * 0.12;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 260, Math.sin(a) * 115);
    ctx.strokeStyle = 'rgba(201,147,58,0.09)';
    ctx.stroke();
  }
  ctx.restore();

  const domains = new Map(field.domains.map((node) => [node.id, node]));
  field.links.forEach((link) => {
    const from = domains.get(link.from);
    const to = domains.get(link.to);
    if (!from || !to) return;
    const fx = (from.x / 100) * width;
    const fy = (from.y / 100) * height;
    const tx = (to.x / 100) * width;
    const ty = (to.y / 100) * height;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.quadraticCurveTo(cx, cy - 80 * link.strength, tx, ty);
    ctx.strokeStyle = `rgba(244,199,106,${0.18 + link.strength * 0.45})`;
    ctx.lineWidth = mode === 'flujo' ? 1.2 + link.strength * 4 : 1 + link.strength * 2;
    ctx.shadowColor = '#f4c76a';
    ctx.shadowBlur = 6 + link.strength * 14;
    ctx.stroke();
  });
  ctx.shadowBlur = 0;

  field.particles.forEach((particle, index) => {
    const px = (particle.x / 100) * width + Math.sin(t + index) * (playing ? 2.4 : 0);
    const py = (particle.y / 100) * height + Math.cos(t * 0.7 + index) * (playing ? 1.4 : 0);
    ctx.fillStyle = `rgba(226,161,58,${0.04 + particle.intensity * 0.26})`;
    ctx.fillRect(px, py, 1, 1);
  });

  for (let wave = 0; wave < 18; wave += 1) {
    ctx.beginPath();
    for (let x = 0; x <= width; x += 8) {
      const spread = (wave - 9) * 7;
      const y = cy + spread + Math.sin(x * 0.018 + t * (playing ? 1.6 : 0) + wave) * (20 + field.center.intensity * 34);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(244,199,106,${0.045 + Math.max(0, 9 - Math.abs(wave - 9)) * 0.018})`;
    ctx.lineWidth = wave === 9 ? 1.6 : 0.8;
    ctx.stroke();
  }

  const coreGlow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 120);
  coreGlow.addColorStop(0, 'rgba(244,199,106,0.9)');
  coreGlow.addColorStop(0.18, 'rgba(244,199,106,0.28)');
  coreGlow.addColorStop(1, 'rgba(244,199,106,0)');
  ctx.fillStyle = coreGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, 8 + field.center.intensity * 12, 0, Math.PI * 2);
  ctx.fillStyle = '#f4c76a';
  ctx.fill();

  field.domains.forEach((node) => {
    const x = (node.x / 100) * width;
    const y = (node.y / 100) * height;
    ctx.beginPath();
    ctx.arc(x, y, 8 + node.intensity * 18, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(244,199,106,${0.35 + node.intensity * 0.45})`;
    ctx.fillStyle = `rgba(201,147,58,${0.08 + node.intensity * 0.14})`;
    ctx.lineWidth = 1.2;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(216,210,194,0.72)';
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
    ctx.fillText(node.label, x - 78, y - 18);
  });
}

function scriptPayload(props: Props) {
  return JSON.stringify(props).replace(/</g, '\\u003c');
}

function bootstrapScript(props: Props) {
  return `(() => {
const script=document.currentScript; const canvas=script&&script.previousElementSibling;
if(!canvas||canvas.dataset.sfiRootBoot==='1') return; canvas.dataset.sfiRootBoot='1';
const props=${scriptPayload(props)}; let frame=0;
${drawTopology.toString()}
function loop(){ drawTopology(canvas, props.field, props.mode, props.playing, frame++); requestAnimationFrame(loop); }
window.addEventListener('resize', () => drawTopology(canvas, props.field, props.mode, props.playing, frame), { passive:true });
requestAnimationFrame(loop);
})();`;
}

export function RootGovernanceFieldRenderer({ field, mode, playing }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let tick = 0;
    const loop = () => {
      drawTopology(canvas, field, mode, playing, tick);
      tick += 1;
      frame.current = requestAnimationFrame(loop);
    };
    frame.current = requestAnimationFrame(loop);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [field, mode, playing]);

  return (
    <>
      <canvas ref={ref} className="sfi-root-gold__topology-canvas" aria-label="Campo de gobernanza ROOT" />
      <script dangerouslySetInnerHTML={{ __html: bootstrapScript({ field, mode, playing }) }} />
    </>
  );
}
