import { StudioProductionConsole } from '@/components/studio/production/StudioProductionConsole';
import { readStudioProductionState } from '@/lib/studio/production/studioProductionAdapter';
import { requireAuthenticatedUser, requireFounder } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';

export default async function StudioPage() {
  const { user } = await requireAuthenticatedUser();
  let includeLegacy = false;
  try {
    await requireFounder();
    includeLegacy = true;
  } catch {
    includeLegacy = false;
  }
  const state = await readStudioProductionState({ ownerId: user.id, includeLegacy });
  return <StudioProductionConsole state={state} />;
}
