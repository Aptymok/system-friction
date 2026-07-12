import { featureValues, safeValue, type StudioPixiRenderer } from './rendererTypes';

export const SpectralCloudRenderer: StudioPixiRenderer = ({ PIXI, app, state, width, height, time }) => {
  const g = new PIXI.Graphics();
  const values = state.audioFeatures.frequencyBands.length ? state.audioFeatures.frequencyBands : featureValues(state);
  if (!values.length) {
    const label = new PIXI.Text({
      text: 'MISSING_SPECTRAL_FEATURES',
      style: { fill: 0x787184, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 11, letterSpacing: 1.4 },
    });
    label.x = width / 2 - 112;
    label.y = height / 2 - 8;
    app.stage.addChild(label);
    return;
  }

  for (let i = 0; i < 160; i += 1) {
    const source = safeValue(values[i % values.length], 0);
    const angle = i * 2.399 + time * 0.00008;
    const spread = Math.sqrt(i / 160) * Math.min(width, height) * (0.18 + source * 0.55);
    const x = width / 2 + Math.cos(angle) * spread * 1.45;
    const y = height / 2 + Math.sin(angle) * spread * 0.72;
    g.circle(x, y, 1 + source * 5);
    g.fill({ color: i % 4 === 0 ? 0x45f0ff : 0xba5cff, alpha: 0.12 + source * 0.52 });
  }

  app.stage.addChild(g);
};
