import { NextResponse } from 'next/server';
import { ensureOwnedNode, ROOT_ENTITLEMENTS } from '@/lib/server/productionBackend';
import { getEntitlements } from '@/lib/licensing/entitlements';

export async function GET() {
  const ctx = await ensureOwnedNode();
  if (ctx.error) return ctx.error;

  const [audits, memoryFacts, actions, licenseRows] = await Promise.all([
    ctx.service
      .from('audits')
      .select('*')
      .eq('node_id', ctx.node.id)
      .order('created_at', { ascending: false })
      .limit(20),
    ctx.service
      .from('memory_facts')
      .select('*')
      .eq('node_id', ctx.node.id)
      .order('last_seen_at', { ascending: false })
      .limit(30),
    ctx.service
      .from('actions')
      .select('*')
      .eq('node_id', ctx.node.id)
      .order('created_at', { ascending: false })
      .limit(30),
    ctx.service
      .from('licenses')
      .select('*')
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  const entitlements = ctx.isRoot ? ROOT_ENTITLEMENTS : await getEntitlements(ctx.user.id);

  return NextResponse.json({
    node: ctx.node,
    user: { id: ctx.user.id, email: ctx.user.email },
    profile: ctx.profile,
    audits: audits.data || [],
    memoryFacts: memoryFacts.data || [],
    memory_facts: memoryFacts.data || [],
    actions: actions.data || [],
    license: ctx.isRoot
      ? { status: 'root_bypass', product_key: 'system_internal' }
      : licenseRows.data?.[0] || null,
    entitlements,
  });
}
