import { NextRequest, NextResponse } from 'next/server';
import { analyzeOperationalInput } from '@/observatory/operational/analysis';
import { getOperationalMemory, saveObjective } from '@/observatory/operational/storage';

export async function GET() {
  return NextResponse.json(getOperationalMemory());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const title = String(body.title ?? '').trim();
  const description = String(body.description ?? '').trim();

  if (!title || !description) {
    return NextResponse.json({ error: 'title_and_description_required' }, { status: 400 });
  }

  const reading = analyzeOperationalInput({ text: `${title}\n${description}` });
  const objective = saveObjective({
    title,
    description,
    dueAt: body.dueAt ? String(body.dueAt) : null,
    reading,
  });

  return NextResponse.json({
    success: true,
    objective,
    metrics: { ihg: reading.ihg, nti: reading.nti, ldi: reading.ldi },
    calendar: {
      dueAt: objective.dueAt,
      operationalWindow: reading.ldi > 0.55 ? 'short' : 'standard',
    },
    coordinates: {
      x: reading.ihg,
      y: reading.nti,
      z: reading.ldi,
    },
  });
}
