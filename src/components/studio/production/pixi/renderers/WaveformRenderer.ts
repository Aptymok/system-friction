import { safeValue, type StudioPixiRenderer } from './rendererTypes';

export const WaveformRenderer: StudioPixiRenderer = ({ PIXI, app, state, width, height, time }) => {
  const g = new PIXI.Graphics();
  const waveform = state.audioFeatures.waveform.length ? state.audioFeatures.waveform : state.audioFeatures.energySegments;
  const values = waveform.length ? waveform : [0, 0, 0, 0, 0, 0];
  const mid = height * 0.5;

  for (let pass = 0; pass < 3; pass += 1) {
    values.forEach((raw, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width;
      const amp = safeValue(raw, 0);
      const phase = Math.sin(time * 0.002 + index * 0.35 + pass);
      const y = mid + phase * amp * height * (0.18 + pass * 0.05);
      if (index === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    });
    g.stroke({ width: 1 + pass, color: pass === 0 ? 0x45f0ff : 0xff79d9, alpha: 0.28 - pass * 0.04 });
  }

  const playhead = ((time * 0.04) % Math.max(1, width));
  g.moveTo(playhead, height * 0.08);
  g.lineTo(playhead, height * 0.92);
  g.stroke({ width: 2, color: 0xff9f43, alpha: 0.72 });
  app.stage.addChild(g);
};
