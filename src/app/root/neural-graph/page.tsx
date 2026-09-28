import { redirect } from 'next/navigation';
import { requireFounderPage } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';

export default async function RootNeuralGraphPage() {
  await requireFounderPage('/root/neural-graph');
  redirect('/root');
}
