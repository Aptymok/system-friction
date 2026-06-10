import { recordScoreFrictionObservation } from '../store';

function text(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function num(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function resolveSoundCloudClientId() {
  const page = await fetch('https://soundcloud.com', {
    headers: { 'user-agent': 'ScoreFriction/0.1 low-volume cultural observatory' },
    next: { revalidate: 3600 },
  }).then((res) => res.text());
  const scriptUrls = Array.from(page.matchAll(/<script[^>]+src="([^"]+\.js)"/g)).map((match) => match[1]);

  for (const url of scriptUrls.slice(-8).reverse()) {
    const source = await fetch(url, {
      headers: { 'user-agent': 'ScoreFriction/0.1 low-volume cultural observatory' },
      next: { revalidate: 3600 },
    }).then((res) => res.text()).catch(() => '');
    const found = source.match(/client_id[=:]"([a-zA-Z0-9]{20,})"/) ?? source.match(/client_id:"([a-zA-Z0-9]{20,})"/);
    if (found?.[1]) return found[1];
  }

  return null;
}

async function soundCloudGet(path: string, params: Record<string, string | number | undefined>) {
  const clientId = await resolveSoundCloudClientId();
  if (!clientId) return { ok: false as const, error: 'soundcloud_client_id_not_ready' };
  const url = new URL(`https://api-v2.soundcloud.com${path}`);
  url.searchParams.set('client_id', clientId);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, {
    headers: { 'user-agent': 'ScoreFriction/0.1 low-volume cultural observatory' },
    next: { revalidate: 900 },
  });
  const data = await response.json().catch(() => null);
  return response.ok ? { ok: true as const, data } : { ok: false as const, error: `soundcloud_http_${response.status}`, data };
}

export function searchSoundCloudTracks(query: string) {
  return soundCloudGet('/search/tracks', { q: query, limit: 10, linked_partitioning: 1 });
}

export function getSoundCloudTrack(trackId: string | number) {
  return soundCloudGet(`/tracks/${trackId}`, {});
}

export function getSoundCloudComments(trackId: string | number) {
  return soundCloudGet(`/tracks/${trackId}/comments`, { limit: 50, linked_partitioning: 1 });
}

export async function getSoundCloudWaveform(trackId: string | number) {
  const track = await getSoundCloudTrack(trackId);
  if (!track.ok || !track.data || typeof track.data !== 'object') return track;
  return { ok: true as const, data: (track.data as Record<string, unknown>).waveform_url ?? null };
}

export function normalizeSoundCloudTrack(payload: Record<string, unknown>, comments: unknown[] = []) {
  const user = payload.user && typeof payload.user === 'object' ? payload.user as Record<string, unknown> : {};
  return {
    title: text(payload.title),
    artist: text(user.username),
    genre: text(payload.genre),
    tag_list: text(payload.tag_list),
    description: text(payload.description),
    duration: num(payload.duration),
    playback_count: num(payload.playback_count),
    likes_count: num(payload.likes_count),
    reposts_count: num(payload.reposts_count),
    comment_count: num(payload.comment_count),
    waveform_url: text(payload.waveform_url),
    comments,
  };
}

export function deriveSoundCloudSignals(normalized: Record<string, unknown>) {
  const comments = Array.isArray(normalized.comments) ? normalized.comments : [];
  const playback = Math.max(1, num(normalized.playback_count));
  const likes = num(normalized.likes_count);
  const reposts = num(normalized.reposts_count);
  const commentCount = num(normalized.comment_count) || comments.length;
  const tagCount = text(normalized.tag_list)?.split(/\s+/).filter(Boolean).length ?? 0;

  return {
    scene_emergence_score: Math.min(1, (reposts / playback) * 12 + (commentCount / playback) * 8 + Math.min(0.3, tagCount / 30)),
    timestamped_reaction_density: Math.min(1, comments.filter((item) => item && typeof item === 'object' && 'timestamp' in item).length / Math.max(1, comments.length)),
    drop_reaction_points: comments.filter((item) => JSON.stringify(item).match(/drop|entra|beat|bajo|hook/i)).slice(0, 12),
    genre_tag_drift: Math.min(1, tagCount / 18),
    underground_signal_strength: Math.min(1, ((likes + reposts + commentCount) / playback) * 6),
  };
}

export async function observeSoundCloudTrack(input: { case_id?: string; trackId?: string | number; source_url?: string; territory?: string }) {
  if (!input.trackId) return { ok: false as const, error: 'trackId_required' };
  const [track, comments] = await Promise.all([getSoundCloudTrack(input.trackId), getSoundCloudComments(input.trackId)]);
  if (!track.ok || !track.data || typeof track.data !== 'object') return track;
  const commentCollection = comments.ok && comments.data && typeof comments.data === 'object' && Array.isArray((comments.data as Record<string, unknown>).collection)
    ? (comments.data as Record<string, unknown>).collection as unknown[]
    : [];
  const normalized = normalizeSoundCloudTrack(track.data as Record<string, unknown>, commentCollection);
  return recordScoreFrictionObservation({
    case_id: input.case_id,
    source_name: 'soundcloud_public_v2',
    source_url: input.source_url ?? text((track.data as Record<string, unknown>).permalink_url),
    territory: input.territory ?? 'MX',
    raw_payload: { ...track.data as Record<string, unknown>, comments: commentCollection, derived: deriveSoundCloudSignals(normalized) },
  });
}
