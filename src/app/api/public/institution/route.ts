import { NextResponse } from 'next/server';
import { SFI_PUBLIC_PROFILE } from '@/lib/public/institutionProfile';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, data: SFI_PUBLIC_PROFILE });
}
