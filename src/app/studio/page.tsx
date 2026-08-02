import { StudioProductionConsole } from '@/components/studio/production/StudioProductionConsole';
import { readStudioProductionState } from '@/lib/studio/production/studioProductionAdapter';
import { requireAuthenticatedUser, requireFounder } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';

export default async function StudioPage({ searchParams }: { searchParams?: Promise<{ objectId?: string | string[] }> }) {
  const { user } = await requireAuthenticatedUser();
  const params = searchParams ? await Promise.resolve(searchParams) : {};
  const objectId = typeof params.objectId === 'string' && params.objectId.trim() ? params.objectId.trim() : null;
  let includeLegacy = false;
  try {
    await requireFounder();
    includeLegacy = true;
  } catch {
    includeLegacy = false;
  }
  const state = await readStudioProductionState({ ownerId: user.id, includeLegacy, objectId });
  return <StudioProductionConsole state={state} />;
}
