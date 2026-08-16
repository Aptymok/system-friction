import { materializeAtlasCognitiveSpineTemporalContext } from '@/lib/atlas/cognitiveSpineTemporalContext';
import { buildPublisherDraftRuntime } from '@/lib/publisher/publisherRuntime';

export type AtlasMemoryRuntimeResult = { [key: string]: any };

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {};
}

function asString(value: unknown, fallback = 'n/a'): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;
}

export async function buildAtlasMemoryRuntime(): Promise<AtlasMemoryRuntimeResult> {
  const atlasStartedAt = new Date().toISOString();
  const atlasExecutionId = `atlas-memory:${crypto.randomUUID()}`;
  const [publisher, cognitiveSpineResult] = await Promise.all([
    buildPublisherDraftRuntime(),
    materializeAtlasCognitiveSpineTemporalContext({
      executionId: atlasExecutionId,
      sourceCutoff: atlasStartedAt,
      createdAt: atlasStartedAt,
    })
      .then((context) => ({ ok: true as const, context, warning: null }))
      .catch((error) => ({
        ok: false as const,
        context: null,
        warning: `atlas_cognitive_spine_unavailable:${error instanceof Error ? error.message : String(error)}`,
      })),
  ]);

  const draft = asRecord(publisher);
  const material = asRecord(draft.material);
  const proposal = asRecord(material.proposal);
  const contrast = asRecord(proposal.contrast);

  const entry_id = `atlas-${Date.now()}`;
  const cognitiveSpine = cognitiveSpineResult.ok
    ? cognitiveSpineResult.context
    : {
        contractVersion: 'SFI-ATLAS-CT-TEMPORAL-CONTEXT-1.0',
        available: false,
        consumed: false,
        warning: cognitiveSpineResult.warning,
        rule: 'Atlas remains operational when Cognitive Spine temporal context is unavailable. Missing context is preserved as a provenance gap, not reconstructed narratively.',
      };

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
    cognitive_spine: cognitiveSpine,
    atlas_cognitive_boundary: {
      context_is_read_only: true,
      context_changes_publisher_material: false,
      atlas_requires_ct_to_operate: false,
      relationship_upgrades_epistemic_class: false,
      association_implies_causality: false,
      canonical_write_performed: false,
    },
    publisher,
  };
}

