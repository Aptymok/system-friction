import { StudioGoldConsole } from '@/components/studio/gold/StudioGoldConsole';
import { readStudioGoldState } from '@/lib/studio/gold/studioGoldAdapter';

export const dynamic = 'force-dynamic';

export default async function StudioPage() {
  const state = await readStudioGoldState();
  return <StudioGoldConsole state={state} />;
}
