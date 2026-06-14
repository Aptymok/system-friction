import { NextResponse } from 'next/server';
import { SFI_OPERATIONAL_ORGANS, getOperationalRegime } from '@/lib/operational/organs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const organs = SFI_OPERATIONAL_ORGANS;
  const now = new Date().toISOString();

  return NextResponse.json({
    ok: true,
    generated_at: now,
    systemRegime: getOperationalRegime(organs),
    statement: 'SFI operational membrane: organs are declared, state is centralized, circulation is not yet fully automated.',
    organs,
    latestObservation: {
      source: 'operational-state',
      summary: 'El sistema tiene órganos vivos, pero la circulación central todavía debe conectarse a datos reales persistentes.',
    },
    latestDecision: {
      decision: 'No entregar motor generador completo sin gobernanza de acceso.',
      reason: 'El núcleo generador es activo institucional, no material promocional.',
    },
    latestPublication: null,
    latestOpportunity: null,
    nextPatch: 'P02: conectar operational-state con eventos, ScoreFriction state, MIHM output y bitácora persistente.',
  });
}
