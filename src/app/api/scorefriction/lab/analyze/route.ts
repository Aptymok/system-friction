import { NextRequest, NextResponse } from 'next/server';
import { appendAmvLearning } from '@/lib/amv/learning';
import { appendLogbookEntry } from '@/lib/logbook/query';
import { analyzeSfiLabInput } from '@/lib/sfi-psi/analyzer';
import { saveSfiLabAnalysis } from '@/lib/sfi-psi/store';
import type { SfiFileMetadata, SfiLabAnalyzeInput } from '@/lib/sfi-psi/types';

export const dynamic = 'force-dynamic';

function asTags(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [];
}

async function inputFromRequest(request: NextRequest): Promise<SfiLabAnalyzeInput> {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    const file = form.get('file');
    const metadata: SfiFileMetadata | null = file instanceof File ? { name: file.name, type: file.type, size: file.size, lastModified: file.lastModified } : null;
    const fileText = file instanceof File && file.type.startsWith('text/') ? await file.text().catch(() => '') : '';
    return {
      text: String(form.get('text') ?? fileText ?? ''),
      mode: String(form.get('mode') ?? 'detect_signals'),
      source: String(form.get('source') ?? metadata?.name ?? 'scorefriction-lab-upload'),
      tags: asTags(form.get('tags')),
      file: metadata,
    };
  }
  if (contentType.includes('text/plain')) {
    return { text: await request.text(), mode: 'detect_signals', source: 'scorefriction-lab-text', tags: [], file: null };
  }
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  return {
    text: typeof body.text === 'string' ? body.text : '',
    mode: body.mode as string | undefined,
    source: typeof body.source === 'string' ? body.source : 'scorefriction-lab-json',
    tags: asTags(body.tags),
    file: body.file && typeof body.file === 'object' ? body.file as SfiFileMetadata : null,
  };
}

export async function POST(request: NextRequest) {
  const input = await inputFromRequest(request);
  const analysis = analyzeSfiLabInput(input);
  const persistence = await saveSfiLabAnalysis(analysis);
  await appendAmvLearning({
    case_id: analysis.analysisId,
    source: 'scorefriction.lab.analyze',
    event_type: 'lab_analysis',
    summary: `SFI-LAB detecto ${analysis.signals.length} senales y ${analysis.nodes.length} nodos.`,
    payload: { analysis, persistence },
  });
  await appendLogbookEntry({
    scope: 'scorefriction',
    visibility: 'root',
    case_id: analysis.analysisId,
    event_type: 'lab_analysis',
    title: 'SFI-LAB analysis',
    summary: `Analisis SFI-LAB registrado: ${analysis.reappearances.length} reapariciones.`,
    payload: { analysis, persistence },
  });
  return NextResponse.json({ ...analysis, persistence });
}

