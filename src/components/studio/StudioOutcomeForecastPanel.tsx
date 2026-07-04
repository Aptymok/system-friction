'use client';

import type { StudioPipelineTrace, StudioStageResult } from '@/lib/studio/cultural-lab/types';

type ForecastData = {
  summary: string;
  forecast: Record<string, number>;
  scenarioOutcomes: Array<{ id: string; title: string; confidence: number }>;
  nextObservationWindow: string;
  verificationCriteria: string[];
};

export function StudioOutcomeForecastPanel({ trace, stage }: { trace?: StudioPipelineTrace | null; stage?: StudioStageResult<unknown> | null }) {
  const resolvedStage = stage ?? trace?.stages.find((item) => item.id === 'outcome_forecast') ?? null;
  const forecastData = resolvedStage?.data as ForecastData | undefined;

  if (!forecastData) {
    return (
      <div className="rounded-3xl border border-[#2d2a28] bg-[#0b0a08] p-5 text-sm text-[#b8ad98]">
        Forecast panel awaits a completed outcome stage. It will surface planned values, next windows, and verification criteria.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#2d2a28] bg-[#0b0a08] p-5">
      <div className="mb-4 text-sm uppercase tracking-[0.22em] text-[#9c8c70]">Outcome Forecast</div>
      <div className="grid gap-3 text-sm text-[#d0c6b0]">
        <div>{forecastData.summary}</div>
        <div>Forecasted values: {Object.entries(forecastData.forecast).map(([key, value]) => `${key}:${Number(value).toFixed(2)}`).join(', ')}</div>
        <div>Next observation window: {forecastData.nextObservationWindow}</div>
        <div>Verification: {forecastData.verificationCriteria.join(', ')}</div>
        <div>Scenarios: {forecastData.scenarioOutcomes.map((scenario) => `${scenario.id}(${Math.round(scenario.confidence * 100)}%)`).join(', ')}</div>
      </div>
    </div>
  );
}
