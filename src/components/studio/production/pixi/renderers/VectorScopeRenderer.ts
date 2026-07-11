import { safeValue, type StudioPixiRenderer } from './rendererTypes';

export const VectorScopeRenderer: StudioPixiRenderer = ({ PIXI, app, state, width, height, time }) => {
  const g = new PIXI.Graphics();
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.34;
  if (state.audioFeatures.stereoImage === null) {
    const label = new PIXI.Text({
      text: 'MISSING_STEREO_WIDTH',
      style: { fill: 0x787184, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 11, letterSpacing: 1.4 },
    });
    label.x = cx - 88;
    label.y = cy - 8;
    app.stage.addChild(label);
    return;
  }
  const stereo = safeValue(state.audioFeatures.stereoImage, 0);

  for (let i = 0; i < 64; i += 1) {
    const angle = (i / 64) * Math.PI * 2;
    const mod = Math.sin(time * 0.002 + i * 0.7) * 0.18;
    const r = radius * (0.42 + stereo + mod);
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle * 2) * r * 0.55;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke({ width: 2, color: 0x45f0ff, alpha: 0.62 });
  g.circle(cx, cy, radius);
  g.stroke({ width: 1, color: 0xff79d9, alpha: 0.22 });
  app.stage.addChild(g);
};
