'use client';

import { useEffect, useRef } from 'react';
import type { ObservatoryGoldState } from '@/lib/observatory/gold/observatoryGoldState';
import { greatCircleArc, orthographicProject, roughContinents } from './worldMapProjection';

type ProjectionMode = 'map' | 'globe';

type Props = {
  map: ObservatoryGoldState['globalMap'];
  minimumIntensity: number;
  tensionType: string;
  playing: boolean;
  projectionMode?: ProjectionMode;
  region?: string;
};

type ProjectedPoint = { x: number; y: number; visible: boolean; depth: number };

const REGION_BOUNDS: Record<string, { minLat: number; maxLat: number; minLon: number; maxLon: number }> = {
  'america del norte': { minLat: 15, maxLat: 75, minLon: -170, maxLon: -50 },
  'america latina': { minLat: -58, maxLat: 28, minLon: -120, maxLon: -30 },
  europa: { minLat: 35, maxLat: 72, minLon: -25, maxLon: 45 },
  africa: { minLat: -36, maxLat: 38, minLon: -20, maxLon: 55 },
  'medio oriente': { minLat: 12, maxLat: 42, minLon: 25, maxLon: 65 },
  asia: { minLat: -10, maxLat: 75, minLon: 55, maxLon: 180 },
  oceania: { minLat: -50, maxLat: 0, minLon: 105, maxLon: 180 },
};

function drawPath(ctx: CanvasRenderingContext2D, points: ProjectedPoint[]) {
  let started = false;
  for (const point of points) {
    if (!point.visible) {
      started = false;
      continue;
    }
    if (!started) {
      ctx.moveTo(point.x, point.y);
      started = true;
    } else {
      ctx.lineTo(point.x, point.y);
    }
  }
}

function equirectangularProject(input: {
  lat: number;
  lon: number;
  width: number;
  height: number;
  paddingX: number;
  paddingY: number;
}): ProjectedPoint {
  const usableWidth = Math.max(1, input.width - input.paddingX * 2);
  const usableHeight = Math.max(1, input.height - input.paddingY * 2);
  const x = input.paddingX + ((input.lon + 180) / 360) * usableWidth;
  const y = input.paddingY + ((85 - input.lat) / 170) * usableHeight;
  return { x, y, visible: input.lat >= -85 && input.lat <= 85, depth: 1 };
}

function isInRegion(lat: number, lon: number, region = 'todas') {
  const key = region.toLowerCase();
  if (!key || key === 'todas') return true;
  const bounds = REGION_BOUNDS[key];
  if (!bounds) return true;
  return lat >= bounds.minLat && lat <= bounds.maxLat && lon >= bounds.minLon && lon <= bounds.maxLon;
}

function domainMatches(sourceDomain: string, tensionType: string) {
  const selected = tensionType.toLowerCase();
  return selected === 'todas' || sourceDomain.toLowerCase().includes(selected);
}

function filteredNodes(map: ObservatoryGoldState['globalMap'], minimumIntensity: number, tensionType: string, region?: string) {
  return map.nodes.filter((node) => (
    node.intensity >= minimumIntensity
    && domainMatches(node.domain, tensionType)
    && isInRegion(node.lat, node.lon, region)
  ));
}

function filteredFlows(map: ObservatoryGoldState['globalMap'], minimumIntensity: number, tensionType: string, region?: string) {
  return map.flows.filter((flow) => (
    flow.intensity >= minimumIntensity
    && domainMatches(flow.domain, tensionType)
    && (isInRegion(flow.fromLat, flow.fromLon, region) || isInRegion(flow.toLat, flow.toLon, region))
  ));
}

function escapeScriptJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function buildCanvasBootstrapScript(payload: Required<Props>) {
  return `(() => {
const script = document.currentScript;
const canvas = script && script.previousElementSibling;
if (!canvas || canvas.dataset.sfiBoot === '1') return;
canvas.dataset.sfiBoot = '1';
const payload = ${escapeScriptJson(payload)};
const continents = ${escapeScriptJson(roughContinents)};
const regionBounds = ${escapeScriptJson(REGION_BOUNDS)};
let rotation = -18;
const rad = Math.PI / 180;
const domainMatches = (source, selected) => String(selected).toLowerCase() === 'todas' || String(source).toLowerCase().includes(String(selected).toLowerCase());
const inRegion = (lat, lon, region) => {
  const key = String(region || 'todas').toLowerCase();
  if (!key || key === 'todas') return true;
  const bounds = regionBounds[key];
  if (!bounds) return true;
  return lat >= bounds.minLat && lat <= bounds.maxLat && lon >= bounds.minLon && lon <= bounds.maxLon;
};
const eq = (lat, lon, width, height, px, py) => ({ x: px + ((lon + 180) / 360) * Math.max(1, width - px * 2), y: py + ((85 - lat) / 170) * Math.max(1, height - py * 2), visible: lat >= -85 && lat <= 85, depth: 1 });
const ortho = (latDeg, lonDeg, cx, cy, radius) => {
  const lat = latDeg * rad;
  const lon = (lonDeg + rotation) * rad;
  const cosLat = Math.cos(lat);
  const depth = cosLat * Math.cos(lon);
  return { x: cx + radius * cosLat * Math.sin(lon), y: cy - radius * Math.sin(lat), visible: depth >= -0.08, depth };
};
const path = (ctx, points) => {
  let started = false;
  for (const point of points) {
    if (!point.visible) { started = false; continue; }
    if (!started) { ctx.moveTo(point.x, point.y); started = true; } else { ctx.lineTo(point.x, point.y); }
  }
};
const nodes = () => (payload.map.nodes || []).filter((node) => node.intensity >= payload.minimumIntensity && domainMatches(node.domain, payload.tensionType) && inRegion(node.lat, node.lon, payload.region));
const flows = () => (payload.map.flows || []).filter((flow) => flow.intensity >= payload.minimumIntensity && domainMatches(flow.domain, payload.tensionType) && (inRegion(flow.fromLat, flow.fromLon, payload.region) || inRegion(flow.toLat, flow.toLon, payload.region)));
const resize = () => {
  const parent = canvas.parentElement;
  const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width || canvas.clientWidth || 320));
  const height = Math.max(1, Math.floor(rect.height || canvas.clientHeight || 260));
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
};
const legend = (ctx, width, height) => {
  ctx.font = '10px ui-monospace, monospace';
  ctx.fillStyle = 'rgba(216,210,194,0.62)';
  ctx.fillText('INTENSIDAD DE TENSION', 28, height - 48);
  const grad = ctx.createLinearGradient(28, 0, 230, 0);
  grad.addColorStop(0, 'rgba(215,181,109,0.45)');
  grad.addColorStop(0.58, '#f4c76a');
  grad.addColorStop(1, '#d45c42');
  ctx.fillStyle = grad;
  ctx.fillRect(28, height - 32, 202, 5);
  ctx.fillStyle = 'rgba(216,210,194,0.58)';
  ctx.fillText('BAJA', 28, height - 16);
  ctx.fillText('EXTREMA', 184, height - 16);
};
const empty = (ctx, width, height) => {
  ctx.fillStyle = 'rgba(5,6,8,0.62)';
  ctx.fillRect(width * 0.5 - 205, height * 0.5 - 21, 410, 42);
  ctx.strokeStyle = 'rgba(193,132,45,0.32)';
  ctx.strokeRect(width * 0.5 - 205, height * 0.5 - 21, 410, 42);
  ctx.font = '700 11px ui-monospace, monospace';
  ctx.fillStyle = 'rgba(244,199,106,0.72)';
  ctx.textAlign = 'center';
  ctx.fillText('SOURCE_UNAVAILABLE / SIN NODOS WORLDSPECT ACTIVOS', width / 2, height / 2);
  ctx.textAlign = 'left';
};
const drawMap = (ctx, width, height, time) => {
  const px = Math.max(18, width * 0.025);
  const py = Math.max(28, height * 0.07);
  ctx.fillStyle = '#050608';
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(width * .5, height * .42, 10, width * .5, height * .44, Math.max(width, height) * .68);
  glow.addColorStop(0, 'rgba(201,147,58,.16)');
  glow.addColorStop(.6, 'rgba(201,147,58,.04)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  for (let band = 0; band < 20; band++) {
    const y = py + ((height - py * 2) * band) / 19;
    ctx.beginPath();
    for (let i = 0; i <= 180; i++) {
      const x = px + ((width - px * 2) * i) / 180;
      const wave = Math.sin(i * .13 + band * .71 + time * .0007) * (4 + (band % 5));
      if (i === 0) ctx.moveTo(x, y + wave); else ctx.lineTo(x, y + wave);
    }
    ctx.strokeStyle = 'rgba(201,147,58,.09)';
    ctx.lineWidth = band % 5 === 0 ? 1 : .55;
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(193,132,45,.18)';
  ctx.lineWidth = .7;
  for (let lat = -60; lat <= 75; lat += 15) { ctx.beginPath(); path(ctx, Array.from({ length: 145 }, (_, i) => eq(lat, -180 + i * 2.5, width, height, px, py))); ctx.stroke(); }
  for (let lon = -180; lon <= 180; lon += 20) { ctx.beginPath(); path(ctx, Array.from({ length: 87 }, (_, i) => eq(-85 + i * 2, lon, width, height, px, py))); ctx.stroke(); }
  for (let p = 0; p < continents.length; p++) {
    const projected = continents[p].map(([lat, lon]) => eq(lat, lon, width, height, px, py));
    ctx.beginPath(); path(ctx, projected); ctx.closePath();
    ctx.fillStyle = p % 2 === 0 ? 'rgba(24,21,14,.96)' : 'rgba(18,20,16,.96)';
    ctx.strokeStyle = 'rgba(244,199,106,.48)';
    ctx.lineWidth = 1.2;
    ctx.fill(); ctx.stroke();
  }
  for (const flow of flows()) {
    const from = eq(flow.fromLat, flow.fromLon, width, height, px, py);
    const to = eq(flow.toLat, flow.toLon, width, height, px, py);
    const lift = 34 + Math.abs(to.x - from.x) * .08 + flow.intensity * 44;
    ctx.beginPath(); ctx.moveTo(from.x, from.y);
    ctx.bezierCurveTo(from.x + (to.x - from.x) * .28, Math.min(from.y, to.y) - lift, from.x + (to.x - from.x) * .72, Math.min(from.y, to.y) - lift, to.x, to.y);
    ctx.strokeStyle = 'rgba(244,199,106,' + (.18 + flow.intensity * .48) + ')';
    ctx.lineWidth = .7 + flow.intensity * 2.1;
    ctx.shadowColor = flow.intensity > .7 ? 'rgba(212,92,66,.70)' : 'rgba(244,199,106,.42)';
    ctx.shadowBlur = 8 + flow.intensity * 18;
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  const ns = nodes();
  for (const node of ns) {
    const point = eq(node.lat, node.lon, width, height, px, py);
    const danger = node.intensity > .72;
    ctx.beginPath(); ctx.arc(point.x, point.y, 10 + node.intensity * 24, 0, Math.PI * 2);
    ctx.fillStyle = danger ? 'rgba(212,92,66,.13)' : 'rgba(244,199,106,.12)';
    ctx.fill(); ctx.strokeStyle = danger ? 'rgba(212,92,66,.74)' : 'rgba(244,199,106,.70)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(point.x, point.y, 2.4 + node.intensity * 4.5, 0, Math.PI * 2);
    ctx.fillStyle = danger ? '#d45c42' : '#f4c76a'; ctx.fill();
  }
  ctx.strokeStyle = 'rgba(244,199,106,.34)';
  ctx.strokeRect(px, py, width - px * 2, height - py * 2);
  if (!ns.length) empty(ctx, width, height);
  legend(ctx, width, height);
};
const drawGlobe = (ctx, width, height, time) => {
  const cx = width / 2, cy = height / 2, radius = Math.min(width * .46, height * .47);
  if (payload.playing) rotation = (rotation + .035) % 360;
  ctx.fillStyle = '#050608'; ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(cx, cy, radius * .2, cx, cy, radius * 1.1);
  glow.addColorStop(0, 'rgba(201,147,58,.16)'); glow.addColorStop(.75, 'rgba(201,147,58,.035)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = 'rgba(9,10,10,.98)'; ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.strokeStyle = 'rgba(193,132,45,.18)';
  for (let lat = -60; lat <= 60; lat += 15) { ctx.beginPath(); path(ctx, Array.from({ length: 145 }, (_, i) => ortho(lat, -180 + i * 2.5, cx, cy, radius))); ctx.stroke(); }
  for (let lon = -180; lon < 180; lon += 20) { ctx.beginPath(); path(ctx, Array.from({ length: 91 }, (_, i) => ortho(-90 + i * 2, lon, cx, cy, radius))); ctx.stroke(); }
  for (const poly of continents) { ctx.beginPath(); path(ctx, poly.map(([lat, lon]) => ortho(lat, lon, cx, cy, radius))); ctx.closePath(); ctx.fillStyle = 'rgba(22,19,13,.96)'; ctx.strokeStyle = 'rgba(244,199,106,.44)'; ctx.fill(); ctx.stroke(); }
  const ns = nodes();
  for (const node of ns) { const p = ortho(node.lat, node.lon, cx, cy, radius); if (!p.visible) continue; ctx.beginPath(); ctx.arc(p.x, p.y, 8 + node.intensity * 22, 0, Math.PI * 2); ctx.strokeStyle = node.intensity > .72 ? 'rgba(212,92,66,.72)' : 'rgba(244,199,106,.68)'; ctx.fillStyle = 'rgba(244,199,106,.12)'; ctx.fill(); ctx.stroke(); }
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(244,199,106,.48)'; ctx.stroke();
  if (!ns.length) empty(ctx, width, height);
  legend(ctx, width, height);
};
const draw = (time) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const width = canvas.clientWidth || canvas.width;
  const height = canvas.clientHeight || canvas.height;
  if (payload.projectionMode === 'globe') drawGlobe(ctx, width, height, time);
  else drawMap(ctx, width, height, time);
  requestAnimationFrame(draw);
};
resize();
window.addEventListener('resize', resize, { passive: true });
requestAnimationFrame(draw);
})();`;
}

function drawLegend(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.fillStyle = 'rgba(216,210,194,0.62)';
  ctx.fillText('INTENSIDAD DE TENSION', 28, height - 48);
  const legend = ctx.createLinearGradient(28, 0, 230, 0);
  legend.addColorStop(0, 'rgba(215,181,109,0.45)');
  legend.addColorStop(0.58, '#f4c76a');
  legend.addColorStop(1, '#d45c42');
  ctx.fillStyle = legend;
  ctx.fillRect(28, height - 32, 202, 5);
  ctx.fillStyle = 'rgba(216,210,194,0.58)';
  ctx.fillText('BAJA', 28, height - 16);
  ctx.fillText('EXTREMA', 184, height - 16);
}

function drawEmptyState(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(5,6,8,0.62)';
  ctx.fillRect(width * 0.5 - 205, height * 0.5 - 21, 410, 42);
  ctx.strokeStyle = 'rgba(193,132,45,0.32)';
  ctx.strokeRect(width * 0.5 - 205, height * 0.5 - 21, 410, 42);
  ctx.font = '700 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.fillStyle = 'rgba(244,199,106,0.72)';
  ctx.textAlign = 'center';
  ctx.fillText('SOURCE_UNAVAILABLE / SIN NODOS WORLDSPECT ACTIVOS', width / 2, height / 2);
  ctx.restore();
}

function drawCinematicMap(ctx: CanvasRenderingContext2D, input: {
  width: number;
  height: number;
  time: number;
  map: ObservatoryGoldState['globalMap'];
  minimumIntensity: number;
  tensionType: string;
  region?: string;
}) {
  const { width, height, time, map, minimumIntensity, tensionType, region } = input;
  const paddingX = Math.max(18, width * 0.025);
  const paddingY = Math.max(28, height * 0.07);
  const nodes = filteredNodes(map, minimumIntensity, tensionType, region);
  const flows = filteredFlows(map, minimumIntensity, tensionType, region);

  ctx.fillStyle = '#050608';
  ctx.fillRect(0, 0, width, height);

  const field = ctx.createRadialGradient(width * 0.5, height * 0.42, 10, width * 0.5, height * 0.44, Math.max(width, height) * 0.68);
  field.addColorStop(0, 'rgba(201,147,58,0.13)');
  field.addColorStop(0.54, 'rgba(201,147,58,0.035)');
  field.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = field;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let band = 0; band < 18; band += 1) {
    const y = paddingY + ((height - paddingY * 2) * band) / 17;
    ctx.beginPath();
    for (let i = 0; i <= 160; i += 1) {
      const x = paddingX + ((width - paddingX * 2) * i) / 160;
      const wave = Math.sin(i * 0.13 + band * 0.71 + time * 0.0007) * (4 + (band % 5));
      if (i === 0) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.strokeStyle = `rgba(201,147,58,${0.045 + (band % 4) * 0.012})`;
    ctx.lineWidth = band % 5 === 0 ? 0.9 : 0.45;
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(193,132,45,0.18)';
  ctx.lineWidth = 0.7;
  for (let lat = -60; lat <= 75; lat += 15) {
    ctx.beginPath();
    drawPath(ctx, Array.from({ length: 145 }, (_, index) => equirectangularProject({
      lat,
      lon: -180 + index * 2.5,
      width,
      height,
      paddingX,
      paddingY,
    })));
    ctx.stroke();
  }
  for (let lon = -180; lon <= 180; lon += 20) {
    ctx.beginPath();
    drawPath(ctx, Array.from({ length: 87 }, (_, index) => equirectangularProject({
      lat: -85 + index * 2,
      lon,
      width,
      height,
      paddingX,
      paddingY,
    })));
    ctx.stroke();
  }

  roughContinents.forEach((poly, polyIndex) => {
    const projected = poly.map(([lat, lon]) => equirectangularProject({ lat, lon, width, height, paddingX, paddingY }));
    ctx.beginPath();
    drawPath(ctx, projected);
    ctx.closePath();
    ctx.fillStyle = polyIndex % 2 === 0 ? 'rgba(24,21,14,0.96)' : 'rgba(18,20,16,0.96)';
    ctx.strokeStyle = 'rgba(244,199,106,0.48)';
    ctx.lineWidth = 1.2;
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(201,147,58,0.18)';
    ctx.lineWidth = 4.5;
    ctx.stroke();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(244,199,106,0.16)';
    for (let i = 0; i < 180; i += 1) {
      const p = projected[i % projected.length];
      const q = projected[(i * 7 + 3) % projected.length];
      const phase = (i * 0.61 + polyIndex * 1.7) % 1;
      const x = p.x * phase + q.x * (1 - phase) + Math.sin(i * 13.1) * 16;
      const y = p.y * phase + q.y * (1 - phase) + Math.cos(i * 5.7) * 9;
      const alpha = 0.045 + ((i % 9) / 9) * 0.12;
      ctx.fillStyle = `rgba(244,199,106,${alpha})`;
      ctx.fillRect(x, y, i % 11 === 0 ? 1.8 : 1.1, 1.1);
    }
    ctx.restore();
  });

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 420; i += 1) {
    const lon = -178 + ((i * 71) % 356);
    const lat = -62 + ((i * 37) % 126);
    const point = equirectangularProject({ lat, lon, width, height, paddingX, paddingY });
    const pulse = 0.45 + Math.sin(time * 0.0014 + i * 0.49) * 0.35;
    ctx.fillStyle = `rgba(226,161,58,${0.035 + pulse * 0.055})`;
    ctx.fillRect(point.x, point.y, 0.9, 0.9);
  }

  flows.forEach((flow) => {
    const from = equirectangularProject({ lat: flow.fromLat, lon: flow.fromLon, width, height, paddingX, paddingY });
    const to = equirectangularProject({ lat: flow.toLat, lon: flow.toLon, width, height, paddingX, paddingY });
    const lift = 34 + Math.abs(to.x - from.x) * 0.08 + flow.intensity * 44;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.bezierCurveTo(from.x + (to.x - from.x) * 0.28, Math.min(from.y, to.y) - lift, from.x + (to.x - from.x) * 0.72, Math.min(from.y, to.y) - lift, to.x, to.y);
    ctx.strokeStyle = `rgba(244,199,106,${0.18 + flow.intensity * 0.48})`;
    ctx.lineWidth = 0.7 + flow.intensity * 2.1;
    ctx.shadowColor = flow.intensity > 0.7 ? 'rgba(212,92,66,0.70)' : 'rgba(244,199,106,0.42)';
    ctx.shadowBlur = 8 + flow.intensity * 18;
    ctx.stroke();
  });
  ctx.restore();

  ctx.shadowBlur = 0;
  nodes.forEach((node) => {
    const point = equirectangularProject({ lat: node.lat, lon: node.lon, width, height, paddingX, paddingY });
    const danger = node.intensity > 0.72;
    const pulse = 1 + Math.sin(time * 0.002 + node.lon) * 0.08;
    ctx.beginPath();
    ctx.arc(point.x, point.y, (10 + node.intensity * 24) * pulse, 0, Math.PI * 2);
    ctx.fillStyle = danger ? 'rgba(212,92,66,0.13)' : 'rgba(244,199,106,0.12)';
    ctx.fill();
    ctx.strokeStyle = danger ? 'rgba(212,92,66,0.74)' : 'rgba(244,199,106,0.70)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2.4 + node.intensity * 4.5, 0, Math.PI * 2);
    ctx.fillStyle = danger ? '#d45c42' : '#f4c76a';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  ctx.strokeStyle = 'rgba(244,199,106,0.34)';
  ctx.lineWidth = 1;
  ctx.strokeRect(paddingX, paddingY, width - paddingX * 2, height - paddingY * 2);

  if (!nodes.length) drawEmptyState(ctx, width, height);
  drawLegend(ctx, width, height);
}

function drawGlobe(ctx: CanvasRenderingContext2D, input: {
  width: number;
  height: number;
  time: number;
  rotation: number;
  map: ObservatoryGoldState['globalMap'];
  minimumIntensity: number;
  tensionType: string;
  region?: string;
}) {
  const { width, height, time, rotation, map, minimumIntensity, tensionType, region } = input;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width * 0.46, height * 0.47);
  const nodes = filteredNodes(map, minimumIntensity, tensionType, region);
  const flows = filteredFlows(map, minimumIntensity, tensionType, region);

  ctx.fillStyle = '#050608';
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, Math.max(radius * 1.08, 1));
  glow.addColorStop(0, 'rgba(201,147,58,0.14)');
  glow.addColorStop(0.75, 'rgba(201,147,58,0.03)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  const body = ctx.createRadialGradient(cx - radius * 0.24, cy - radius * 0.22, radius * 0.05, cx, cy, Math.max(radius, 1));
  body.addColorStop(0, 'rgba(22,18,12,0.98)');
  body.addColorStop(1, 'rgba(3,5,7,0.98)');
  ctx.fillStyle = body;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

  ctx.strokeStyle = 'rgba(193,132,45,0.13)';
  ctx.lineWidth = 0.8;
  for (let lat = -60; lat <= 60; lat += 15) {
    ctx.beginPath();
    drawPath(ctx, Array.from({ length: 145 }, (_, i) => orthographicProject({ lat, lon: -180 + i * 2.5, rotation, cx, cy, radius })));
    ctx.stroke();
  }
  for (let lon = -180; lon < 180; lon += 20) {
    ctx.beginPath();
    drawPath(ctx, Array.from({ length: 91 }, (_, i) => orthographicProject({ lat: -90 + i * 2, lon, rotation, cx, cy, radius })));
    ctx.stroke();
  }

  roughContinents.forEach((poly) => {
    ctx.beginPath();
    drawPath(ctx, poly.map(([lat, lon]) => orthographicProject({ lat, lon, rotation, cx, cy, radius })));
    ctx.closePath();
    ctx.fillStyle = 'rgba(17,16,13,0.95)';
    ctx.strokeStyle = 'rgba(201,147,58,0.30)';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
  });

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 700; i += 1) {
    const lat = -58 + ((i * 37) % 116);
    const lon = -178 + ((i * 71) % 356);
    const point = orthographicProject({ lat, lon, rotation, cx, cy, radius });
    if (!point.visible || point.depth < 0.03) continue;
    const alpha = (0.04 + point.depth * 0.12) * (0.7 + Math.sin(time * 0.001 + i * 0.37) * 0.3);
    ctx.fillStyle = `rgba(226,161,58,${alpha})`;
    ctx.fillRect(point.x, point.y, 0.8, 0.8);
  }

  flows.forEach((flow) => {
    const points = greatCircleArc({ ...flow, rotation, cx, cy, radius });
    ctx.beginPath();
    drawPath(ctx, points);
    ctx.strokeStyle = `rgba(244,199,106,${0.16 + flow.intensity * 0.44})`;
    ctx.lineWidth = 0.8 + flow.intensity * 2.2;
    ctx.shadowColor = flow.intensity > 0.7 ? 'rgba(212,92,66,0.65)' : 'rgba(244,199,106,0.36)';
    ctx.shadowBlur = 8 + flow.intensity * 16;
    ctx.stroke();
  });
  ctx.restore();

  ctx.shadowBlur = 0;
  nodes.forEach((node) => {
    const point = orthographicProject({ lat: node.lat, lon: node.lon, rotation, cx, cy, radius });
    if (!point.visible) return;
    const danger = node.intensity > 0.72;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 7 + node.intensity * 22, 0, Math.PI * 2);
    ctx.fillStyle = danger ? 'rgba(212,92,66,0.14)' : 'rgba(244,199,106,0.12)';
    ctx.fill();
    ctx.strokeStyle = danger ? 'rgba(212,92,66,0.72)' : 'rgba(244,199,106,0.68)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2.2 + node.intensity * 4.2, 0, Math.PI * 2);
    ctx.fillStyle = danger ? '#d45c42' : '#f4c76a';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(244,199,106,0.45)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.025, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(193,132,45,0.18)';
  ctx.stroke();

  if (!nodes.length) drawEmptyState(ctx, width, height);
  drawLegend(ctx, width, height);
}

function svgMapPoint(lat: number, lon: number) {
  return {
    x: ((lon + 180) / 360) * 1000,
    y: ((85 - lat) / 170) * 520,
  };
}

function svgGlobePoint(lat: number, lon: number) {
  const point = orthographicProject({ lat, lon, rotation: -18, cx: 500, cy: 260, radius: 225 });
  return point;
}

function SvgFallback({
  map,
  minimumIntensity,
  tensionType,
  region,
  projectionMode,
}: {
  map: ObservatoryGoldState['globalMap'];
  minimumIntensity: number;
  tensionType: string;
  region: string;
  projectionMode: ProjectionMode;
}) {
  const nodes = filteredNodes(map, minimumIntensity, tensionType, region);
  const flows = filteredFlows(map, minimumIntensity, tensionType, region);
  const isGlobe = projectionMode === 'globe';

  return (
    <svg className="sfi-observatory-gold__world-fallback" viewBox="0 0 1000 520" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <radialGradient id="sfiObsGoldGlow" cx="50%" cy="42%" r="68%">
          <stop offset="0%" stopColor="#c9933a" stopOpacity="0.16" />
          <stop offset="58%" stopColor="#c9933a" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sfiObsLegend" x1="0%" x2="100%">
          <stop offset="0%" stopColor="#d7b56d" stopOpacity="0.42" />
          <stop offset="58%" stopColor="#f4c76a" />
          <stop offset="100%" stopColor="#d45c42" />
        </linearGradient>
      </defs>
      <rect width="1000" height="520" fill="#050608" />
      <rect width="1000" height="520" fill="url(#sfiObsGoldGlow)" />
      {isGlobe ? <circle cx="500" cy="260" r="225" className="sfi-observatory-gold__svg-globe-body" /> : null}
      {Array.from({ length: 18 }, (_, band) => {
        const y = 36 + (448 * band) / 17;
        const d = Array.from({ length: 80 }, (_, index) => {
          const x = 30 + (940 * index) / 79;
          const wave = Math.sin(index * 0.34 + band * 0.71) * (5 + (band % 4));
          return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${(y + wave).toFixed(1)}`;
        }).join(' ');
        return <path key={`band-${band}`} d={d} className="sfi-observatory-gold__svg-topography" />;
      })}
      {isGlobe
        ? [-60, -45, -30, -15, 0, 15, 30, 45, 60].map((lat) => {
            const d = Array.from({ length: 96 }, (_, index) => svgGlobePoint(lat, -180 + index * 3.75))
              .filter((point) => point.visible)
              .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
              .join(' ');
            return <path key={`lat-${lat}`} d={d} className="sfi-observatory-gold__svg-gridline" />;
          })
        : [-60, -45, -30, -15, 0, 15, 30, 45, 60, 75].map((lat) => {
            const start = svgMapPoint(lat, -180);
            const end = svgMapPoint(lat, 180);
            return <line key={`lat-${lat}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} className="sfi-observatory-gold__svg-gridline" />;
          })}
      {isGlobe
        ? Array.from({ length: 18 }, (_, index) => -170 + index * 20).map((lon) => {
            const d = Array.from({ length: 90 }, (_, index) => svgGlobePoint(-85 + index * 1.9, lon))
              .filter((point) => point.visible)
              .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
              .join(' ');
            return <path key={`lon-${lon}`} d={d} className="sfi-observatory-gold__svg-gridline" />;
          })
        : Array.from({ length: 19 }, (_, index) => -180 + index * 20).map((lon) => {
            const start = svgMapPoint(-85, lon);
            const end = svgMapPoint(85, lon);
            return <line key={`lon-${lon}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} className="sfi-observatory-gold__svg-gridline" />;
          })}
      {roughContinents.map((poly, index) => {
        const points = poly
          .map(([lat, lon]) => isGlobe ? svgGlobePoint(lat, lon) : svgMapPoint(lat, lon))
          .filter((point) => !isGlobe || ('visible' in point && point.visible))
          .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
          .join(' ');
        return <polygon key={`land-${index}`} points={points} className="sfi-observatory-gold__svg-land" />;
      })}
      {flows.map((flow, index) => {
        const from = isGlobe ? svgGlobePoint(flow.fromLat, flow.fromLon) : svgMapPoint(flow.fromLat, flow.fromLon);
        const to = isGlobe ? svgGlobePoint(flow.toLat, flow.toLon) : svgMapPoint(flow.toLat, flow.toLon);
        if (isGlobe && (!('visible' in from && from.visible) || !('visible' in to && to.visible))) return null;
        const lift = 44 + Math.abs(to.x - from.x) * 0.08 + flow.intensity * 58;
        const d = `M${from.x.toFixed(1)} ${from.y.toFixed(1)} C${(from.x + (to.x - from.x) * 0.28).toFixed(1)} ${(Math.min(from.y, to.y) - lift).toFixed(1)} ${(from.x + (to.x - from.x) * 0.72).toFixed(1)} ${(Math.min(from.y, to.y) - lift).toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
        return <path key={`flow-${index}`} d={d} className="sfi-observatory-gold__svg-flow" style={{ opacity: 0.18 + flow.intensity * 0.52, strokeWidth: 1 + flow.intensity * 3 }} />;
      })}
      {nodes.map((node) => {
        const point = isGlobe ? svgGlobePoint(node.lat, node.lon) : svgMapPoint(node.lat, node.lon);
        if (isGlobe && !('visible' in point && point.visible)) return null;
        return (
          <g key={node.id} className={node.intensity > 0.72 ? 'is-danger' : undefined}>
            <circle cx={point.x} cy={point.y} r={10 + node.intensity * 24} className="sfi-observatory-gold__svg-node-halo" />
            <circle cx={point.x} cy={point.y} r={2.8 + node.intensity * 4.5} className="sfi-observatory-gold__svg-node-core" />
          </g>
        );
      })}
      {!nodes.length ? (
        <g className="sfi-observatory-gold__svg-empty">
          <rect x="306" y="238" width="388" height="44" />
          <text x="500" y="265">SOURCE_UNAVAILABLE / SIN NODOS WORLDSPECT ACTIVOS</text>
        </g>
      ) : null}
      <rect x="30" y="36" width="940" height="448" className="sfi-observatory-gold__svg-frame" />
      <text x="30" y="462" className="sfi-observatory-gold__svg-label">INTENSIDAD DE TENSION</text>
      <rect x="30" y="476" width="202" height="5" fill="url(#sfiObsLegend)" />
      <text x="30" y="500" className="sfi-observatory-gold__svg-label">BAJA</text>
      <text x="186" y="500" className="sfi-observatory-gold__svg-label">EXTREMA</text>
    </svg>
  );
}

export function WorldTensionMapRenderer({
  map,
  minimumIntensity,
  tensionType,
  playing,
  projectionMode = 'map',
  region = 'todas',
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const rotationRef = useRef(-18);

  useEffect(() => {
    const canvas = ref.current;
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

    const draw = (time: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (playing) rotationRef.current = (rotationRef.current + 0.035) % 360;

      if (projectionMode === 'globe') {
        drawGlobe(ctx, { width, height, time, rotation: rotationRef.current, map, minimumIntensity, tensionType, region });
      } else {
        drawCinematicMap(ctx, { width, height, time, map, minimumIntensity, tensionType, region });
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    frameRef.current = requestAnimationFrame(draw);

    return () => {
      observer.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [map, minimumIntensity, playing, projectionMode, region, tensionType]);

  const payload: Required<Props> = { map, minimumIntensity, tensionType, playing, projectionMode, region };

  return (
    <div className="sfi-observatory-gold__world-renderer">
      <SvgFallback map={map} minimumIntensity={minimumIntensity} tensionType={tensionType} region={region} projectionMode={projectionMode} />
      <canvas ref={ref} className="sfi-observatory-gold__world-canvas" aria-label="Mapa global de tensiones WorldSpect" />
      <script dangerouslySetInnerHTML={{ __html: buildCanvasBootstrapScript(payload) }} />
    </div>
  );
}
