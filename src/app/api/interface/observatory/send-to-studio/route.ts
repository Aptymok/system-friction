import { NextResponse } from 'next/server';
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  caseId?: unknown;
  nodeId?: unknown;
};

function clean(value: unknown, max = 240) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : '';
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const body = await request.json().catch(() => null) as Body | null;
    const caseId = clean(body?.caseId);
    const nodeId = clean(body?.nodeId);
    if (!caseId || !nodeId) {
      return NextResponse.json({ ok: false, error: 'Selecciona un punto real de la trayectoria.' }, { status: 400 });
    }

    const service = createServiceSupabaseClient();
    const [{ data: fieldCase, error: caseError }, { data: node, error: nodeError }] = await Promise.all([
      service
        .from('field_cases')
        .select('id,title,status,created_at')
        .eq('id', caseId)
        .eq('owner_id', user.id)
        .is('deleted_at', null)
        .maybeSingle(),
      service
        .from('sfi_user_graph_nodes')
        .select('id,case_id,node_type,label,summary,weight,is_central,source_type,source_id,metadata,observed_at')
        .eq('id', nodeId)
        .eq('case_id', caseId)
        .eq('owner_id', user.id)
        .maybeSingle(),
    ]);

    if (caseError || !fieldCase) {
      return NextResponse.json({ ok: false, error: 'No fue posible encontrar esta trayectoria.' }, { status: 404 });
    }
    if (nodeError || !node) {
      return NextResponse.json({ ok: false, error: 'El punto seleccionado no pertenece a esta trayectoria.' }, { status: 404 });
    }

    const title = clean(node.label, 240) || `Objeto observado en ${fieldCase.title}`;
    const summary = clean(node.summary, 4000);
    const observedAt = clean(node.observed_at, 100) || null;
    const nodeMetadata = record(node.metadata);
    const transferredAt = new Date().toISOString();

    const session = await service
      .from('studio_sessions')
      .insert({
        owner_id: user.id,
        title: `${title} · estudio`,
        status: 'active',
        metadata: {
          source: 'field_trajectory_transfer_v1',
          fieldCaseId: fieldCase.id,
          fieldNodeId: node.id,
          transferredAt,
        },
      })
      .select('id')
      .single();
    if (session.error || !session.data) {
      return NextResponse.json({ ok: false, error: 'No fue posible abrir una sesión de análisis.' }, { status: 503 });
    }

    const sourceText = [
      `Título observado: ${title}`,
      summary ? `Descripción registrada: ${summary}` : null,
      `Estado de origen: ${clean(node.node_type, 80) || 'observado'}`,
      observedAt ? `Observado: ${observedAt}` : null,
      `Trayectoria: ${fieldCase.title}`,
    ].filter(Boolean).join('\n\n');

    const object = await service
      .from('studio_objects')
      .insert({
        session_id: session.data.id,
        owner_id: user.id,
        title,
        object_type: 'text',
        source_uri: `field://${fieldCase.id}/nodes/${node.id}`,
        mime_type: 'text/plain',
        status: 'draft',
        metadata: {
          declaration: {
            context: summary || null,
            notes: sourceText,
            authorityConsent: true,
            provenance: {
              source: 'field_trajectory_transfer_v1',
              ownerId: user.id,
              fieldCaseId: fieldCase.id,
              fieldNodeId: node.id,
              sourceType: node.source_type ?? null,
              sourceId: node.source_id ?? null,
              observedAt,
              transferredAt,
            },
          },
          epistemicState: clean(node.node_type, 80) || 'observed',
          fieldNodeMetadata: nodeMetadata,
          fieldWeight: typeof node.weight === 'number' ? node.weight : null,
          fieldCentral: node.is_central === true,
        },
      })
      .select('id,session_id')
      .single();

    if (object.error || !object.data) {
      await service.from('studio_sessions').delete().eq('id', session.data.id).eq('owner_id', user.id);
      return NextResponse.json({ ok: false, error: 'No fue posible preparar el objeto para STUDIO.' }, { status: 503 });
    }

    await service.from('studio_evidence_traces').insert({
      object_id: object.data.id,
      evidence_kind: 'field_trajectory_node',
      source_uri: `field://${fieldCase.id}/nodes/${node.id}`,
      summary: summary || title,
      confidence: typeof node.weight === 'number' ? Math.max(0, Math.min(1, node.weight)) : null,
      metadata: {
        fieldCaseId: fieldCase.id,
        fieldNodeId: node.id,
        nodeType: node.node_type,
        observedAt,
        transferredAt,
      },
    });

    return NextResponse.json({
      ok: true,
      objectId: object.data.id,
      nextPath: `/studio?objectId=${encodeURIComponent(object.data.id)}`,
      explanation: 'El punto fue preparado como objeto de STUDIO conservando su procedencia. Todavía no ha sido interpretado ni transformado.',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code }, { status: error.status });
    }
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'No fue posible enviar el punto a STUDIO.' }, { status: 500 });
  }
}
