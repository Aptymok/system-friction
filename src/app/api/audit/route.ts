import { NextRequest, NextResponse } from 'next/server';
import { LongitudinalAgent } from '@/lib/agents/longitudinal';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Sovereign Node not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { input } = body;

    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'No valid input provided for audit' }, { status: 400 });
    }

    // Ejecutar el proceso real (sin simulaciones)
    const result = await LongitudinalAgent.process(session.user.id, input);

    return NextResponse.json({
      success: result.status === 'completed',
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Audit API Error:', message)
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 })
  }
}