import { buildSfiMaterialRuntime, type SfiMaterialRuntimeResult } from '@/lib/sfi/material/sfiMaterialRuntime';

export type SfiPublisherDraft = {
  status: 'draft';
  draft_id: string;
  channel: 'Medium' | 'LinkedIn' | 'site_report' | 'Atlas' | 'internal_log';
  title: string;
  body: string;
  visual_prompt: string | null;
  approval_required: boolean;
  evidence_links: string[];
  material: SfiMaterialRuntimeResult;
};

export async function buildPublisherDraftRuntime(channel?: SfiPublisherDraft['channel']): Promise<SfiPublisherDraft> {
  const material = await buildSfiMaterialRuntime();
  const contrast = material.proposal.contrast;
  const selectedChannel = channel ?? material.proposal.target_medium;

  return {
    status: 'draft',
    draft_id: `draft-${material.material_id}`,
    channel: selectedChannel,
    title: material.title,
    body: selectedChannel === 'Atlas' ? (material.atlas_block ?? material.body) : material.body,
    visual_prompt: material.image_prompt,
    approval_required: true,
    evidence_links: [contrast.observation_id, contrast.vector_id].filter((item): item is string => Boolean(item)),
    material,
  };
}
