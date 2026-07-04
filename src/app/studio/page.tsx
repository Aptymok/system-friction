import { StudioGoldConsoleWithIntake } from '@/components/studio/gold/StudioGoldConsoleWithIntake';
import { readStudioGoldState } from '@/lib/studio/gold/studioGoldAdapter';

export const dynamic = 'force-dynamic';

export default async function StudioPage() {
  const state = await readStudioGoldState();
  return <StudioGoldConsoleWithIntake state={state} />;
}
