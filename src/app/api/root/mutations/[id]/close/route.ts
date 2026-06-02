import { NextResponse } from 'next/server';
import { auditRootAction, requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireRootActor('mutation.close');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const outcome = {
    closedBy: gate.ctx.user.id,
    closedAt: new Date().toISOString(),
    result: typeof body.result === 'string' && body.result.trim() ? body.result.trim() : 'closed_from_root_console',
  };

  const existing = await gate.ctx.service
    .from('logbook_mutations')
    .select('payload')
    .eq('id', id)
    .maybeSingle();
  if (existing.error) return NextResponse.json({ ok: false, error: 'mutation_lookup_failed', details: existing.error.message }, { status: 400 });

  const currentPayload = existing.data?.payload && typeof existing.data.payload === 'object' && !Array.isArray(existing.data.payload)
    ? existing.data.payload as Record<string, unknown>
    : {};

  const { data, error } = await gate.ctx.service
    .from('logbook_mutations')
    .update({
      status: 'closed',
      updated_at: outcome.closedAt,
      payload: {
        ...currentPayload,
        outcome,
      },
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ ok: false, error: 'mutation_close_failed', details: error.message }, { status: 400 });

  const audit = await auditRootAction({
    actorId: gate.ctx.user.id,
    action: 'mutation.close',
    target: 'logbook_mutations',
    payload: { mutationId: id, outcome },
    request: req,
  });
  if (!audit.ok) return NextResponse.json(audit, { status: 500 });

  return NextResponse.json({ ok: true, data, audit });
}
