'use client';

import { useMemo, useState } from 'react';
import type { StudioArtifactInput, StudioPipelineTrace, StudioStageId } from '@/lib/studio/cultural-lab/types';
import { StudioAgentConsole } from './StudioAgentConsole';
import { StudioArtifactIntake } from './StudioArtifactIntake';
import { StudioOutcomeForecastPanel } from './StudioOutcomeForecastPanel';
import { StudioPipelineRail } from './StudioPipelineRail';
import { StudioProcessMap } from './StudioProcessMap';
import { StudioScenarioCanvas } from './StudioScenarioCanvas';
import { StudioTraceInspector } from './StudioTraceInspector';
import { StudioValueManipulator } from './StudioValueManipulator';

export default function StudioCulturalInterventionLab() {
  const [trace, setTrace] = useState<StudioPipelineTrace | null>(null);
  const [activeStage, setActiveStage] = useState<StudioStageId>('input_archaeology');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedStage = useMemo(() => trace?.stages.find((stage) => stage.id === activeStage) ?? trace?.stages[0] ?? null, [trace, activeStage]);

  async function runPipeline(input: StudioArtifactInput) {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/studio/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.trace) throw new Error(payload?.error ?? 'studio_pipeline_failed');
      setTrace(payload.trace);
      setActiveStage(payload.trace.stages[0]?.id ?? 'input_archaeology');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'studio_pipeline_failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050504] text-[#e9deca]">
      <div className="pointer-events-none fixed inset-0 opacity-50 [background-image:radial-gradient(circle_at_50%_20%,rgba(215,189,115,.16),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(96,130,150,.13),transparent_25%),linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:100%_100%,100%_100%,42px_42px,42px_42px]" />

      <section className="relative z-10 mx-auto grid max-w-[1800px] gap-5 p-5">
        <header className="rounded-[2rem] border border-[#2d2a28] bg-black/50 p-6">
          <div className="text-xs uppercase tracking-[0.28em] text-[#9c8c70]">SFI Studio · Cultural Intervention Laboratory</div>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#f1dfb1]">Artifact → Intervention → Forecast</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#b8ad98]">
                Operational ScoreFriction surface for cultural artifacts. It keeps the transformation chain visible: input, MIHM evaluation, World Spectrum comparison, emergence, projection, intervention, simulation, implementation and outcome forecast.
              </p>
            </div>
            <span className="rounded-full border border-[#d7bd73]/40 px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#d7bd73]">
              {trace ? `RUN ${trace.runId.slice(0, 8)}` : 'READY'}
            </span>
          </div>
        </header>

        {error ? <div className="rounded-2xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-200">{error}</div> : null}

        <div className="grid gap-5 xl:grid-cols-[320px_1fr_360px]">
          <div className="grid content-start gap-5">
            <StudioArtifactIntake onRun={runPipeline} loading={loading} />
            <StudioPipelineRail trace={trace} activeStage={activeStage} onStageChange={setActiveStage} />
          </div>

          <div className="grid gap-5">
            <StudioProcessMap trace={trace} />
            <div className="grid gap-5 lg:grid-cols-2">
              <StudioTraceInspector stage={selectedStage} />
              <StudioScenarioCanvas trace={trace} />
            </div>
          </div>

          <div className="grid content-start gap-5">
            <StudioAgentConsole trace={trace} />
            <StudioValueManipulator trace={trace} />
            <StudioOutcomeForecastPanel trace={trace} />
          </div>
        </div>
      </section>
    </main>
  );
}
