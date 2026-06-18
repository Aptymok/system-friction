import { NextRequest, NextResponse } from 'next/server';
import { createScoreFrictionIntake } from '@/lib/scorefriction/intake';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createScoreFrictionIntake(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        patch: 'P07',
        error: 'scorefriction_intake_failed',
        detail: error instanceof Error ? error.message : 'unknown_error'
      },
      { status: 400 }
    );
  }
}
