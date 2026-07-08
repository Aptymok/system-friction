import { NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export async function GET() {
  const result: any = {
    env: {
      hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    checks: {},
  };

  try {
    const supabase = createServiceSupabaseClient();

    const { data: session, error: sessionError } = await supabase
      .from('studio_sessions')
      .insert({ title: 'debug api session', status: 'active' })
      .select('*')
      .single();

    result.insertSession = sessionError ? { ok: false, error: sessionError } : { ok: true, data: session };

    if (session?.id) {
      const { data: object, error: objectError } = await supabase
        .from('studio_objects')
        .insert({
          session_id: session.id,
          title: 'debug api object',
          object_type: 'music',
          mime_type: 'audio/mpeg',
          size_bytes: 12345,
          source_uri: 'debug/api-test.mp3',
          status: 'uploaded',
        })
        .select('*')
        .single();

      result.insertObject = objectError ? { ok: false, error: objectError } : { ok: true, data: object };
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        fatal: error instanceof Error ? error.message : String(error),
        result,
      },
      { status: 500 }
    );
  }
}
