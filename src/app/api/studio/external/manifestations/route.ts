import { NextResponse } from 'next/server';
import { listOwnerManifestations } from '@/lib/sfi/artifacts/artifactRegistry';
import { requireAuthenticatedUser } from '@/lib/system/access/server';

export async function GET(request: Request) {
  const { user } = await requireAuthenticatedUser();
  const url = new URL(request.url);
  const scopeKey = url.searchParams.get('scopeKey');
  const manifestations = await listOwnerManifestations(user.id, scopeKey);
  return NextResponse.json({ ok: true, manifestations });
}
