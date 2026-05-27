import { NextResponse } from 'next/server';
import { guardedMultimediaProposal } from '@/lib/operational/multimedia';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const result = await guardedMultimediaProposal(
    'calendar.propose_jsonb',
    { ...body, type: 'calendar_payload', calendar_payload: body.calendar_payload ?? body },
    'calendar.payload.proposed',
    'calendar_payload',
  );

  if (!result.gate.ok) return NextResponse.json(result.gate.body, { status: result.gate.status });
  const proposal = result.proposal;
  if (!proposal) return NextResponse.json({ ok: false, error: 'proposal_not_created' }, { status: 400 });
  return NextResponse.json(proposal, { status: proposal.ok ? 201 : 400 });
}
