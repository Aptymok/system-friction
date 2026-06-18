import fs from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { appendLogbookEntry } from '@/lib/logbook/query';
import { generateAsset } from '@/lib/sfi/media/providers';

export const dynamic = 'force-dynamic';

type AssetType = 'text' | 'markdown' | 'json' | 'image' | 'video' | 'audio';

const GENERATED_DIR = path.join(process.cwd(), 'public', 'generated', 'sfi-media');

function normalizeAssets(value: unknown): AssetType[] {
  const allowed: AssetType[] = ['text', 'markdown', 'json', 'image', 'video', 'audio'];
  if (!Array.isArray(value)) return ['text'];
  const assets = value.filter((item): item is AssetType => allowed.includes(item as AssetType));
  return assets.length ? assets : ['text'];
}

function safeSegment(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'scorefriction-media';
}

function extensionFor(type: 'image' | 'video', mime: string) {
  if (type === 'image') {
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    if (mime.includes('webp')) return 'webp';
    return 'png';
  }
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('quicktime')) return 'mov';
  return 'mp4';
}

function promptFrom(input: Record<string, unknown>) {
  return typeof input.prompt === 'string' && input.prompt.trim() ? input.prompt.trim() : 'ScoreFriction media render';
}

function caseIdFrom(input: Record<string, unknown>) {
  return typeof input.case_id === 'string' && input.case_id.trim() ? input.case_id.trim() : 'SFI-OP-LOCAL';
}

function localAsset(type: 'text' | 'markdown' | 'json' | 'audio', input: Record<string, unknown>, createdAt: string, index: number) {
  const prompt = promptFrom(input);
  const caseId = caseIdFrom(input);
  const id = `scorefriction-media-${createdAt.replace(/[^0-9]/g, '')}-${index + 1}`;
  if (type === 'text') return { id, type, status: 'generated', provider: 'local', model: 'deterministic-text', content: `Material ScoreFriction para ${caseId}: ${prompt}`, created_at: createdAt, prompt };
  if (type === 'markdown') return { id, type, status: 'generated', provider: 'local', model: 'deterministic-markdown', content: `# ScoreFriction media render\n\n- case_id: ${caseId}\n- created_at: ${createdAt}\n\n${prompt}\n`, created_at: createdAt, prompt };
  if (type === 'json') return { id, type, status: 'generated', provider: 'local', model: 'deterministic-json', content: { case_id: caseId, prompt, created_at: createdAt }, created_at: createdAt, prompt };
  return { id, type, status: 'render_failed', provider: 'diagnostic', model: 'none', error: 'audio_generation_provider_not_configured', created_at: createdAt, prompt };
}

async function writeExternalAsset(input: { type: 'image' | 'video'; caseId: string; prompt: string; createdAt: string; index: number }) {
  const generated = await generateAsset({ type: input.type, prompt: input.prompt, caseId: input.caseId });
  const extension = extensionFor(input.type, generated.mime);
  const timestamp = input.createdAt.replace(/[^0-9]/g, '');
  const fileName = `${safeSegment(input.caseId)}-${timestamp}-${input.type}.${extension}`;
  const filePath = path.join(GENERATED_DIR, fileName);
  await fs.mkdir(GENERATED_DIR, { recursive: true });
  await fs.writeFile(filePath, generated.buffer);
  return { id: `scorefriction-media-${timestamp}-${input.index + 1}`, type: input.type, status: 'generated', provider: generated.provider, model: generated.model, url: `/generated/sfi-media/${fileName}`, mime: generated.mime, created_at: input.createdAt, prompt: input.prompt };
}

export async function POST(request: NextRequest) {
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const createdAt = new Date().toISOString();
  const prompt = promptFrom(input);
  const caseId = caseIdFrom(input);
  const requestedAssets = normalizeAssets(input.assets);
  const assets = [];
  const warnings: string[] = [];

  for (let index = 0; index < requestedAssets.length; index += 1) {
    const type = requestedAssets[index];
    try {
      assets.push(type === 'image' || type === 'video' ? await writeExternalAsset({ type, caseId, prompt, createdAt, index }) : localAsset(type, input, createdAt, index));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'external_render_unavailable';
      warnings.push(message);
      assets.push({ id: `scorefriction-media-${createdAt.replace(/[^0-9]/g, '')}-${index + 1}`, type, status: 'render_failed', provider: 'provider_unavailable', model: 'none', error: message, remediation: 'Configurar proveedor real Hugging Face o Google para render binario.', created_at: createdAt, prompt });
    }
  }

  const ok = assets.every((asset) => asset.type !== 'image' && asset.type !== 'video' || asset.status === 'generated');
  await appendLogbookEntry({
    scope: 'scorefriction',
    visibility: 'root',
    case_id: caseId,
    event_type: 'media_render',
    title: 'ScoreFriction media render',
    summary: ok ? 'Media render genero assets solicitados.' : 'Media render fallo en al menos un asset binario.',
    payload: { assets, warnings },
  });
  return NextResponse.json({ ok, status: ok ? 'generated' : 'render_failed', provider: ok ? 'external/local' : 'degraded', assets, warnings });
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: '/api/scorefriction/media/render', canonical: true });
}

