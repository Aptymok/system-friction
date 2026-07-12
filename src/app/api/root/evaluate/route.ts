import { NextResponse } from 'next/server';
import { requireRootActor, auditRootAction } from '@/lib/root/server';
import { synthesizeStudioObject } from '@/lib/studio/production/objectContextSynthesis';
import { generatePhase1Report, type MihmVector } from '@/lib/studio/cultural-lab/prediction/core';
import { createAmvObject, openAmvCase } from '@/lib/studio/amv/objectRegistry';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Evaluación MIHM (Fase 1, SFI-DT-INSTRUMENT-01) disparable desde ROOT.
 * No recalcula variables MIHM por su cuenta — reusa synthesizeStudioObject,
 * que ya las deriva de studio_object_features reales. Este endpoint solo
 * traduce esa síntesis al formato de core.ts y persiste el reporte.
 */

function toMihmVector(synthesis: Awaited<ReturnType<typeof synthesizeStudioObject>>): MihmVector {
  const find = (key: string) => synthesis.mihm.variables.find((item) => item.key === key)?.value ?? null;
  return {
    C_s: find('C_s'),
    D_i: find('D_i'),
    E_r: find('E_r'),
    G_f: find('G_f'),
    D_cog: find('D_cog'),
    Phi: find('Phi'),
    I_mc: find('I_mc'),
    F_s: find('F_s'),
    V_i: find('V_i'),
    // ihg_final es una variable territorial (Nodo AGS); no existe para objetos de /studio.
    // synthesis.mihm.ihg es el IHG derivado de las variables del objeto, no el mismo campo —
    // se deja MISSING a propósito en vez de mezclar ambos.
    ihg_final: null,
  };
}

export async function POST(request: Request) {
  const gate = await requireRootActor('amv.mihm_evaluate');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const objectId = typeof body.objectId === 'string' ? body.objectId.trim() : '';
  if (!objectId) return NextResponse.json({ ok: false, error: 'objectId_required' }, { status: 400 });

  const synthesis = await synthesizeStudioObject(objectId, { persist: false });
  if (synthesis.status === 'BLOCKED') {
    return NextResponse.json({ ok: false, blocked: true, reason: 'object_context_synthesis_blocked', synthesis }, { status: 200 });
  }

  const vector = toMihmVector(synthesis);
  const report = generatePhase1Report(vector, objectId, synthesis.objectTitle);

  // Registrar/reusar amv_object + amv_case + amv_prediction para trazabilidad longitudinal.
  const service = createServiceSupabaseClient();
  const { data: existingObject } = await service.from('amv_objects').select('id').eq('external_ref_table', 'studio_objects').eq('external_ref_id', objectId).maybeSingle();

  const amvObject = existingObject ?? await createAmvObject({
    objectClass: 'song',
    title: synthesis.objectTitle,
    externalRefTable: 'studio_objects',
    externalRefId: objectId,
  });

  const { data: existingCase } = await service.from('amv_cases').select('id').eq('object_id', amvObject.id).order('opened_at', { ascending: false }).limit(1).maybeSingle();
  const amvCase = existingCase ?? (await openAmvCase(amvObject.id, `CASE-${amvObject.id.slice(0, 8)}-${Date.now()}`, { notes: 'Abierto por evaluación MIHM desde ROOT.' })).case;

  const { data: prediction, error: predictionError } = await service.from('amv_predictions').insert({
    case_id: amvCase.id,
    pv: null,
    cip: null,
    confidence: report.metrics.MIHM_Global_Confidence_Provisional.value,
    state: report.status,
    model_version: 'phase1-core-v1',
    inputs_snapshot: { vector, report, synthesis },
  }).select('id').single();

  const audit = await auditRootAction({ actorId: gate.ctx.user.id, action: 'amv.mihm_evaluate', target: objectId, payload: { objectId, ranking: report.ranking, status: report.status }, request });
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });

  return NextResponse.json({
    ok: true,
    objectId,
    report,
    amvObjectId: amvObject.id,
    amvCaseId: amvCase.id,
    amvPredictionId: predictionError ? null : prediction?.id ?? null,
    persistenceWarning: predictionError ? predictionError.message : null,
    audit,
  }, { status: 201 });
}
