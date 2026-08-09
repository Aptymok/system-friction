import { StudioProductionConsole } from '@/components/studio/production/StudioProductionConsole';
import { readStudioFieldState } from '@/lib/studio/field/studioFieldState';
import { readStudioProductionState } from '@/lib/studio/production/studioProductionAdapter';
import { scopeStudioStateForMember } from '@/lib/studio/production/scopeStudioStateForMember';
import { requireAuthenticatedUser, requireFounder } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';

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
    <main className="min-h-screen bg-[#050504]">
      <StudioProductionConsole
        state={state}
        fieldState={fieldState}
        identity={user.email ?? user.id}
      />
    </main>
  );
}
