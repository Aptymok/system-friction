import { buildSfiContrastRuntime } from '@/lib/sfi/contrast/sfiContrastRuntime';
import { buildSfiProposalRuntime } from '@/lib/sfi/proposals/sfiProposalRuntime';
import { buildSfiMaterialRuntime } from '@/lib/sfi/material/sfiMaterialRuntime';
import { buildPublisherDraftRuntime } from '@/lib/publisher/publisherRuntime';
import { buildAtlasMemoryRuntime } from '@/lib/atlas/atlasMemoryRuntime';

export type LowInjectionInput = {
  text?: string;
  url?: string;
  case_id?: string;
  observation_id?: string;
  material_type?: string;
};

export async function runLowInjectionPipeline(input: LowInjectionInput = {}) {
  const [contrast, proposal, material, publisherDraft, atlasMemory] = await Promise.all([
    buildSfiContrastRuntime(),
    buildSfiProposalRuntime(),
    buildSfiMaterialRuntime(),
    buildPublisherDraftRuntime(),
    buildAtlasMemoryRuntime(),
  ]);

  const approvalRequired = proposal.approval_required || material.approval_required || publisherDraft.approval_required;
  const status = contrast.status === 'MISSING' || proposal.status === 'BLOCKED' || material.status === 'BLOCKED'
    ? 'BLOCKED'
    : approvalRequired
      ? 'READY_FOR_REVIEW'
      : 'OK';

  return {
    run_id: `run-${Date.now()}`,
    status,
    input,
    stages: {
      observed: Boolean(contrast.observation_id),
      evaluated: contrast.mihm_regime !== 'missing',
      contrasted: contrast.status !== 'MISSING',
      proposed: proposal.status !== 'BLOCKED',
      materialized: material.status !== 'BLOCKED',
      drafted: publisherDraft.status === 'draft',
      archived: atlasMemory.status !== 'BLOCKED',
    },
    contrast,
    proposal,
    material,
    publisherDraft,
    atlasMemory,
    next_action: approvalRequired
      ? 'Revisión humana requerida antes de publicación o ejecución externa.'
      : 'Material revisable listo; no se publicó automáticamente.',
  };
}
