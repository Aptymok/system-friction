import 'server-only';
import { requireGovernedActor } from '@/lib/operational/common';
import { requireWorldVectorSystemActor } from './systemActorAuth';

export async function requireWorldVectorAgentActor(action: string, options: { allowSystemActor?: boolean } = {}) {
  if (options.allowSystemActor) {
    const systemGate = await requireWorldVectorSystemActor(action);
    if (systemGate.ok) return systemGate;
    if (systemGate.status !== 403) return systemGate;
  }

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
