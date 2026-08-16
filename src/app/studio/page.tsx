import { StudioSecondaryInstruments } from '@/components/studio/workspace/StudioSecondaryInstruments';
import { StudioWorkspace } from '@/components/studio/workspace/StudioWorkspace';
import { readStudioFieldState } from '@/lib/studio/field/studioFieldState';
import { readStudioProductionState } from '@/lib/studio/production/studioProductionAdapter';
import { scopeStudioStateForMember } from '@/lib/studio/production/scopeStudioStateForMember';
import { requireAuthenticatedUser, requireFounder } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function StudioPage({ searchParams }: { searchParams?: Promise<{ objectId?: string | string[] }> }) {
  const { user } = await requireAuthenticatedUser();
  const params = searchParams ? await Promise.resolve(searchParams) : {};
  const objectId = typeof params.objectId === 'string' && params.objectId.trim() ? params.objectId.trim() : null;
  let isFounder = false;
  try {
    await requireFounder();
    isFounder = true;
  } catch {
    isFounder = false;
  }

  const rawState = await readStudioProductionState({ ownerId: user.id, includeLegacy: isFounder, objectId });
  const state = isFounder ? rawState : scopeStudioStateForMember(rawState);
  const fieldState = await readStudioFieldState({ ownerId: user.id, sessionId: state.session.id });

  return (
    <main className="min-h-screen bg-transparent">
      <StudioWorkspace
        state={state}
        fieldState={fieldState}
        identity={user.email ?? user.id}
      />
      <StudioSecondaryInstruments
        fieldState={fieldState}
        activeObjectId={state.activeObject.id ?? null}
        objectCount={fieldState.objects.length}
        objectTitle={state.activeObject.title}
        objectType={state.activeObject.type}
        analysisStatus={state.activeObject.analysisStatus}
      />
    </main>
  );
}
