import 'server-only';
import crypto from 'crypto';
import { headers } from 'next/headers';

export type WorldVectorSystemActorAction = 'daily' | 'reports' | 'audit' | 'health';

const ALLOWED_SYSTEM_ACTIONS = new Set<WorldVectorSystemActorAction>([
  'daily',
  'reports',
  'audit',
  'health',
]);

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export async function requireWorldVectorSystemActor(action: string) {
  if (!ALLOWED_SYSTEM_ACTIONS.has(action as WorldVectorSystemActorAction)) {
    return {
      ok: false as const,
      status: 403,
      body: { ok: false, error: 'system_actor_action_not_allowed', action },
    };
  }

  const expected = process.env.SFI_AGENT_SECRET || process.env.WORLD_VECTOR_AGENT_SECRET;
  if (!expected) {
    return {
      ok: false as const,
      status: 503,
      body: { ok: false, error: 'system_actor_secret_not_configured' },
    };
  }

  const headerStore = await headers();
  const authorization = headerStore.get('authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : '';

  if (!token || !safeEqual(token, expected)) {
    return {
      ok: false as const,
      status: 401,
      body: { ok: false, error: 'system_actor_unauthorized' },
    };
  }

  return {
    ok: true as const,
    ctx: {
      user: {
        id: 'world-vector-system-agent',
        email: 'world-vector-agent@systemfriction.local',
      },
      profile: {
        role: 'system',
        alias: 'world-vector-agent',
      },
      isRoot: false,
      isSystemActor: true,
    },
  };
}
