import { StudioGoldConsoleWithEvaluation } from '@/components/studio/gold/StudioGoldConsoleWithEvaluation';
import { readStudioGoldState } from '@/lib/studio/gold/studioGoldAdapter';

export const dynamic = 'force-dynamic';

export default async function StudioPage() {
  const state = await readStudioGoldState();
  return <StudioGoldConsoleWithEvaluation state={state} />;
}
