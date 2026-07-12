import { type StudioPixiRenderer } from './rendererTypes';

export const ArchiveTimelineRenderer: StudioPixiRenderer = ({ PIXI, app, state, width, height, time }) => {
  const g = new PIXI.Graphics();
  const events = state.archive.events;
  if (!events.length) {
    const label = new PIXI.Text({
      text: 'NO_ARCHIVE_EVENTS',
      style: { fill: 0x787184, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 11, letterSpacing: 1.4 },
    });
    label.x = width / 2 - 78;
    label.y = height / 2 - 8;
    app.stage.addChild(label);
    return;
  }
  const count = events.length;
  const y = height * 0.56;
  g.moveTo(24, y);
  g.lineTo(width - 24, y);
  g.stroke({ width: 2, color: 0xba5cff, alpha: 0.34 });

  for (let i = 0; i < count; i += 1) {
    const x = 36 + (i / Math.max(1, count - 1)) * (width - 72);
    const pulse = 1 + Math.sin(time * 0.002 + i) * 0.2;
    g.circle(x, y, 7 * pulse);
    g.fill({ color: 0xff79d9, alpha: 0.68 });
    g.moveTo(x, y);
    g.lineTo(x, y - 45 - (i % 3) * 12);
    g.stroke({ width: 1, color: 0x45f0ff, alpha: 0.18 });
  }

  app.stage.addChild(g);
};
