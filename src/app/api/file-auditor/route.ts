import { NextRequest, NextResponse } from 'next/server';
import { analyzeOperationalInput } from '@/observatory/operational/analysis';
import { logOperationalEvent } from '@/observatory/operational/storage';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file');
  const text = String(form.get('text') ?? '');

  if (!(file instanceof File) && !text.trim()) {
    return NextResponse.json({ error: 'file_or_text_required' }, { status: 400 });
  }

  const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : undefined;
  const reading = analyzeOperationalInput({
    text,
    fileName: file instanceof File ? file.name : undefined,
    mimeType: file instanceof File ? file.type : undefined,
    buffer,
  });

  logOperationalEvent('file_auditor_mihm', reading);

  return NextResponse.json({
    success: true,
    ...reading,
  });
}
