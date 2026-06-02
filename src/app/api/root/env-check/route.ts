// src/app/api/root/env-check/route.ts
import { NextResponse } from 'next/server';
import { requireRootActor } from '@/lib/root/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const gate = await requireRootActor('env.check');
  if (!gate.ok) return NextResponse.json(gate.body, { status: gate.status });

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  return NextResponse.json({
    ok: true,
    data: {
      hasServiceRoleKey: key.length > 0,
      serviceRoleKeyLength: key.length,
      serviceRoleEqualsAnon: key === anon,
      supabaseUrlPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      systemRootEmailPresent: Boolean(process.env.SYSTEM_ROOT_EMAIL),
    },
  });
}