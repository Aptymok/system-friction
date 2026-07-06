'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { StudioProductionState } from '@/lib/studio/production/studioProductionTypes';
import { ArchiveTimelineRenderer } from './renderers/ArchiveTimelineRenderer';
import { NeuralGraphRenderer } from './renderers/NeuralGraphRenderer';
import { SpectralCloudRenderer } from './renderers/SpectralCloudRenderer';
import { StudioOverviewFieldRenderer } from './renderers/StudioOverviewFieldRenderer';
import { TimelineDensityRenderer } from './renderers/TimelineDensityRenderer';
import { VectorScopeRenderer } from './renderers/VectorScopeRenderer';
import { WaveformRenderer } from './renderers/WaveformRenderer';
import type { StudioPixiRenderer } from './renderers/rendererTypes';

export type StudioPixiStageVariant = 'overview' | 'waveform' | 'spectral' | 'timeline' | 'vector' | 'archive' | 'graph';

const renderers: Record<StudioPixiStageVariant, StudioPixiRenderer> = {
  overview: StudioOverviewFieldRenderer,
  waveform: WaveformRenderer,
  spectral: SpectralCloudRenderer,
  timeline: TimelineDensityRenderer,
  vector: VectorScopeRenderer,
  archive: ArchiveTimelineRenderer,
  graph: NeuralGraphRenderer,
};

function fallbackPoints(state: StudioProductionState) {
  const nodes = state.objectFeatures.graph.nodes;
  if (nodes.length) return nodes.map((node, index) => ({
    id: node.id,
    x: 50 + Math.cos(index * 1.7) * (22 + index * 2),
    y: 50 + Math.sin(index * 1.7) * (18 + index * 1.4),
    value: node.value ?? 0.08,
  }));
  return [{ id: 'source-unavailable', x: 50, y: 50, value: 0.04 }];
}

export function StudioPixiStage({ state, variant, label }: { state: StudioProductionState; variant: StudioPixiStageVariant; label: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const fallback = useMemo(() => fallbackPoints(state), [state]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    async function mount() {
      const host = hostRef.current;
      if (!host) return;
      const PIXI = await import('pixi.js');
      if (disposed || !hostRef.current) return;

      const app = new PIXI.Application();
      await app.init({
        resizeTo: host,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(2, window.devicePixelRatio || 1),
      });
      if (disposed || !hostRef.current) {
        app.destroy(true);
        return;
      }

      host.innerHTML = '';
      host.appendChild(app.canvas);

      const draw = () => {
        app.stage.removeChildren();
        const renderer = renderers[variant];
        renderer({
          PIXI,
          app,
          state,
          width: Math.max(1, host.clientWidth),
          height: Math.max(1, host.clientHeight),
          time: performance.now(),
        });
      };

      app.ticker.add(draw);
      cleanup = () => {
        app.ticker.remove(draw);
        app.destroy(true);
      };
    }

    void mount();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [state, variant]);

  return (
    <div className="sfi-production__pixi-stage" aria-label={label}>
      <svg className="sfi-production__pixi-fallback" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <radialGradient id={`sfi-production-glow-${variant}`} cx="50%" cy="50%" r="48%">
            <stop offset="0%" stopColor="#ff79d9" stopOpacity="0.45" />
            <stop offset="56%" stopColor="#45f0ff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill={`url(#sfi-production-glow-${variant})`} />
        {fallback.map((point) => (
          <circle key={point.id} cx={point.x} cy={point.y} r={1.4 + point.value * 5} />
        ))}
        {state.activeObject.id ? null : <text x="50" y="52" textAnchor="middle">SOURCE_UNAVAILABLE</text>}
      </svg>
      <div ref={hostRef} className="sfi-production__pixi-host" />
    </div>
  );
}
