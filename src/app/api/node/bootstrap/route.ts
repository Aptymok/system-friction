import { NextResponse } from 'next/server';
import { getServerUserContext, ROOT_ENTITLEMENTS } from '@/lib/server/productionBackend';
import { getEntitlements } from '@/lib/licensing/entitlements';
import { loadSfiAssets } from '@/lib/server/sfiAssets';

export async function GET() {
  const ctx = await getServerUserContext();
  if (!ctx.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let node = null;
  let nodeError = null;
  const { data: nodes, error: selectNodeError } = await ctx.service
    .from('nodes')
    .select('id,source,user_id,alias,objective,current_ihg,current_nti,current_ldi,current_severity,active_pattern,created_at,updated_at,last_sync')
    .eq('user_id', ctx.user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  node = nodes?.[0] || null;
  nodeError = selectNodeError;

  if (!node && !nodeError) {
    const { data, error } = await ctx.service
      .from('nodes')
      .insert({ user_id: ctx.user.id, source: 'web', current_ihg: 0.52, current_nti: 0.48, current_ldi: 1.12 })
      .select('id,source,user_id,alias,objective,current_ihg,current_nti,current_ldi,current_severity,active_pattern,created_at,updated_at,last_sync')
      .single();
    node = data;
    nodeError = error;
  }

  if (!node && !ctx.isRoot) {
    return NextResponse.json({ error: nodeError?.message || 'node_not_found' }, { status: nodeError ? 500 : 404 });
  }

  const [audits, memoryFacts, actions, licenseRows] = node
    ? await Promise.all([
        ctx.service
          .from('audits')
          .select('id,node_id,source,narrative,ihg,nti,ldi,verdict,diagnosis,loop_score,divergence,pattern,hard_stop,proposed_action,created_at,whatsapp_session_id')
          .eq('node_id', node.id)
          .order('created_at', { ascending: false })
          .limit(20),
        ctx.service
          .from('memory_facts')
          .select('id,node_id,audit_id,fact_type,label,value,confidence,first_seen_at,last_seen_at,recurrence_count')
          .eq('node_id', node.id)
          .order('last_seen_at', { ascending: false })
          .limit(30),
        ctx.service
          .from('actions')
          .select('id,node_id,audit_id,description,verification_criterion,due_at,completed_at,status,action_type,metadata,created_at')
          .eq('node_id', node.id)
          .order('created_at', { ascending: false })
          .limit(30),
        ctx.service
          .from('sfi_user_entitlements')
          .select('status,tier,valid_until,source')
          .eq('user_id', ctx.user.id)
          .order('created_at', { ascending: false })
          .limit(1),
      ])
    : [null, null, null, null];

  const entitlements = ctx.isRoot ? ROOT_ENTITLEMENTS : await getEntitlements(ctx.user.id);
  const sfiAssets = await loadSfiAssets(ctx, { includeHistory: false });

  return NextResponse.json({
    node,
    node_error: nodeError?.message || null,
    user: { id: ctx.user.id, email: ctx.user.email },
    profile: ctx.profile,
    audits: audits?.data || [],
    memoryFacts: memoryFacts?.data || [],
    memory_facts: memoryFacts?.data || [],
    actions: actions?.data || [],
    license: ctx.isRoot
      ? { status: 'root_bypass', product_key: 'system_internal' }
      : licenseRows?.data?.[0]
        ? {
            status: licenseRows.data[0].status,
            product_key: licenseRows.data[0].tier,
            valid_until: licenseRows.data[0].valid_until,
            source: licenseRows.data[0].source ?? 'sfi_user_entitlements',
          }
        : null,
    entitlements,
    sfi_assets: sfiAssets.assets,
    sfi_assets_error: sfiAssets.error,
  });
}
