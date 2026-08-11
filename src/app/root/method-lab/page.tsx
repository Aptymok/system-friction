import { requireRootObserverPage } from '@/lib/root/server';
import { readMethodLabState } from '@/lib/method-lab/readModel';
import { MethodLabConsole } from '@/components/root/method-lab/MethodLabConsole';
import { CognitiveLabConsole } from '@/components/root/cognitive-lab/CognitiveLabConsole';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function MethodLabPage() {
  await requireRootObserverPage('/root/method-lab');
  const state = await readMethodLabState();
  return (
    <>
      <MethodLabConsole state={state} />
      <CognitiveLabConsole />
    </>
  );
}
