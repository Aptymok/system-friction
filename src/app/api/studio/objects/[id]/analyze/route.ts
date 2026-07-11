import { NextResponse } from 'next/server';
import { analyzeStudioAudioObject } from '@/lib/studio/audio/analyzeStudioAudioObject';
import { isStudioAudioError, toStudioAudioApiError } from '@/lib/studio/audio/audioErrors';
import { createServerSupabaseClient } from '@/runtime/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function POST(request: Request, ctx: RouteContext) {
  const params = await Promise.resolve(ctx.params);
  const objectId = decodeURIComponent(params.id);

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        error: 'AUTH_REQUIRED',
        details: authError?.message ?? 'Authenticated Studio session required.',
      }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as { force?: unknown };
    const result = await analyzeStudioAudioObject(objectId, {
      force: body.force === true,
      requestedByUserId: user.id,
    });

    return NextResponse.json(result, { status: result.reused ? 200 : 202 });
  } catch (error) {
    const body = toStudioAudioApiError(error);
    const status = isStudioAudioError(error) ? error.status : 500;
    return NextResponse.json(body, { status });
  }
}
