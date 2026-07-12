import { safeValue, type StudioPixiRenderer } from './rendererTypes';

export const TimelineDensityRenderer: StudioPixiRenderer = ({ PIXI, app, state, width, height, time }) => {
  const g = new PIXI.Graphics();
  const values = state.audioFeatures.energySegments.length ? state.audioFeatures.energySegments : state.textFeatures.narrativeArc;
  if (!values.length) {
    const label = new PIXI.Text({
      text: 'MISSING_TIMELINE_SEGMENTS',
      style: { fill: 0x787184, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 11, letterSpacing: 1.4 },
    });
    label.x = width / 2 - 106;
    label.y = height / 2 - 8;
    app.stage.addChild(label);
    return;
  }
  const lanes = Math.max(1, Math.min(8, state.objectFeatures.layers.length || 1));
  const segmentCount = values.length;

  for (let lane = 0; lane < lanes; lane += 1) {
    const y = 30 + lane * ((height - 60) / lanes);
    g.moveTo(20, y);
    g.lineTo(width - 20, y);
    g.stroke({ width: 1, color: 0x45f0ff, alpha: 0.12 });
    for (let i = 0; i < segmentCount; i += 1) {
      const value = safeValue(values[i], 0);
      const x = 20 + (i / segmentCount) * (width - 40);
      const w = (width - 40) / segmentCount - 2;
      const h = 8 + value * 28;
      g.rect(x, y - h / 2 + Math.sin(time * 0.001 + i + lane) * 2, w, h);
      g.fill({ color: lane % 2 ? 0xff79d9 : 0xba5cff, alpha: 0.16 + value * 0.42 });
    }
  }

  app.stage.addChild(g);
};
