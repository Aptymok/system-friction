import { safeValue, type StudioPixiRenderer } from './rendererTypes';

const PINK = 0xff79d9;
const PURPLE = 0xba5cff;
const CYAN = 0x45f0ff;
const ORANGE = 0xff9f43;
const GREEN = 0x7cffb2;
const RED = 0xff5f7a;
const MUTED = 0x9584a7;

function readinessScore(value: string | null | undefined) {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized.includes('ready') || normalized.includes('complete') || normalized.includes('valid')) return 1;
  if (normalized.includes('partial') || normalized.includes('degraded') || normalized.includes('running')) return 0.55;
  if (normalized.includes('queued') || normalized.includes('uploaded')) return 0.35;
  return 0;
}

function ringColor(index: number) {
  return [PINK, CYAN, PURPLE, ORANGE, GREEN][index % 5];
}

function drawText(PIXI: Parameters<StudioPixiRenderer>[0]['PIXI'], app: Parameters<StudioPixiRenderer>[0]['app'], text: string, x: number, y: number, fill = 0xf2e9ff, size = 11) {
  const label = new PIXI.Text({
    text,
    style: {
      fill,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: size,
      letterSpacing: 2,
    },
  });
  label.x = x;
  label.y = y;
  app.stage.addChild(label);
}

function drawDiagnostic(input: Parameters<StudioPixiRenderer>[0], reason: string) {
  const { PIXI, app, width, height, time } = input;
  const g = new PIXI.Graphics();
  const gridColor = 0x392044;

  for (let x = 0; x <= width; x += 32) {
    g.moveTo(x, 0);
    g.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += 32) {
    g.moveTo(0, y);
    g.lineTo(width, y);
  }
  g.stroke({ width: 1, color: gridColor, alpha: 0.22 });

  const cx = width * 0.5;
  const cy = height * 0.48;
  const pulse = 0.5 + Math.sin(time * 0.003) * 0.5;
  g.roundRect(cx - 210, cy - 92, 420, 184, 18);
  g.fill({ color: 0x100716, alpha: 0.9 });
  g.stroke({ width: 1.5, color: RED, alpha: 0.45 + pulse * 0.24 });
  g.circle(cx, cy - 38, 26 + pulse * 4);
  g.fill({ color: RED, alpha: 0.3 });
  g.stroke({ width: 2, color: ORANGE, alpha: 0.55 });
  app.stage.addChild(g);

  drawText(PIXI, app, 'STATUS: BLOCKED / SIN OBJETO', cx - 170, cy - 8, 0xff5f7a, 12);
  drawText(PIXI, app, 'SOURCE: studio_objects + studio_object_features', cx - 170, cy + 22, 0x9584a7, 9);
  drawText(PIXI, app, `REASON: ${reason}`, cx - 170, cy + 46, 0x9584a7, 9);
  drawText(PIXI, app, 'RESOLUTION: upload object, apply studio_* migration, run analyze', cx - 170, cy + 70, 0x45f0ff, 9);
}

export const StudioOverviewFieldRenderer: StudioPixiRenderer = (input) => {
  const { PIXI, app, state, width, height, time } = input;
  const g = new PIXI.Graphics();

  if (!state.activeObject.id) {
    drawDiagnostic(input, state.degradedSources[0] ?? 'no persisted active object found');
    return;
  }

  const cx = width * 0.5;
  const cy = height * 0.52;
  const min = Math.min(width, height);
  const objectReady = readinessScore(state.activeObject.readiness);
  const featureReady = readinessScore(state.objectFeatures.readiness);
  const cultural = safeValue(state.culturalLens?.confidence, 0);
  const mihm = safeValue(state.mihmReport.score, 0);
  const archive = readinessScore(state.archive.integrity);
  const exportReady = readinessScore(state.exports.signoffReadiness);

  const categories = [
    { id: 'OBJECT', value: objectReady, color: PINK, angle: -Math.PI / 2, count: state.objectFeatures.metrics.length || 1 },
    { id: 'FEATURES', value: featureReady, color: CYAN, angle: 0, count: state.objectFeatures.layers.length || 1 },
    { id: 'CULTURAL', value: cultural, color: PURPLE, angle: Math.PI / 2, count: state.culturalLens?.domainValues.length || 1 },
    { id: 'MIHM', value: mihm, color: ORANGE, angle: Math.PI, count: state.mihmReport.thresholdsTriggered?.length || 1 },
    { id: 'ARCHIVE', value: Math.max(archive, exportReady), color: GREEN, angle: Math.PI * 1.35, count: state.archive.events.length || 1 },
  ];

  // technical grid
  for (let x = 0; x <= width; x += 40) {
    g.moveTo(x, 0);
    g.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += 40) {
    g.moveTo(0, y);
    g.lineTo(width, y);
  }
  g.stroke({ width: 1, color: 0x2c1738, alpha: 0.18 });

  // concentric instrument rings
  [0.16, 0.26, 0.36].forEach((factor, index) => {
    g.circle(cx, cy, min * factor + Math.sin(time * 0.001 + index) * 2);
    g.stroke({ width: 1, color: index % 2 ? CYAN : PURPLE, alpha: 0.08 - index * 0.012 });
  });

  // deterministic particles tied to actual available metrics count
  const particleCount = Math.min(140, 54 + state.objectFeatures.metrics.length * 8 + state.objectFeatures.layers.length * 6);
  for (let i = 0; i < particleCount; i += 1) {
    const source = categories[i % categories.length];
    const angle = i * 2.39996 + time * 0.00012 * (0.4 + source.value);
    const radius = min * (0.12 + ((i % 34) / 34) * 0.34) * (0.72 + source.value * 0.32);
    const x = cx + Math.cos(angle) * radius * 1.28;
    const y = cy + Math.sin(angle) * radius * 0.82;
    g.circle(x, y, 0.9 + source.value * 2.8);
    g.fill({ color: source.color, alpha: 0.06 + source.value * 0.22 });
  }

  // category nodes and links
  categories.forEach((category, categoryIndex) => {
    const ring = min * (0.21 + categoryIndex * 0.028);
    const x = cx + Math.cos(category.angle + Math.sin(time * 0.0006) * 0.05) * ring * 1.25;
    const y = cy + Math.sin(category.angle + Math.cos(time * 0.0005) * 0.05) * ring * 0.82;
    const thickness = 1.2 + category.value * 3.2;
    const alpha = 0.16 + category.value * 0.42;

    g.moveTo(cx, cy);
    g.quadraticCurveTo((cx + x) / 2, (cy + y) / 2 - 22, x, y);
    g.stroke({ width: thickness, color: category.color, alpha });

    const halo = 15 + category.value * 30;
    g.circle(x, y, halo);
    g.fill({ color: category.color, alpha: 0.055 + category.value * 0.08 });
    g.circle(x, y, 7 + category.value * 12);
    g.fill({ color: category.color, alpha: 0.38 + category.value * 0.42 });

    const subCount = Math.min(8, Math.max(1, category.count));
    for (let i = 0; i < subCount; i += 1) {
      const subAngle = (i / subCount) * Math.PI * 2 + time * 0.00022 + categoryIndex;
      const sx = x + Math.cos(subAngle) * (24 + category.value * 18);
      const sy = y + Math.sin(subAngle) * (18 + category.value * 12);
      g.moveTo(x, y);
      g.lineTo(sx, sy);
      g.stroke({ width: 0.8, color: category.color, alpha: 0.08 + category.value * 0.18 });
      g.circle(sx, sy, 2 + category.value * 3);
      g.fill({ color: ringColor(categoryIndex + i), alpha: 0.26 + category.value * 0.42 });
    }
  });

  // object core
  const coreRadius = 28 + objectReady * 18 + Math.sin(time * 0.002) * 2;
  g.circle(cx, cy, coreRadius + 22);
  g.fill({ color: PINK, alpha: 0.08 + objectReady * 0.08 });
  g.circle(cx, cy, coreRadius);
  g.fill({ color: PINK, alpha: 0.44 + objectReady * 0.32 });
  g.circle(cx, cy, coreRadius * 0.52);
  g.fill({ color: CYAN, alpha: 0.18 + featureReady * 0.28 });

  // lower diagnostic bars
  const bars = [objectReady, featureReady, cultural, mihm, archive, exportReady];
  const labels = ['OBJECT', 'FEATURES', 'CULTURAL', 'MIHM', 'ARCHIVE', 'EXPORT'];
  const barWidth = Math.min(120, (width - 120) / bars.length - 10);
  const startX = (width - (barWidth + 10) * bars.length) / 2;
  bars.forEach((value, index) => {
    const x = startX + index * (barWidth + 10);
    const y = height - 52;
    g.roundRect(x, y, barWidth, 6, 3);
    g.fill({ color: 0x20102a, alpha: 0.9 });
    g.roundRect(x, y, barWidth * value, 6, 3);
    g.fill({ color: ringColor(index), alpha: 0.7 });
  });

  app.stage.addChild(g);
  drawText(PIXI, app, 'STUDIO OBJECT FIELD', 24, 22, PINK, 11);
  drawText(PIXI, app, `${state.activeObject.title.toUpperCase()} / ${state.activeObject.type.toUpperCase()} / ${state.activeObject.readiness.toUpperCase()}`, 24, 44, MUTED, 9);
  labels.forEach((label, index) => {
    const x = startX + index * (barWidth + 10);
    drawText(PIXI, app, label, x, height - 38, MUTED, 7);
  });
};
