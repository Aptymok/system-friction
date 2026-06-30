import fs from 'node:fs/promises';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { appendLogbookEntry } from '@/lib/logbook/query';
import { persistSfiMediaAssets } from '@/lib/sfi/persistence/sfiExecutionPersistence';
import { generateAsset } from '@/lib/sfi/media/providers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type AssetType = 'text' | 'markdown' | 'json' | 'image' | 'video' | 'audio';

const GENERATED_DIR = path.join(process.cwd(), 'public', 'generated', 'sfi-media');

function normalizeAssets(value: unknown): AssetType[] {
  const allowed: AssetType[] = ['text', 'markdown', 'json', 'image', 'video', 'audio'];
  if (!Array.isArray(value)) return ['markdown', 'json'];
  const assets = value.filter((item): item is AssetType => allowed.includes(item as AssetType));
  return assets.length ? assets : ['markdown', 'json'];
}

function safeSegment(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'sfi-media';
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

function caseIdFrom(input: Record<string, unknown>) {
  return typeof input.case_id === 'string' && input.case_id.trim() ? input.case_id.trim() : 'SFI-OP-LOCAL';
}

function promptFrom(input: Record<string, unknown>) {
  if (typeof input.prompt === 'string' && input.prompt.trim()) return input.prompt.trim();
  const request = input.request && typeof input.request === 'object' ? input.request as Record<string, unknown> : {};
  if (typeof request.text === 'string' && request.text.trim()) return request.text.trim();
  return 'SFI media render';
}

async function writeLocalFile(input: { type: 'markdown' | 'json'; caseId: string; prompt: string; createdAt: string }) {
  await fs.mkdir(GENERATED_DIR, { recursive: true });
  const stamp = input.createdAt.replace(/[^0-9]/g, '');
  const extension = input.type === 'markdown' ? 'md' : 'json';
  const fileName = `${safeSegment(input.caseId)}-${stamp}-${input.type}.${extension}`;
  const filePath = path.join(GENERATED_DIR, fileName);
  const content = input.type === 'markdown'
    ? `# SFI media draft\n\n- case_id: ${input.caseId}\n- created_at: ${input.createdAt}\n- approval: required\n\n${input.prompt}\n`
    : JSON.stringify({ case_id: input.caseId, created_at: input.createdAt, approval_required: true, prompt: input.prompt }, null, 2);
  await fs.writeFile(filePath, content, 'utf8');
  return {
    id: `sfi-media-${stamp}-${input.type}`,
    type: input.type,
    status: 'generated',
    provider_used: 'local',
    fallback_used: true,
    url: `/generated/sfi-media/${fileName}`,
    filePath,
    prompt: input.prompt,
    created_at: input.createdAt,
  };
}

async function writeBinaryAsset(input: { type: 'image' | 'video'; caseId: string; prompt: string; createdAt: string }) {
  const generated = await generateAsset({ type: input.type, prompt: input.prompt, caseId: input.caseId });
  await fs.mkdir(GENERATED_DIR, { recursive: true });
  const stamp = input.createdAt.replace(/[^0-9]/g, '');
  const extension = extensionFor(input.type, generated.mime);
  const fileName = `${safeSegment(input.caseId)}-${stamp}-${input.type}.${extension}`;
  const filePath = path.join(GENERATED_DIR, fileName);
  await fs.writeFile(filePath, generated.buffer);
  return {
    id: `sfi-media-${stamp}-${input.type}`,
    type: input.type,
    status: 'generated',
    provider_used: generated.provider,
    model: generated.model,
    fallback_used: false,
    url: `/generated/sfi-media/${fileName}`,
    filePath,
    mime: generated.mime,
    prompt: input.prompt,
    created_at: input.createdAt,
  };
}

export async function POST(request: NextRequest) {
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const createdAt = new Date().toISOString();
  const caseId = caseIdFrom(input);
  const prompt = promptFrom(input);
  const requestedAssets = normalizeAssets(input.assets ?? input.requested_assets);
  const assets: Record<string, Record<string, unknown>> = {};
  const output: Array<Record<string, unknown>> = [];
  const warnings: string[] = [];

  for (const type of requestedAssets) {
    try {
      if (type === 'markdown' || type === 'json') {
        const asset = await writeLocalFile({ type, caseId, prompt, createdAt });
        assets[type] = asset;
        output.push(asset);
      } else if (type === 'image' || type === 'video') {
        const asset = await writeBinaryAsset({ type, caseId, prompt, createdAt });
        assets[type] = asset;
        output.push(asset);
      } else if (type === 'text') {
        output.push({ id: `sfi-media-${createdAt.replace(/[^0-9]/g, '')}-text`, type, status: 'generated', provider_used: 'local', fallback_used: true, content: prompt, prompt, created_at: createdAt });
      } else {
        warnings.push('audio_generation_provider_not_configured');
        output.push({ id: `sfi-media-${createdAt.replace(/[^0-9]/g, '')}-audio`, type, status: 'render_failed', provider_used: 'degraded', fallback_used: true, error: 'audio_generation_provider_not_configured', prompt, created_at: createdAt });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : `${type}_render_failed`;
      warnings.push(`${type}:${message}`);
      output.push({ id: `sfi-media-${createdAt.replace(/[^0-9]/g, '')}-${type}`, type, status: 'render_failed', provider_used: 'degraded', fallback_used: true, error: message, prompt, created_at: createdAt });
    }
  }

  const persistence = await persistSfiMediaAssets({
    case_id: caseId,
    provider: 'sfi_media_router',
    prompt,
    media: {
      provider_used: 'sfi_media_router',
      fallback_used: warnings.length > 0,
      assets,
    },
  });

  await appendLogbookEntry({
    scope: 'root',
    visibility: 'root',
    case_id: caseId,
    event_type: 'sfi_media_render',
    title: 'SFI media render',
    summary: warnings.length ? 'SFI media render completed with degraded assets.' : 'SFI media render completed.',
    payload: { assets: output, warnings, persistence },
  }).catch(() => null);

  return NextResponse.json({
    ok: persistence.supabaseOk || persistence.all_persisted,
    status: warnings.length ? 'degraded' : 'generated',
    provider: 'sfi_media_router',
    assets: output,
    warnings,
    persistence,
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: '/api/sfi/media/render', canonical: true });
}
