import { requireFounderPage } from '@/lib/root/server';
import { readAgentPassports } from '@/lib/sfi/cognitive-runtime/agentPassports';
import { AgentPassportsConsole } from '@/components/root/agents/AgentPassportsConsole';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function AgentPassportsPage() {
  await requireFounderPage('/root/agents/passports');
  const data = await readAgentPassports();
  return <AgentPassportsConsole data={data} />;
}
