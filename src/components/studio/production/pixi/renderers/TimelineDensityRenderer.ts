import { safeValue, type StudioPixiRenderer } from './rendererTypes';

export const TimelineDensityRenderer: StudioPixiRenderer = ({ PIXI, app, state, width, height, time }) => {
  const g = new PIXI.Graphics();
  const values = state.audioFeatures.energySegments.length ? state.audioFeatures.energySegments : state.textFeatures.narrativeArc;
  const lanes = Math.max(4, Math.min(8, state.objectFeatures.layers.length || 5));
  const segmentCount = Math.max(12, values.length || 12);

  for (let lane = 0; lane < lanes; lane += 1) {
    const y = 30 + lane * ((height - 60) / lanes);
    g.moveTo(20, y);
    g.lineTo(width - 20, y);
    g.stroke({ width: 1, color: 0x45f0ff, alpha: 0.12 });
    for (let i = 0; i < segmentCount; i += 1) {
      const value = safeValue(values[i % Math.max(1, values.length)] ?? 0, state.activeObject.id ? 0.24 : 0.04);
      const x = 20 + (i / segmentCount) * (width - 40);
      const w = (width - 40) / segmentCount - 2;
      const h = 8 + value * 28;
      g.rect(x, y - h / 2 + Math.sin(time * 0.001 + i + lane) * 2, w, h);
      g.fill({ color: lane % 2 ? 0xff79d9 : 0xba5cff, alpha: 0.16 + value * 0.42 });
    }
  }

  app.stage.addChild(g);
};
