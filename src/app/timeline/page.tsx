import { redirect } from 'next/navigation';
import { AccessDeniedError, requireUserProfile } from '@/lib/system/access/server';
import { SFI_CANONICAL_OBJECT_REGISTRY, canonicalPublicationDisposition } from '@/lib/discovery/canonicalObjectRegistry';
import { readPublicWorldSnapshotTimeline } from '@/lib/observatory/public/worldSnapshotTimeline';
import { OperationalTimeline, type TimelineItem } from '@/components/sfi/OperationalTimeline';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = {
  title: 'MIHM-T | Timeline Observatory | System Friction Institute',
  description: 'Authenticated recorded timeline with source-bounded event, observation, record, knowledge, authority, execution and RETURN clocks.',
  robots: { index: false, follow: false, nocache: true },
};

export default async function TimelinePage() {
  // Timeline is the institutional authenticated surface. Public /observatory remains separate.
  try { await requireUserProfile(); }
  catch (error) {
    if (error instanceof AccessDeniedError) {
      if (error.status === 401) redirect('/login?next=%2Ftimeline');
      if (error.status === 503) redirect('/auth-unavailable?next=%2Ftimeline');
    }
    redirect('/unauthorized');
  }

  const institution: TimelineItem[] = SFI_CANONICAL_OBJECT_REGISTRY
    .filter(record => canonicalPublicationDisposition(record).disposition === 'PUBLISH')
    .filter(record => Boolean(record.updatedAt) && Number.isFinite(Date.parse(record.updatedAt)))
    .map(record => ({
      id: 'registry:' + record.id, at: record.updatedAt, lane: 'INSTITUTION' as const,
      title: record.title, subtitle: record.summary, origin: 'CANONICAL PUBLIC REGISTRY',
      state: record.epistemicState, href: '/repository?object=' + encodeURIComponent(record.slug),
      clockAnchorMeaning: 'Canonical registry last-update timestamp; not event time or actor knowledge.',
      clockEvidence: {
        RECORD: {
          at: record.updatedAt, sourceRef: 'registry:' + record.id,
          meaning: 'Canonical object record last updated; neither first publication nor observed external event.',
          basis: 'OBSERVED_TIME', epistemicClass: 'OBSERVED',
        },
      },
      recordCreatedAt: record.createdAt,
    }));

  let world: TimelineItem[] = [];
  let worldReadPlane = 'UNAVAILABLE';
  try {
    const history = await readPublicWorldSnapshotTimeline();
    worldReadPlane = history.readPlane;
    world = history.frames.map((frame, index) => {
      const sourceRef = 'worldspect:' + frame.observedAt + ':' + index;
      const observationEvidence = frame.observedTimeSource === 'observed_at' ? {
        OBSERVATION: {
          at: frame.observedAt, sourceRef,
          meaning: 'WorldSpect persisted observed_at; a reading, not an independent external-world event.',
          basis: 'OBSERVED_TIME' as const, epistemicClass: 'OBSERVED' as const,
        },
      } : {};
      const recordEvidence = frame.recordCreatedAt ? {
        RECORD: {
          at: frame.recordCreatedAt, sourceRef,
          meaning: 'WorldSpect persistence created_at; not evidence of when an actor learned.',
          basis: 'OBSERVED_TIME' as const, epistemicClass: 'OBSERVED' as const,
        },
      } : {};
      return {
        id: sourceRef, at: frame.observedAt, lane: 'WORLD' as const,
        title: 'WorldSpect observation frame',
        subtitle: 'Persisted longitudinal reading. Neither an external-world event nor a verified RETURN.',
        origin: 'WORLDSPECT PUBLIC HISTORY', state: frame.sourceState + ' · ' + frame.ingestMode,
        href: '/observatory?lens=trajectory&focus=timeline',
        world: { wsi: frame.wsi, nti: frame.nti, confidence: frame.confidence, vectors: frame.vectors },
        clockAnchorMeaning: frame.observedTimeSource === 'observed_at'
          ? 'Persisted WorldSpect observed_at' : 'Record creation fallback; observation time is UNKNOWN',
        clockEvidence: { ...observationEvidence, ...recordEvidence },
      };
    });
  } catch {
    // Do not fabricate frames or synthesize missing clocks.
  }

  return <OperationalTimeline items={[...institution, ...world]} worldReadPlane={worldReadPlane} />;
}
