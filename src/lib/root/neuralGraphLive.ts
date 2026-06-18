import { readAmvThoughts } from '@/lib/amv/learning';
import { readVisibleLogbookEntries } from '@/lib/logbook/query';
import { buildOperationalCycle } from '@/lib/scorefriction/operationalCycle';
import { runRootSelfObservability } from './selfObservability';

export async function buildRootNeuralGraphLive(caseId = 'SFI-OP-LOCAL') {
  const [cycle, thoughts, logbook, self] = await Promise.all([
    buildOperationalCycle({ case_id: caseId, scope: 'culture', analysis_modes: ['WSV', 'SCOREFRICTION', 'AMV'] }),
    readAmvThoughts(caseId),
    readVisibleLogbookEntries({ role: 'system', email: process.env.SYSTEM_ROOT_EMAIL ?? 'aptymok' }, { case_id: caseId }),
    runRootSelfObservability(),
  ]);
  const nodes = [
    { id: 'twin', type: 'usuario/twin', label: 'Twin', payload: cycle.twin_state },
    { id: 'objective', type: 'objetivo', label: cycle.objective ?? 'sin objetivo declarado', payload: cycle.objective },
    { id: 'world-vector', type: 'vector mundial', label: cycle.regime.world ?? 'WorldSpectrumVector', payload: cycle.world_vector },
    { id: 'regime', type: 'regimen', label: cycle.regime.vector ?? 'sin regimen suficiente', payload: cycle.regime },
    { id: 'degradation', type: 'degradacion', label: String(cycle.degradation.level ?? 'sin datos suficientes'), payload: cycle.degradation },
    { id: 'alert', type: 'alerta', label: cycle.alert?.severity ?? 'none', payload: cycle.alert },
    ...cycle.weak_signals.slice(0, 8).map((signal, index) => ({ id: `signal-${index}`, type: 'senal', label: `senal ${index + 1}`, payload: signal })),
    ...cycle.attractors.slice(0, 8).map((attractor, index) => ({ id: `attractor-${index}`, type: 'atractor', label: `atractor ${index + 1}`, payload: attractor })),
    ...cycle.evidence.slice(0, 8).map((evidence, index) => ({ id: `evidence-${index}`, type: 'evidencia', label: `evidencia ${index + 1}`, payload: evidence })),
    ...thoughts.slice(0, 8).map((thought, index) => ({ id: `learning-${index}`, type: 'aprendizaje AMV', label: thought.thought, payload: thought })),
    ...self.reconstruction_proposals.slice(0, 8).map((proposal, index) => ({ id: `reconstruction-${index}`, type: 'reconstruction proposal', label: String(proposal.part), payload: proposal })),
  ];
  const edges = [
    { from: 'twin', to: 'objective', type: 'declara' },
    { from: 'world-vector', to: 'regime', type: 'alimenta' },
    { from: 'regime', to: 'alert', type: 'alerta' },
    { from: 'degradation', to: 'alert', type: 'fortalece' },
    ...nodes.filter((node) => node.id.startsWith('signal-')).map((node) => ({ from: node.id, to: 'regime', type: 'deriva' })),
    ...nodes.filter((node) => node.id.startsWith('attractor-')).map((node) => ({ from: node.id, to: 'objective', type: 'contradice/confirma' })),
    ...nodes.filter((node) => node.id.startsWith('evidence-')).map((node) => ({ from: node.id, to: 'learning-0', type: 'aprende' })),
  ];
  return {
    ok: nodes.length > 0,
    case_id: caseId,
    layout: 'dynamic-client',
    nodes,
    edges,
    logbook,
    self_observability: self,
    generated_at: new Date().toISOString(),
  };
}

