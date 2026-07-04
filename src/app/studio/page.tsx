import { StudioProductionConsole } from '@/components/studio/gold/StudioProductionConsole';
import { readStudioGoldState } from '@/lib/studio/gold/studioGoldAdapter';

export const dynamic = 'force-dynamic';

export default async function StudioPage() {
  const state = await readStudioGoldState();
  return <StudioProductionConsole state={state} />;
}
