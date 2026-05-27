import { NextResponse } from 'next/server';
import { guardedMultimediaProposal, normalizeMultimediaInput } from '@/lib/operational/multimedia';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const normalized = normalizeMultimediaInput(body);
  if (!normalized.ok) return NextResponse.json(normalized, { status: 400 });

  const result = await guardedMultimediaProposal('multimedia.propose', body, 'multimedia.proposed');
  if (!result.gate.ok) return NextResponse.json(result.gate.body, { status: result.gate.status });
  const proposal = result.proposal;
  if (!proposal) return NextResponse.json({ ok: false, error: 'proposal_not_created' }, { status: 400 });
  return NextResponse.json(proposal, { status: proposal.ok ? 201 : 400 });
}
