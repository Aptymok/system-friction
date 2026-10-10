import { redirect } from 'next/navigation';
import { MethodLabNativeHub } from '@/components/sfi/MethodLabNativeHub';
import { PersonalCognitiveLabWorkspace } from '@/components/sfi/PersonalCognitiveLabWorkspace';
import { MethodLabExperimentWorkbench } from '@/components/sfi/MethodLabExperimentWorkbench';
import { readMethodLabState } from '@/lib/method-lab/readModel';
import { readMethodLabEvidenceOptions } from '@/lib/method-lab/readHubEvidence';
import { getCognitiveLabSession, listCognitiveLabSessions } from '@/lib/cognitive-lab/service';
import { requireRootObserverPage } from '@/lib/root/server';
import { AccessDeniedError, requireUserProfile } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

type Row = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

export default async function MethodLabPage() {
  let account: Awaited<ReturnType<typeof requireUserProfile>>;
  try {
    account = await requireUserProfile();
  } catch (error) {
    if (error instanceof AccessDeniedError && error.status === 401) redirect('/login?next=%2Fmethod-lab');
    redirect('/unauthorized');
  }

  const role = String(account.profile.role || '').toLowerCase();
  const institutional = Boolean(account.member) || role === 'root' || role === 'system';

  if (!institutional) return (
    <>
      <PersonalCognitiveLabWorkspace />
      <MethodLabExperimentWorkbench />
    </>
  );

  await requireRootObserverPage('/method-lab');

  const [state, sessions, evidence] = await Promise.all([
    readMethodLabState(),
    listCognitiveLabSessions(18),
    readMethodLabEvidenceOptions(120),
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
        // A degraded detail read must not hide the session from the Lab.
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
    <MethodLabNativeHub
      initialState={state}
      initialSessions={sessionViews}
      evidenceOptions={evidence.options}
      evidenceWarnings={evidence.warnings}
    />
  );
}
