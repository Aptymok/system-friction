import { NextResponse } from 'next/server'
import { createCulturalSignalObject, type CulturalSignalObject } from '@/lib/scorefriction/cultural-signal-object'
import { applyPhenomenonMapping, mapCulturalObjectToPhenomenon } from '@/lib/scorefriction/phenomenon-mapper'

export const dynamic = 'force-dynamic'

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export async function POST(request: Request) {
  const body = record(await request.json().catch(() => ({})))
  const caseId = str(body.caseId ?? body.case_id, `SF-${Date.now().toString(36)}`)
  const label = str(body.label ?? body.title ?? body.sourceUrl, 'cultural-signal-object')

  const object = createCulturalSignalObject({
    ...(body as Partial<CulturalSignalObject>),
    caseId,
    label,
    territory: str(body.territory, 'UNSPECIFIED'),
    sourceUrl: str(body.sourceUrl ?? body.url) || undefined,
    worldSpectVector: record(body.worldSpectVector),
    mihmVector: record(body.mihmVector) as Record<string, number>,
    frictionVector: record(body.frictionVector) as Record<string, number>,
    culturalVector: record(body.culturalVector) as Record<string, number>,
  })

  const mapping = mapCulturalObjectToPhenomenon(object)
  const mapped = applyPhenomenonMapping(object)

  return NextResponse.json({
    ok: true,
    object: mapped,
    phenomenon: mapping,
    policy: {
      sourceIsEvidence: true,
      urlIsEvidence: true,
      promoteOnlyWithDensityPersistenceTrust: true,
    },
  })
}
