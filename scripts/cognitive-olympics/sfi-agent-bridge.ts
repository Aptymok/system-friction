import { executeRegisteredAgent, SFI_AGENT_EXECUTION_MAP } from '../../src/lib/sfi/cognitive-runtime/agentExecutionMap';
import type { KernelContext } from '../../src/lib/sfi/cognitive-runtime/kernelContext';

async function readStdin() {
  let text = '';
  for await (const chunk of process.stdin) text += chunk.toString();
  return text ? JSON.parse(text) : {};
}

const input = await readStdin();
const requested = Array.isArray(input.agents) && input.agents.length
  ? input.agents.filter((id: string) => Boolean(SFI_AGENT_EXECUTION_MAP[id]))
  : Object.keys(SFI_AGENT_EXECUTION_MAP);

let context = input.context as KernelContext;
const executedAgents: string[] = [];
for (const agentId of requested) {
  const before = JSON.stringify(context);
  context = executeRegisteredAgent(agentId, context);
  if (JSON.stringify(context) !== before || SFI_AGENT_EXECUTION_MAP[agentId]) executedAgents.push(agentId);
}

const metadata = context?.metadata && typeof context.metadata === 'object' ? context.metadata : {};
process.stdout.write(JSON.stringify({
  ok: true,
  mode: 'LAB_DETERMINISTIC_BRIDGE_NO_EVENT_PERSISTENCE',
  executedAgents,
  contradictions: context?.contradictions ?? [],
  predictions: context?.predictions ?? [],
  risks: context?.risks ?? [],
  opportunities: context?.opportunities ?? [],
  simulations: context?.simulations ?? [],
  metadata: {
    cognitivePlan: (metadata as any).cognitivePlan ?? null,
    agentInsights: (metadata as any).agentInsights ?? null,
    taskGraph: (metadata as any).taskGraph ?? null,
  },
}));
