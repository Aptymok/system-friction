import { NextRequest, NextResponse } from 'next/server';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

const AUTH_HEADER = 'authorization';
const BEARER_PREFIX = 'Bearer ';
const INGEST_SECRET = process.env.WORLDSPECT_INGEST_SECRET;

function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized Seat' }, { status: 401 });
}

function badRequestResponse(message = 'invalid_payload') {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: NextRequest) {
  if (!INGEST_SECRET) {
    return NextResponse.json(
      { error: 'server_configuration_missing' },
      { status: 500 }
    );
  }

  const authorization = request.headers.get(AUTH_HEADER);
  if (!authorization || !authorization.startsWith(BEARER_PREFIX)) {
    return unauthorizedResponse();
  }

  const token = authorization.slice(BEARER_PREFIX.length).trim();
  if (!token || token !== INGEST_SECRET) {
    return unauthorizedResponse();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return badRequestResponse('invalid_json');
  }

  if (typeof payload !== 'object' || payload === null) {
    return badRequestResponse('payload_must_be_object');
  }

  const body = payload as Record<string, unknown>;
  const requiredKeys = ['Wmacro', 'NTI', 'feeds_parsed'] as const;

  for (const key of requiredKeys) {
    if (!(key in body)) {
      return badRequestResponse(`missing_${key}`);
    }
  }

  const wmacro = body.Wmacro;
  const nti = body.NTI;
  const feedsParsed = body.feeds_parsed;

  if (typeof wmacro !== 'number' || Number.isNaN(wmacro)) {
    return badRequestResponse('invalid_Wmacro');
  }

  if (typeof nti !== 'number' || Number.isNaN(nti)) {
    return badRequestResponse('invalid_NTI');
  }

  if (!Array.isArray(feedsParsed)) {
    return badRequestResponse('invalid_feeds_parsed');
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from('worldspect_snapshots')
    .insert([
      {
        Wmacro: wmacro,
        NTI: nti,
        feeds_parsed: feedsParsed,
        payload: body,
        observed_at: new Date().toISOString(),
      },
    ])
    .select('*')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: 'saved', snapshot: data }, { status: 200 });
}
