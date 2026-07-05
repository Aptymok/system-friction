import { featureValues, safeValue, type StudioPixiRenderer } from './rendererTypes';

export const NeuralGraphRenderer: StudioPixiRenderer = ({ PIXI, app, state, width, height, time }) => {
  const g = new PIXI.Graphics();
  const nodes = state.objectFeatures.graph.nodes;
  const values = featureValues(state);
  const count = Math.max(6, nodes.length || values.length || 6);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.28;

  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + time * 0.00015;
    const value = safeValue(nodes[i]?.value ?? values[i % Math.max(1, values.length)], state.activeObject.id ? 0.35 : 0.08);
    const x = cx + Math.cos(angle) * radius * (0.75 + value * 0.45);
    const y = cy + Math.sin(angle) * radius * (0.7 + value * 0.3);
    g.moveTo(cx, cy);
    g.lineTo(x, y);
    g.stroke({ width: 1 + value * 2, color: 0xba5cff, alpha: 0.18 + value * 0.45 });
    g.circle(x, y, 4 + value * 10);
    g.fill({ color: i % 3 === 0 ? 0x45f0ff : 0xff79d9, alpha: 0.32 + value * 0.55 });
  }

  for (let ring = 0; ring < 5; ring += 1) {
    g.circle(cx, cy, 34 + ring * 28 + Math.sin(time * 0.001 + ring) * 3);
    g.stroke({ width: 1, color: ring % 2 ? 0xff79d9 : 0x45f0ff, alpha: 0.1 + ring * 0.035 });
  }

  g.circle(cx, cy, state.activeObject.id ? 28 : 18);
  g.fill({ color: state.activeObject.id ? 0xff79d9 : 0x392044, alpha: state.activeObject.id ? 0.72 : 0.34 });
  app.stage.addChild(g);
};
