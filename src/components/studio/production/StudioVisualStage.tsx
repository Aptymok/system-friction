'use client';

import { useEffect, useState } from 'react';
import {
  StudioProjectionConsole,
  StudioReturnConsole,
  StudioRouteConsole,
  StudioVectorConsole,
} from './StudioVisualInstruments';

export type StudioVisualStageView = 'systemic' | 'projection' | 'decision' | 'return';

type Row = Record<string, unknown>;

type ProjectionRoute = {
  id: string;
  title: string;
  suitability: number;
  confidence: number;
  rationale: string;
};

type Projection = {
  world: {
    dominantDomain: string | null;
    confidence: number;
    crossVectorTensions: Array<{ between: [string, string]; magnitude: number; description: string }>;
    inferredAttractors: Array<{ id: string; label: string; description: string; confidence: number }>;
  };
  fit: {
    score: number | null;
    confidence: number;
    coverage: number;
  };
  strategy: {
    selectedRouteId: string | null;
    routes: ProjectionRoute[];
  };
};

type Synthesis = {
  mihm: {
    variables: Array<{ key: string; label: string; value: number | null; status: string }>;
  };
};

type Predictive = {
  id: string | null;
  prediction: number | null;
  lowerBound: number | null;
  upperBound: number | null;
  confidence: number | null;
};

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === 'object' && !Array.isArray(item)) : [];
}

function numberValue(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : null;
  return parsed !== null && Number.isFinite(parsed) ? parsed : null;
}

function encodeObjectId(value: string | null) {
  if (!value) throw new Error('STUDIO_OBJECT_ID_REQUIRED');
  return encodeURIComponent(value);
}

function normalizePredictive(value: unknown): Predictive {
  const outer = record(value);
  const run = Object.keys(record(outer.run)).length ? record(outer.run) : outer;
  return {
    id: typeof run.id === 'string' ? run.id : null,
    prediction: numberValue(run.prediction),
    lowerBound: numberValue(run.lowerBound ?? run.lower_bound),
    upperBound: numberValue(run.upperBound ?? run.upper_bound),
    confidence: numberValue(run.confidence),
  };
}

export function StudioVisualStage({ objectId, view }: { objectId: string | null; view: StudioVisualStageView }) {
  const [projection, setProjection] = useState<Projection | null>(null);
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null);
  const [predictive, setPredictive] = useState<Predictive>({ id: null, prediction: null, lowerBound: null, upperBound: null, confidence: null });
  const [outcomes, setOutcomes] = useState<Row[]>([]);
  const [learningEvents, setLearningEvents] = useState<Row[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'failed'>('idle');

  useEffect(() => {
    if (!objectId) {
      setProjection(null);
      setSynthesis(null);
      setOutcomes([]);
      setLearningEvents([]);
      return;
    }
    let cancelled = false;
    async function load() {
      setState('loading');
      const encoded = encodeObjectId(objectId);
      const [projectionResponse, synthesisResponse] = await Promise.all([
        fetch(`/api/studio/objects/${encoded}/project`, { cache: 'no-store' }),
        fetch(`/api/studio/objects/${encoded}/synthesize`, { cache: 'no-store' }),
      ]);
      let projectionBody = await projectionResponse.json().catch(() => null);
      if (!projectionResponse.ok || projectionBody?.ok !== true) {
        const generated = await fetch(`/api/studio/objects/${encoded}/project`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ persist: false }),
        });
        projectionBody = await generated.json().catch(() => null);
      }
      const synthesisBody = await synthesisResponse.json().catch(() => null);
      if (cancelled) return;
      if (projectionBody?.ok === true) {
        const nextProjection = projectionBody.projection as Projection;
        const nextPredictive = normalizePredictive(projectionBody.predictiveRun);
        setProjection(nextProjection);
        setPredictive(nextPredictive);
        if (nextPredictive.id) {
          const runResponse = await fetch(`/api/predictive-engine/runs/${encodeURIComponent(nextPredictive.id)}`, { cache: 'no-store' });
          const runBody = await runResponse.json().catch(() => null);
          if (!cancelled && runResponse.ok && runBody?.ok) {
            setOutcomes(rows(runBody.outcomes));
            setLearningEvents(rows(runBody.learningEvents));
          }
        }
      }
      if (synthesisResponse.ok && synthesisBody?.ok) setSynthesis(synthesisBody.synthesis as Synthesis);
      setState('idle');
    }
    void load().catch(() => {
      if (!cancelled) setState('failed');
    });
    return () => { cancelled = true; };
  }, [objectId]);

  if (!objectId) return null;
  if (state === 'loading' && !projection) return <div className="sfi-console-stage-state">SYNCHRONIZING VISUAL INSTRUMENTS</div>;
  if (state === 'failed' || !projection) return <div className="sfi-console-stage-state is-failed">VISUAL INSTRUMENT DATA UNAVAILABLE</div>;

  if (view === 'systemic') {
    return (
      <StudioVectorConsole
        dominantDomain={projection.world.dominantDomain}
        tensions={projection.world.crossVectorTensions}
        attractors={projection.world.inferredAttractors}
        variables={synthesis?.mihm.variables ?? []}
      />
    );
  }

  if (view === 'projection') {
    return (
      <StudioProjectionConsole
        compatibility={projection.fit.score}
        compatibilityConfidence={projection.fit.confidence}
        coverage={projection.fit.coverage}
        prediction={predictive.prediction}
        predictionConfidence={predictive.confidence}
        lower={predictive.lowerBound}
        upper={predictive.upperBound}
        worldConfidence={projection.world.confidence}
      />
    );
  }

  if (view === 'decision') {
    return <StudioRouteConsole routes={projection.strategy.routes} selectedRouteId={projection.strategy.selectedRouteId} />;
  }

  const latestOutcome = outcomes[0] ?? null;
  return (
    <StudioReturnConsole
      prediction={predictive.prediction}
      actual={numberValue(latestOutcome?.actual_value ?? latestOutcome?.actualValue)}
      confidence={predictive.confidence}
      fidelity={numberValue(latestOutcome?.intervention_fidelity ?? latestOutcome?.interventionFidelity)}
      learningCount={learningEvents.length}
      outcomeCount={outcomes.length}
    />
  );
}
