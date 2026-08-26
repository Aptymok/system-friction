import { MethodLabNativeHub } from '@/components/sfi/MethodLabNativeHub';
import { MethodLabResearchReview } from '@/components/sfi/MethodLabResearchReview';
import { readMethodLabState } from '@/lib/method-lab/readModel';
import { readMethodLabEvidenceOptions } from '@/lib/method-lab/readHubEvidence';
import { readMethodLabResearchState } from '@/lib/method-lab/researchObjects';
import { getCognitiveLabSession, listCognitiveLabSessions } from '@/lib/cognitive-lab/service';
import { requireRootObserverPage } from '@/lib/root/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

type Row = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

export default async function MethodLabPage() {
  await requireRootObserverPage('/method-lab');

  const [state, sessions, evidence, research] = await Promise.all([
    readMethodLabState(),
    listCognitiveLabSessions(30),
    readMethodLabEvidenceOptions(80),
    readMethodLabResearchState(),
  ]);

  const sessionViews = await Promise.all((sessions as Row[]).map(async (session) => {
    const id = text(session.id);
    let eventCount = 0;
    let analysisCount = 0;
    if (id) {
      try {
        const detail = await getCognitiveLabSession(id);
        eventCount = detail.events.length;
        analysisCount = detail.analyses.length;
      } catch {
        // Keep the session visible even when its detail read is degraded.
      }
    }
    return {
      id,
      sessionKey: text(session.session_key),
      title: text(session.title),
      objective: text(session.objective),
      condition: text(session.condition),
      status: text(session.status),
      startedAt: text(session.started_at) || null,
      endedAt: text(session.ended_at) || null,
      eventCount,
      analysisCount,
    };
  }));

  return (
    <>
      <MethodLabResearchReview research={research} />
      <MethodLabNativeHub
        initialState={state}
        initialSessions={sessionViews}
        evidenceOptions={evidence.options}
        evidenceWarnings={evidence.warnings}
      />
    </>
  );
}
