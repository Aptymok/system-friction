import { buildPublisherDraftRuntime } from '@/lib/publisher/publisherRuntime';

export type AtlasMemoryRuntimeResult = { [key: string]: any };

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {};
}

function asString(value: unknown, fallback = 'n/a'): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

export async function buildAtlasMemoryRuntime(): Promise<AtlasMemoryRuntimeResult> {
  const publisher = await buildPublisherDraftRuntime();

  const draft = asRecord(publisher);
  const material = asRecord(draft.material);
  const proposal = asRecord(material.proposal);
  const contrast = asRecord(proposal.contrast);

  const entry_id = `atlas-${Date.now()}`;

  return {
    ok: true,
    status: 'OK',
    entry_id,
    nucleus: 'SFI-OP-001',
    page_type: 'generated_material',
    reading_path: 'observacion -> mihm -> cotejo -> propuesta -> material -> publisher -> atlas',
    case_id: asString(contrast.case_id),
    observation_id: asString(contrast.observation_id),
    vector_id: asString(contrast.vector_id),
    mihm_regime: asString(contrast.mihm_regime),
    title: asString(material.title ?? draft.title, 'SFI generated material'),
    material_type: asString(material.material_type, 'report'),
    body: asString(material.atlas_block ?? material.body ?? draft.body, ''),
    evidence_links: [
      asString(contrast.observation_id, ''),
      asString(contrast.vector_id, ''),
    ].filter(Boolean),
    approval_required: Boolean(material.approval_required ?? draft.approval_required),
    publisher,
  };
}

