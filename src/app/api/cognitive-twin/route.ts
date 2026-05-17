import { NextRequest, NextResponse } from 'next/server';
import { analyzeOperationalInput } from '@/observatory/operational/analysis';
import { logOperationalEvent } from '@/observatory/operational/storage';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const text = String(form.get('text') ?? '');
  const file = form.get('file');
  const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : undefined;

  const reading = analyzeOperationalInput({
    text,
    fileName: file instanceof File ? file.name : undefined,
    mimeType: file instanceof File ? file.type : undefined,
    buffer,
  });

  const cognitiveVector = {
    semanticDensity: reading.vector.R_sem,
    coherence: reading.vector.C_s,
    friction: reading.vector.F_s,
    latency: reading.ldi,
    identityTrace: reading.metadata.hash,
  };

  logOperationalEvent('cognitive_twin', { reading, cognitiveVector });

  return NextResponse.json({
    success: true,
    source: 'observatory/operational/analysis',
    cognitiveTwinService: 'available_not_invoked',
    reading,
    vector: cognitiveVector,
  });
}
