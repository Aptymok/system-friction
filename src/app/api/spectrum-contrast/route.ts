import { NextRequest, NextResponse } from 'next/server';
import { analyzeOperationalInput, contrastWithSpectrum } from '@/observatory/operational/analysis';
import { logOperationalEvent } from '@/observatory/operational/storage';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const reading = body.reading ?? analyzeOperationalInput({ text: String(body.text ?? '') });
  const contrast = contrastWithSpectrum(reading);
  const log = logOperationalEvent('spectrum_contrast', { reading, contrast });

  return NextResponse.json({
    success: true,
    reading,
    contrast,
    bitacora: log,
  });
}
