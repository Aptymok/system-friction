import crypto from 'crypto';

export async function fetchPublicPageSnapshot(url: string) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false as const, error: 'unsupported_snapshot_protocol' };
  }

  const response = await fetch(parsed.toString(), {
    headers: { 'user-agent': 'ScoreFriction/0.1 public low-volume snapshot' },
    next: { revalidate: 3600 },
  });
  const html = await response.text();
  return response.ok
    ? { ok: true as const, html, warning: 'snapshot_directional_not_ground_truth' }
    : { ok: false as const, error: `snapshot_http_${response.status}`, html };
}

export function hashSnapshot(html: string) {
  return crypto.createHash('sha256').update(html).digest('hex');
}

export function extractVisibleMetadata(html: string, url: string) {
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;
  const description = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() ?? null;
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() ?? null;
  return {
    url,
    title: ogTitle ?? title,
    description,
    snapshot_hash: hashSnapshot(html),
    warning: 'snapshot_directional_not_ground_truth',
  };
}
