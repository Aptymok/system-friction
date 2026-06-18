import { NextResponse } from 'next/server';
import { buildDerivedMihmRuntime } from '@/lib/evaluator/derivedMihmRuntime';

export const dynamic = 'force-dynamic';

export async function GET() {
  const runtime = await buildDerivedMihmRuntime();

  return NextResponse.json({
    ok: true,
    data: {
      analyses: [],
      runtime,
      warnings: runtime.warnings ?? [],
    },
  });
}
