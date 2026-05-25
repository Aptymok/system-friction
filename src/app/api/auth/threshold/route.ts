import { NextRequest, NextResponse } from 'next/server';
import { getServerUserContext } from '@/lib/server/productionBackend';

export async function POST(req: NextRequest) {
  const { user, service } = await getServerUserContext();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { data: nodes } = await service
    .from('nodes')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  await service.from('cognitive_event_stream').insert({
    node_id: nodes?.[0]?.id || null,
    stream_type: 'auth_threshold',
    event_name: 'observer_threshold_crossed',
    payload: {
      email_hash: body.email_hash || null,
      telemetry: body.telemetry || {},
      access_mode: 'observer_initialization',
      environment: 'production',
    },
    emitted_by: 'api/auth/threshold',
  });

  return NextResponse.json({ status: 'ok' });
}
