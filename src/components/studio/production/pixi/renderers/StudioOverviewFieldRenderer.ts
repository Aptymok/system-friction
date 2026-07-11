import { safeValue, type StudioPixiRenderer } from './rendererTypes';

const COLORS = [0xff79d9, 0x45f0ff, 0xba5cff, 0xff9f43, 0x7cffb2, 0xff5f7a];

function readinessScore(value: string | null | undefined) {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized.includes('ready') || normalized.includes('complete') || normalized.includes('valid')) return 1;
  if (normalized.includes('partial') || normalized.includes('degraded') || normalized.includes('running')) return 0.55;
  if (normalized.includes('queued') || normalized.includes('uploaded')) return 0.35;
  return 0;
}

function drawText(PIXI: Parameters<StudioPixiRenderer>[0]['PIXI'], app: Parameters<StudioPixiRenderer>[0]['app'], text: string, x: number, y: number, fill = 0xf2e9ff, size = 10) {
  const label = new PIXI.Text({
    text,
    style: { fill, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: size, letterSpacing: 1.8 },
  });
  label.x = x;
  label.y = y;
  app.stage.addChild(label);
}

function drawMissingOverlay(input: Parameters<StudioPixiRenderer>[0], reason: string) {
  const { PIXI, app, width, height, time } = input;
  const g = new PIXI.Graphics();
  const cx = width * 0.5;
  const cy = height * 0.5;
  const pulse = 0.5 + Math.sin(time * 0.003) * 0.5;

  g.roundRect(cx - 214, cy - 72, 428, 144, 14);
  g.fill({ color: 0x100716, alpha: 0.82 });
  g.stroke({ width: 1.5, color: 0xff5f7a, alpha: 0.38 + pulse * 0.18 });
  g.circle(cx, cy - 30, 20 + pulse * 3);
  g.fill({ color: 0xff5f7a, alpha: 0.18 });
  g.stroke({ width: 1, color: 0xff9f43, alpha: 0.45 });
  app.stage.addChild(g);

  drawText(PIXI, app, 'MISSING_OBJECT / SIN OBJETO PERSISTIDO', cx - 170, cy - 4, 0xff5f7a, 11);
  drawText(PIXI, app, 'FIELD MODE: LOW_DENSITY_NEURAL_AUDIO_GRAPH', cx - 170, cy + 22, 0x9584a7, 8);
  drawText(PIXI, app, `SOURCE: ${reason}`, cx - 170, cy + 42, 0x9584a7, 8);
  drawText(PIXI, app, 'RESOLUTION: upload object + run analysis', cx - 170, cy + 62, 0x45f0ff, 8);
}

export const StudioOverviewFieldRenderer: StudioPixiRenderer = (input) => {
  const { PIXI, app, state, width, height, time } = input;
  const g = new PIXI.Graphics();
  const hasObject = Boolean(state.activeObject.id);
  const nodes = state.fieldGraph.nodes.filter((node) => node.status !== 'MISSING' && node.explanation);
  const density = hasObject ? 1 : 0.26;
  const cx = width * 0.5;
  const cy = height * 0.52;
  const min = Math.min(width, height);
  const values = [
    readinessScore(state.activeObject.readiness),
    readinessScore(state.objectFeatures.readiness),
    safeValue(state.culturalLens?.confidence, 0),
    safeValue(state.mihmReport.score, 0),
    readinessScore(state.archive.integrity),
    readinessScore(state.exports.signoffReadiness),
  ];
  const labels = ['OBJECT', 'FEATURES', 'CULTURAL', 'MIHM', 'ARCHIVE', 'EXPORT'];

  for (let x = 0; x <= width; x += 40) {
    g.moveTo(x, 0);
    g.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += 40) {
    g.moveTo(0, y);
    g.lineTo(width, y);
  }
  g.stroke({ width: 1, color: 0x2c1738, alpha: 0.18 });
  if (!nodes.length) {
    app.stage.addChild(g);
    drawMissingOverlay(input, state.degradedSources[0] ?? 'No explainable Studio nodes are available');
    return;
  }

  [0.16, 0.26, 0.36].forEach((factor, index) => {
    g.circle(cx, cy, min * factor + Math.sin(time * 0.001 + index) * 2);
    g.stroke({ width: 1, color: index % 2 ? 0x45f0ff : 0xba5cff, alpha: (0.07 - index * 0.01) * density });
  });

  const particleCount = Math.min(140, 32 + nodes.length * 8);
  for (let i = 0; i < particleCount; i += 1) {
    const sourceNode = nodes[i % nodes.length];
    const value = typeof sourceNode.value === 'number' ? safeValue(sourceNode.value, sourceNode.confidence) : sourceNode.confidence;
    const angle = i * 2.39996 + time * 0.00012 * (0.4 + value);
    const radius = min * (0.12 + ((i % 34) / 34) * 0.34) * (0.72 + value * 0.32);
    const x = cx + Math.cos(angle) * radius * 1.28;
    const y = cy + Math.sin(angle) * radius * 0.82;
    g.circle(x, y, 0.9 + value * 2.8);
    g.fill({ color: COLORS[i % COLORS.length], alpha: (0.06 + value * 0.22) * density });
  }

  values.forEach((value, index) => {
    const angle = (index / values.length) * Math.PI * 2 - Math.PI / 2;
    const color = COLORS[index % COLORS.length];
    const radius = min * (0.22 + index * 0.018);
    const x = cx + Math.cos(angle) * radius * 1.25;
    const y = cy + Math.sin(angle) * radius * 0.82;
    g.moveTo(cx, cy);
    g.quadraticCurveTo((cx + x) / 2, (cy + y) / 2 - 22, x, y);
    g.stroke({ width: 1 + value * 3, color, alpha: (0.14 + value * 0.34) * density });
    g.circle(x, y, 7 + value * 12);
    g.fill({ color, alpha: (0.22 + value * 0.38) * density });
  });

  g.circle(cx, cy, hasObject ? 32 : 22);
  g.fill({ color: hasObject ? 0xff79d9 : 0x392044, alpha: hasObject ? 0.62 : 0.32 });
  app.stage.addChild(g);

  drawText(PIXI, app, 'STUDIO NEURAL AUDIO FIELD', 24, 22, hasObject ? 0xff79d9 : 0xff5f7a, 10);
  drawText(PIXI, app, `${state.activeObject.title.toUpperCase()} / ${state.activeObject.type.toUpperCase()} / ${state.activeObject.readiness.toUpperCase()}`, 24, 42, 0x9584a7, 8);
  labels.forEach((label, index) => drawText(PIXI, app, label, 24 + index * 82, height - 32, 0x9584a7, 7));

  if (!hasObject) drawMissingOverlay(input, state.degradedSources[0] ?? 'studio_objects has no active object');
};
