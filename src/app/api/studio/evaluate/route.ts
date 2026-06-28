import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceSupabaseClient } from '@/runtime/supabase/server';
import { buildStudioEvaluationReport, type StudioEvaluateInput, type StudioObjectKind } from '@/lib/studio/evaluation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function numberOrNull(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isStudioKind(value: unknown): value is StudioObjectKind {
  return value === 'melody'
    || value === 'beat'
    || value === 'loop'
    || value === 'demo'
    || value === 'REM618'
    || value === 'reference'
    || value === 'client_note'
    || value === 'instagram_signal';
}

function isRootRouteUser(role?: string | null, email?: string | null) {
  const rootEmail = process.env.SYSTEM_ROOT_EMAIL;
  return role === 'root'
    || role === 'system'
    || Boolean(rootEmail && email && email.toLowerCase() === rootEmail.toLowerCase());
}

function isStudioRouteUser(role?: string | null, email?: string | null) {
  if (isRootRouteUser(role, email)) return true;
  const allowed = (process.env.STUDIO_AUTHORIZED_EMAILS || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(email && allowed.includes(email.toLowerCase()));
}

async function authorizeStudio() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { ok: false as const, response: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }) };

  let role: string | null = null;
  try {
    const service = createServiceSupabaseClient();
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    role = typeof profile?.role === 'string' ? profile.role : null;
  } catch {
    role = null;
  }

  if (!isStudioRouteUser(role, user.email)) {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: 'studio_forbidden' }, { status: 403 }) };
  }

  return { ok: true as const, user };
}

function sanitizeInput(body: unknown): StudioEvaluateInput | null {
  if (!isRecord(body)) return null;
  const project = isRecord(body.project) ? body.project : {};
  const audioMetadata = isRecord(body.audio_metadata) ? body.audio_metadata : isRecord(body.audioMetadata) ? body.audioMetadata : {};
  const audioFeatures = isRecord(body.audio_features) ? body.audio_features : isRecord(body.audioFeatures) ? body.audioFeatures : {};
  const objectKind = isStudioKind(body.object_kind) ? body.object_kind : isStudioKind(body.objectKind) ? body.objectKind : 'demo';

  return {
    object_id: stringValue(body.object_id ?? body.objectId, `studio-object-${Date.now()}`),
    object_kind: objectKind,
    project: {
      title: stringValue(project.title, 'Proyecto sin titulo'),
      referenceGenre: stringValue(project.referenceGenre ?? project.reference_genre),
      currentState: stringValue(project.currentState ?? project.current_state),
      deadline: stringValue(project.deadline),
      notes: stringValue(project.notes ?? project.note),
      instagramSignal: stringValue(project.instagramSignal ?? project.instagram_signal),
    },
    audio_metadata: {
      fileName: stringValue(audioMetadata.fileName ?? audioMetadata.file_name),
      size: numberOrNull(audioMetadata.size),
      mime: stringValue(audioMetadata.mime),
      duration: numberOrNull(audioMetadata.duration),
    },
    audio_features: {
      sampleRate: numberOrNull(audioFeatures.sampleRate ?? audioFeatures.sample_rate),
      channelCount: numberOrNull(audioFeatures.channelCount ?? audioFeatures.channel_count),
      duration: numberOrNull(audioFeatures.duration),
      peak: numberOrNull(audioFeatures.peak),
      rms: numberOrNull(audioFeatures.rms),
      clippingRisk: numberOrNull(audioFeatures.clippingRisk ?? audioFeatures.clipping_risk),
      silenceStartSeconds: numberOrNull(audioFeatures.silenceStartSeconds ?? audioFeatures.silence_start_seconds),
      silenceEndSeconds: numberOrNull(audioFeatures.silenceEndSeconds ?? audioFeatures.silence_end_seconds),
      energySegments: Array.isArray(audioFeatures.energySegments)
        ? audioFeatures.energySegments.map(Number).filter(Number.isFinite)
        : Array.isArray(audioFeatures.energy_segments)
          ? audioFeatures.energy_segments.map(Number).filter(Number.isFinite)
          : [],
      dynamicRange: numberOrNull(audioFeatures.dynamicRange ?? audioFeatures.dynamic_range),
      structureNote: stringValue(audioFeatures.structureNote ?? audioFeatures.structure_note),
      extractionMode: audioFeatures.extractionMode === 'web_audio' || audioFeatures.extractionMode === 'metadata_only' || audioFeatures.extractionMode === 'not_available'
        ? audioFeatures.extractionMode
        : 'not_available',
    },
  };
}

export async function POST(request: NextRequest) {
  const auth = await authorizeStudio();
  if (!auth.ok) return auth.response;

  const input = sanitizeInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ ok: false, error: 'invalid_studio_evaluate_payload' }, { status: 400 });

  const result = await buildStudioEvaluationReport(input);
  return NextResponse.json(result);
}
