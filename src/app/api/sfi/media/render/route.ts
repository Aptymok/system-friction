import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type AssetType = 'text' | 'markdown' | 'json' | 'image' | 'video' | 'audio';

function normalizeAssets(value: unknown): AssetType[] {
  const allowed: AssetType[] = ['text', 'markdown', 'json', 'image', 'video', 'audio'];
  if (!Array.isArray(value)) return ['text'];
  const assets = value.filter((item): item is AssetType => allowed.includes(item as AssetType));
  return assets.length ? assets : ['text'];
}

function contentFor(type: AssetType, input: Record<string, unknown>, createdAt: string) {
  const prompt = typeof input.prompt === 'string' && input.prompt.trim() ? input.prompt.trim() : 'SFI operational material';
  const caseId = typeof input.case_id === 'string' && input.case_id.trim() ? input.case_id.trim() : 'SFI-OP-LOCAL';

  if (type === 'text') {
    return `Material deterministico local para ${caseId}: ${prompt}`;
  }

  if (type === 'markdown') {
    return `# SFI media render\n\n- case_id: ${caseId}\n- provider: deterministic\n- created_at: ${createdAt}\n\n${prompt}\n`;
  }

  if (type === 'json') {
    return {
      case_id: caseId,
      provider: 'deterministic',
      prompt,
      runtime_focus: input.runtime_focus ?? null,
      score_state: input.score_state ?? null,
      created_at: createdAt,
    };
  }

  return {
    status: 'not_generated_locally',
    requested_type: type,
    reason: 'No local image/video/audio provider is executed by this endpoint.',
    prompt,
  };
}

export async function POST(request: NextRequest) {
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const createdAt = new Date().toISOString();
  const assets = normalizeAssets(input.assets).map((type, index) => ({
    id: `sfi-media-${createdAt.replace(/[^0-9]/g, '')}-${index + 1}`,
    type,
    title: `SFI ${type} asset`,
    prompt: typeof input.prompt === 'string' ? input.prompt : '',
    content: contentFor(type, input, createdAt),
    created_at: createdAt,
  }));

  return NextResponse.json({
    ok: true,
    provider: 'deterministic',
    assets,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    provider: 'deterministic',
    assets: [],
    message: 'POST assets to render deterministic local material.',
  });
}
