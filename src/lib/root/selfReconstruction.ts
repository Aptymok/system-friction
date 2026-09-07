import { appendLogbookEntry } from '@/lib/logbook/query';
import { runRootSelfObservability } from './selfObservability';

export const SFI_SELF_RECONSTRUCTION_AUTHORITY_CONTRACT = 'SFI-SELF-RECONSTRUCTION-AUTHORITY-1.0' as const;

export const SFI_SELF_RECONSTRUCTION_AUTHORITY = Object.freeze({
  observeWithoutRoot: true,
  reconstructWithoutRoot: true,
  boundedRepairWithoutRoot: true,
  verifyWithoutRoot: true,
  addPromoteRequiresRoot: true,
  canonicalPromotionAllowedDuringRepair: false,
} as const);

export async function proposeSelfReconstruction() {
  const self = await runRootSelfObservability();
  const proposals = self.reconstruction_proposals.map((proposal, index) => ({
    id: `reconstruction-${index + 1}`,
    file: null,
    reason: proposal.part,
    patch: `Declarar faltante: ${proposal.part}. Integrar ruta/componente canonico, eliminar superficie duplicada y ejecutar QA.`,
    tests: self.qa_required,
    state: 'BOUNDED_REPAIR_CANDIDATE' as const,
    bounded_repair_allowed: true,
    requires_root_add_review: true,
    canonical_promotion_allowed: false,
    authority_contract: SFI_SELF_RECONSTRUCTION_AUTHORITY_CONTRACT,
  }));
  await appendLogbookEntry({
    scope: 'reconstruction',
    visibility: 'system',
    event_type: 'self_reconstruction_proposal',
    title: 'Self Reconstruction proposal',
    summary: proposals.length
      ? `SFI propuso ${proposals.length} reconstrucciones bounded para verificacion antes de cualquier ADD/PROMOTE.`
      : 'SFI no encontro piezas faltantes para reconstruir.',
    payload: {
      self,
      proposals,
      authority: SFI_SELF_RECONSTRUCTION_AUTHORITY,
    },
  });
  return {
    ok: true,
    proposals,
    self,
    authority: SFI_SELF_RECONSTRUCTION_AUTHORITY,
  };
}

/**
 * Persist a reconstruction repair candidate after (or before) bounded testing.
 * Registration is not application, ADD, promotion or canonical mutation.
 * The repair/test loop may proceed without ROOT; a verified institutional
 * mutation still requires the existing governed ROOT ADD/PROMOTE decision.
 */
export async function registerSelfReconstructionPatch(input: unknown) {
  const entry = await appendLogbookEntry({
    scope: 'reconstruction',
    visibility: 'system',
    event_type: 'self_reconstruction_repair_candidate_registered',
    title: 'Bounded repair candidate registrado',
    summary: 'SFI registro un candidato de reparacion para prueba/verificacion. El registro no aplica ni promueve la mutacion.',
    payload: {
      candidate: input,
      authority: SFI_SELF_RECONSTRUCTION_AUTHORITY,
      epistemic_state: 'REPAIR_CANDIDATE_NOT_PROMOTED',
    },
  });
  return {
    ok: true,
    applied: false,
    promoted: false,
    state: 'REPAIR_CANDIDATE_RECORDED' as const,
    bounded_repair_allowed: true,
    verification_allowed: true,
    root_add_required: true,
    canonical_promotion_allowed: false,
    reason: 'repair_candidate_recorded_not_promoted',
    authority_contract: SFI_SELF_RECONSTRUCTION_AUTHORITY_CONTRACT,
    logbook_entry: entry,
  };
}
