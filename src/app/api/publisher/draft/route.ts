import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type DraftRequest = {
  topic?: string;
  source?: string;
  observation?: string;
  audience?: 'medium' | 'linkedin' | 'report' | 'site';
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as DraftRequest;
  const topic = body.topic || 'Observación operacional SFI';
  const observation = body.observation || 'Se detectó una señal que requiere formalización antes de emisión pública.';
  const audience = body.audience || 'report';

  return NextResponse.json({
    ok: true,
    status: 'draft_generated_not_published',
    audience,
    draft: {
      title: topic,
      body: [
        'Identificación del fenómeno',
        observation,
        '',
        'Descomposición operativa',
        'La señal debe clasificarse por fuente, vector, régimen, riesgo y salida institucional.',
        '',
        'Cierre',
        'La observación queda registrada como borrador. No se publica sin aprobación humana.',
      ].join('\n'),
    },
  });
}
