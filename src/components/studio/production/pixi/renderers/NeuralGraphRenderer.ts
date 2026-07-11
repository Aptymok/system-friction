import { safeValue, type StudioPixiRenderer } from './rendererTypes';

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
  const nodes = state.fieldGraph.nodes.filter((node) => node.status !== 'MISSING' && node.explanation);
  if (!nodes.length) {
    drawLabel({ PIXI, app, state, width, height, time }, 'NO_RENDERABLE_GRAPH_NODES', width / 2 - 104, height / 2 - 8, 0x787184);
    return;
  }
  const count = nodes.length;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.28;

  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + time * 0.00015;
    const rawValue = nodes[i]?.value;
    const value = typeof rawValue === 'number' ? safeValue(rawValue, 0) : nodes[i]?.confidence ?? 0;
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

  g.circle(cx, cy, 28);
  g.fill({ color: 0xff79d9, alpha: 0.72 });
  app.stage.addChild(g);

  nodes.slice(0, 10).forEach((item, index) => {
    const x = index % 2 === 0 ? 18 : width - 180;
    const y = 18 + Math.floor(index / 2) * 32;
    drawLabel({ PIXI, app, state, width, height, time }, `${item.label}\n${item.status}`, x, y, index % 2 === 0 ? 0x45f0ff : 0xff79d9);
  });
};
