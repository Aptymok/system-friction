import { NextResponse } from 'next/server'
import { createBootstrapAdapter } from '@/lib/worldspect/adapters/bootstrap-adapter'
import { WORLDSPECT_SOURCE_REGISTRY } from '@/lib/worldspect/source-registry'

export const dynamic = 'force-dynamic'

export async function GET() {
  const observations = await Promise.all(WORLDSPECT_SOURCE_REGISTRY.map((definition) => createBootstrapAdapter(definition).observe()))
  const checks = observations.map((observation) => ({
    sourceId: observation.sourceId,
    domain: observation.domain,
    status: observation.status,
    error: observation.error,
  }))
  const blocking = checks.filter((check) => check.status === 'DEGRADED_BLOCKING')
  return NextResponse.json({
    ok: blocking.length === 0,
    status: blocking.length ? 'DEGRADED_BLOCKING' : 'BOOTSTRAPPED',
    checks,
  }, { status: blocking.length ? 500 : 200 })
}
