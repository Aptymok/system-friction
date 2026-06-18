import { appendLogbookEntry } from '@/lib/logbook/query';
import { runRootSelfObservability } from './selfObservability';

export async function proposeSelfReconstruction() {
  const self = await runRootSelfObservability();
  const proposals = self.reconstruction_proposals.map((proposal, index) => ({
    id: `reconstruction-${index + 1}`,
    file: null,
    reason: proposal.part,
    patch: `Declarar faltante: ${proposal.part}. Integrar ruta/componente canonico, eliminar superficie duplicada y ejecutar QA.`,
    tests: self.qa_required,
    requires_human_approval: true,
  }));
  await appendLogbookEntry({
    scope: 'reconstruction',
    visibility: 'system',
    event_type: 'self_reconstruction_proposal',
    title: 'Self Reconstruction proposal',
    summary: proposals.length ? `ROOT propuso ${proposals.length} reconstrucciones.` : 'ROOT no encontro piezas faltantes para reconstruir.',
    payload: { self, proposals },
  });
  return { ok: true, proposals, self };
}

export async function registerSelfReconstructionPatch(input: unknown) {
  const entry = await appendLogbookEntry({
    scope: 'reconstruction',
    visibility: 'system',
    event_type: 'self_reconstruction_patch_requested',
    title: 'Patch sugerido registrado',
    summary: 'El sistema registro un patch sugerido. No se aplico automaticamente.',
    payload: input,
  });
  return {
    ok: true,
    applied: false,
    reason: 'self_reconstruction_requires_human_control',
    logbook_entry: entry,
  };
}

