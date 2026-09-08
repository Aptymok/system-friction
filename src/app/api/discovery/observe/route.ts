import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthenticatedUser } from '@/lib/system/access/server';
import { persistDiscoveryObservation, readDiscoveryRun } from '@/lib/discovery/discoveryRepository';
import { SFI_DISCOVERY_AVAILABILITY, SFI_DISCOVERY_MODES } from '@/lib/discovery/discoveryMesh';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const sourceSchema = z.object({
  sourceId: z.string().trim().min(1).max(500),
  sourceUrl: z.string().trim().url().max(2000).nullable(),
  publisher: z.string().trim().max(500).nullable(),
  platform: z.string().trim().min(1).max(200),
  providerClass: z.enum(['SEARCH','AI','ACADEMIC','FEED','OTHER']),
  independent: z.boolean(),
}).strict();
const retrievalSchema = z.object({
  observationId: z.string().trim().min(1).max(500),
  source: sourceSchema,
  observedAt: z.string().datetime(),
  query: z.string().trim().min(1).max(2000),
  unbranded: z.boolean(),
  retrieved: z.boolean().nullable(),
  attributedEntityName: z.string().trim().max(500).nullable().optional(),
  attributedDomain: z.string().trim().max(2000).nullable().optional(),
  citedCanonicalUrl: z.string().trim().max(2000).nullable().optional(),
  reconstructedFields: z.object({
    name: z.string().trim().max(500).optional(),
    domain: z.string().trim().max(2000).optional(),
    entityId: z.string().trim().max(2000).optional(),
    descriptor: z.string().trim().max(2000).optional(),
  }).strict().optional(),
  references: z.array(z.object({ url: z.string().url().max(2000), independent: z.boolean() }).strict()).max(200).optional(),
  collisions: z.array(z.object({ dimension: z.enum(['NAME','DOMAIN','METHOD','ENTITY']), observed: z.boolean(), value: z.string().max(2000).nullable() }).strict()).max(100).optional(),
  propagationPlatforms: z.array(z.string().trim().min(1).max(200)).max(100).optional(),
  status: z.enum(SFI_DISCOVERY_AVAILABILITY).optional(),
}).strict();
const feedSchema = z.object({
  id: z.string().max(500).nullable().optional(),
  url: z.string().max(2000).nullable().optional(),
  title: z.string().max(1000).nullable().optional(),
  summary: z.string().max(5000).nullable().optional(),
  publisher: z.string().max(500).nullable().optional(),
  publishedAt: z.string().max(100).nullable().optional(),
  platform: z.string().trim().min(1).max(200),
}).strict();
const observeSchema = z.object({
  mode: z.enum(SFI_DISCOVERY_MODES),
  query: z.string().trim().min(1).max(2000),
  intent: z.string().trim().max(1000).nullable().optional(),
  retrievalObservations: z.array(retrievalSchema).max(500).optional(),
  feedItems: z.array(feedSchema).max(500).optional(),
}).strict();

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const status = message.includes('NOT_FOUND') ? 404 : message.includes('REQUIRED') || message.includes('UNSUPPORTED') || error instanceof z.ZodError ? 400 : 500;
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(request: Request) {
  try {
    await requireAuthenticatedUser();
    const runId = new URL(request.url).searchParams.get('runId')?.trim();
    if (!runId) return NextResponse.json({ ok: false, error: 'runId_required' }, { status: 400 });
    const data = await readDiscoveryRun(z.string().uuid().parse(runId));
    return NextResponse.json({ ok: true, contract: 'SFI-DISCOVERY-OBSERVATION-1.0', ...data });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const input = observeSchema.parse(await request.json());
    const persisted = await persistDiscoveryObservation(input, user.id);
    return NextResponse.json({
      ok: true,
      contract: persisted.result.contract,
      queryId: persisted.queryId,
      runId: persisted.runId,
      replay: persisted.replay,
      observation: persisted.result,
      authority: {
        persistence: 'OBSERVED_DISCOVERY_TEST_ONLY',
        candidatePromotion: false,
        automaticCanon: false,
        externalExecution: false,
      },
    }, { status: persisted.replay ? 200 : 201 });
  } catch (error) {
    return fail(error);
  }
}
