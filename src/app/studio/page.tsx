import { StudioProductionConsole } from '@/components/studio/production/StudioProductionConsole';
import { readStudioProductionState } from '@/lib/studio/production/studioProductionAdapter';

export const dynamic = 'force-dynamic';

export default async function StudioPage() {
  const state = await readStudioProductionState();
  return <StudioProductionConsole state={state} />;
}
