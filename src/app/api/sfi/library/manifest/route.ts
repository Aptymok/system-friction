import { NextResponse } from 'next/server';
import { getSfiLibraryManifest } from '@/lib/sfi/library/manifest';

export const dynamic = 'force-static';

export async function GET() {
  return NextResponse.json({
    ok: true,
    manifest: getSfiLibraryManifest(),
  });
}
