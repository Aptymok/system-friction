import 'server-only';
import { buildAgenticRootState } from '@/lib/agents/sfiAgents';
import type { RootAgent, RootRow } from '../rootSovereignState';
import { bounded, dateValue, row, source, text } from './readerSupport';

function agent(input: RootRow, id: string, role: string): RootAgent {
  const state = text(input.state ?? input.status ?? input.current_signal_state ?? input.availability, 'SIN DATO');
  const observedAt = dateValue(input.last_run ?? input.lastRun ?? input.updated_at);
  return {
    id,
    role,
    state: {
      value: state,
      status: state === 'SIN DATO' ? 'missing' : 'observed',
      source: text(input.source, 'buildAgenticRootState'),
      observedAt,
      confidence: null,
      evidenceIds: [],
      explanation: 'Estado reportado por el runtime del agente; no es un health score.',
      warning: text(input.error ?? input.warning, '') || null,
    },
    provider: text(input.provider, '') || null,
    model: text(input.model, '') || null,
    lastRun: observedAt,
    lastResult: text(input.last_result ?? input.lastResult ?? input.result, '') || null,
    availability: text(input.availability, state),
    error: text(input.error ?? input.warning, '') || null,
  };
}

export async function readRootAgents() {
  const result = await bounded('buildAgenticRootState', () => buildAgenticRootState());
  const state = row(result.data);
  const providers = Array.isArray(state.providers) ? state.providers.map(row) : [];
  const agents = [
    agent(row(state.worldVectorAgent), 'WORLD-VECTOR', 'World Vector observation'),
    agent(row(state.neuralGraphAgent ?? state.systemHealth), 'NEURAL-GRAPH', 'Persistent evidence graph'),
    agent(row(state.amvAgent), 'AMV', 'Operational memory'),
    agent(row(state.predictionAgent), 'PREDICTION', 'Prediction registry'),
    ...providers.map((provider, index) => agent(provider, text(provider.id ?? provider.name, `LLM-${index + 1}`), 'LLM provider')),
  ];
  return source({ agents }, 'buildAgenticRootState', [result.error], agents.map((item) => item.lastRun).find(Boolean) ?? null, !result.data);
}
