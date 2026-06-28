import 'server-only';
import { requireGovernedActor } from '@/lib/operational/common';

export async function requireWorldVectorAgentActor(action: string) {
  const gate = await requireGovernedActor(`world_vector.agent.${action}`);
  if (!gate.ok) return gate;
  if (!gate.ctx.isRoot) {
    return {
      ok: false as const,
      status: 403,
      body: { ok: false, error: 'root_required' },
    };
  }
  return gate;
}
