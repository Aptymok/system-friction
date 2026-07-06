import { featureValues, safeValue, type StudioPixiRenderer } from './rendererTypes';

const vectorLabels = [
  'HARMONIC / MELODY',
  'DRUMS / ONSET',
  'BASS / LOW-END',
  'VOCAL PRESENCE',
  'ATMOSPHERE',
  'FX / TEXTURE',
  'MASTER CHAIN',
  'MIHM VECTOR',
  'COHERENCE',
  'SYSTEM STRAIN',
];

function drawLabel(input: Parameters<StudioPixiRenderer>[0], text: string, x: number, y: number, fill: number) {
  const label = new input.PIXI.Text({
    text,
    style: {
      fill,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: 7,
      letterSpacing: 1.1,
    },
  });
  label.x = x;
  label.y = y;
  input.app.stage.addChild(label);
}

export const NeuralGraphRenderer: StudioPixiRenderer = ({ PIXI, app, state, width, height, time }) => {
  const g = new PIXI.Graphics();
  const nodes = state.objectFeatures.graph.nodes;
  const values = featureValues(state);
  const count = Math.max(10, nodes.length || values.length || 10);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.28;
  const density = state.activeObject.id ? 1 : 0.34;

  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + time * 0.00015;
    const value = safeValue(nodes[i]?.value ?? values[i % Math.max(1, values.length)], state.activeObject.id ? 0.35 : 0.08);
    const x = cx + Math.cos(angle) * radius * (0.75 + value * 0.45);
    const y = cy + Math.sin(angle) * radius * (0.7 + value * 0.3);
    g.moveTo(cx, cy);
    g.lineTo(x, y);
    g.stroke({ width: (1 + value * 2) * density, color: 0xba5cff, alpha: (0.18 + value * 0.45) * density });
    g.circle(x, y, 4 + value * 10);
    g.fill({ color: i % 3 === 0 ? 0x45f0ff : 0xff79d9, alpha: (0.32 + value * 0.55) * density });
  }

  for (let ring = 0; ring < 5; ring += 1) {
    g.circle(cx, cy, 34 + ring * 28 + Math.sin(time * 0.001 + ring) * 3);
    g.stroke({ width: 1, color: ring % 2 ? 0xff79d9 : 0x45f0ff, alpha: (0.1 + ring * 0.035) * density });
  }

  g.circle(cx, cy, state.activeObject.id ? 28 : 18);
  g.fill({ color: state.activeObject.id ? 0xff79d9 : 0x392044, alpha: state.activeObject.id ? 0.72 : 0.34 });
  app.stage.addChild(g);

  vectorLabels.forEach((item, index) => {
    const left = index % 2 === 0;
    const x = left ? 18 : width - 160;
    const y = 18 + Math.floor(index / 2) * 32;
    const status = state.activeObject.id ? 'NO_TIME_SERIES_AVAILABLE' : 'MISSING';
    drawLabel({ PIXI, app, state, width, height, time }, `${item}\n${status}`, x, y, left ? 0x45f0ff : 0xff79d9);
  });
};
