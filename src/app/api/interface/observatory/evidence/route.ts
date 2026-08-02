import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server';
import { deriveEvidenceAssessment, type AttractorDescriptor } from '@/lib/user-interface/attractor';
import { createLearningGraphNode } from '@/lib/user-interface/graphLearning';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const BUCKET = 'field-evidence';

function clean(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120) || 'evidence.bin';
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const service = createServiceSupabaseClient();
    const form = await request.formData();
    const caseId = clean(form.get('caseId'));
    const note = clean(form.get('note'));
    const source = clean(form.get('source')) || 'user_observation';
    const reliability = clamp01(Number(clean(form.get('reliability')) || 0.7));
    const fileValue = form.get('file');
    const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

    if (!caseId) return NextResponse.json({ ok: false, error: 'case_id_required' }, { status: 400 });
    if (!note && !file) return NextResponse.json({ ok: false, error: 'evidence_content_required' }, { status: 400 });
    if (file && file.size > MAX_FILE_SIZE) return NextResponse.json({ ok: false, error: 'evidence_file_too_large' }, { status: 413 });

    const [{ data: entitlement }, { data: attractor, error: attractorError }] = await Promise.all([
      service.from('sfi_user_entitlements').select('status,valid_until').eq('user_id', user.id).maybeSingle(),
      service.from('sfi_user_attractors').select('*').eq('owner_id', user.id).eq('case_id', caseId).eq('status', 'DECLARED').maybeSingle(),
    ]);
    const active = entitlement?.status === 'active' || entitlement?.status === 'trialing';
    const expired = entitlement?.valid_until && new Date(entitlement.valid_until).getTime() <= Date.now();
    if (!active || expired) return NextResponse.json({ ok: false, error: 'field_entitlement_required' }, { status: 402 });
    if (attractorError || !attractor) return NextResponse.json({ ok: false, error: 'declared_attractor_required' }, { status: 409 });

    let storagePath: string | null = null;
    let uri: string | null = null;
    if (file) {
      const filename = safeFilename(file.name);
      storagePath = `${user.id}/field/${caseId}/${Date.now()}-${randomUUID().slice(0, 8)}-${filename}`;
      const bytes = Buffer.from(await file.arrayBuffer());
      const upload = await service.storage.from(BUCKET).upload(storagePath, bytes, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });
      if (upload.error) return NextResponse.json({ ok: false, error: upload.error.message }, { status: 500 });
      uri = `storage://${BUCKET}/${storagePath}`;
    }

    const descriptor: AttractorDescriptor = {
      code: attractor.code,
      label: attractor.label,
      summary: attractor.summary,
      objective: attractor.objective,
      direction: attractor.direction,
      confidence: Number(attractor.confidence ?? 0),
    };
    const assessment = deriveEvidenceAssessment({
      attractor: descriptor,
      note,
      source,
      hasFile: Boolean(file),
      reliability,
    });
    const observedAt = new Date().toISOString();
    const label = file?.name || note.replace(/\s+/g, ' ').slice(0, 80) || 'Evidencia de observación';

    const { data: evidence, error: evidenceError } = await service.from('field_case_evidence').insert({
      case_id: caseId,
      owner_id: user.id,
      evidence_type: file ? 'artifact' : 'observation_note',
      label,
      source,
      reliability,
      storage_path: storagePath,
      uri,
      visibility: 'private',
      payload: {
        note,
        assessmentStatus: assessment.status,
        relevance: assessment.relevance,
        traceability: assessment.traceability,
        confidence: assessment.confidence,
      },
      observed_at: observedAt,
    }).select('id').single();
    if (evidenceError || !evidence) return NextResponse.json({ ok: false, error: evidenceError?.message ?? 'evidence_insert_failed' }, { status: 500 });

    const { data: mihm, error: mihmError } = await service.from('field_mihm_readings').insert({
      case_id: caseId,
      owner_id: user.id,
      status: 'PARTIAL',
      metrics: assessment.metrics,
      tensions: assessment.status === 'ACCEPTED' ? [] : [`EVIDENCE_${assessment.status}`],
      formula_version: 'USER_OBSERVATORY_MIHM_EVIDENCE_PROXY_V1',
      evidence_ids: [evidence.id],
    }).select('id').single();
    if (mihmError) return NextResponse.json({ ok: false, error: mihmError.message }, { status: 500 });

    const { data: assessmentRow, error: assessmentError } = await service.from('sfi_user_evidence_assessments').insert({
      owner_id: user.id,
      case_id: caseId,
      attractor_id: attractor.id,
      evidence_id: evidence.id,
      status: assessment.status,
      relevance: assessment.relevance,
      traceability: assessment.traceability,
      confidence: assessment.confidence,
      mihm_reading_id: mihm?.id ?? null,
      reason: assessment.reason,
      next_action: assessment.nextAction,
      internal_hypothesis_delta: {
        candidateUpdate: assessment.status === 'ACCEPTED',
        disclosure: 'internal_only',
      },
    }).select('id').single();
    if (assessmentError || !assessmentRow) return NextResponse.json({ ok: false, error: assessmentError?.message ?? 'assessment_insert_failed' }, { status: 500 });

    const { data: centralNode } = await service
      .from('sfi_user_graph_nodes')
      .select('id')
      .eq('owner_id', user.id)
      .eq('case_id', caseId)
      .eq('attractor_id', attractor.id)
      .eq('is_central', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: evidenceNode } = await service.from('sfi_user_graph_nodes').insert({
      owner_id: user.id,
      case_id: caseId,
      attractor_id: attractor.id,
      node_type: 'evidence',
      label,
      summary: note || assessment.reason,
      weight: assessment.confidence,
      is_central: false,
      source_type: 'field_case_evidence',
      source_id: evidence.id,
      metadata: {
        assessmentStatus: assessment.status,
        relevance: assessment.relevance,
        traceability: assessment.traceability,
        nextAction: assessment.nextAction,
        uri,
      },
      observed_at: observedAt,
    }).select('id').single();

    if (centralNode?.id && evidenceNode?.id) {
      await service.from('sfi_user_graph_edges').insert({
        owner_id: user.id,
        case_id: caseId,
        attractor_id: attractor.id,
        source_node_id: evidenceNode.id,
        target_node_id: centralNode.id,
        relation: assessment.status === 'ACCEPTED' ? 'supports_attractor' : 'observed_against_attractor',
        strength: assessment.confidence,
        direction: assessment.status === 'ACCEPTED' ? 'toward_attractor' : 'contextual',
        curvature: assessment.status === 'ACCEPTED' ? 0.1 : 0.45,
        metadata: { evidenceId: evidence.id, mihmReadingId: mihm?.id ?? null },
      });
    }

    const learningNodeId = assessment.status === 'ACCEPTED' && evidenceNode?.id
      ? await createLearningGraphNode({
          ownerId: user.id,
          caseId,
          attractorId: attractor.id,
          evidenceNodeId: evidenceNode.id,
          sourceId: assessmentRow.id,
          summary: assessment.reason,
          nextAction: assessment.nextAction,
          confidence: assessment.confidence,
        })
      : null;

    return NextResponse.json({
      ok: true,
      evidenceId: evidence.id,
      nodeId: evidenceNode?.id ?? null,
      learningNodeId,
      mihmReadingId: mihm?.id ?? null,
      assessment,
    });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'observatory_evidence_failed' }, { status: 500 });
  }
}
