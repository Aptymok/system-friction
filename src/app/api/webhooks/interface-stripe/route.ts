import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServiceSupabaseClient } from '@/runtime/supabase/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type StripeObjectReference = string | { id: string } | null | undefined;
type SubscriptionWithPeriod = Stripe.Subscription & { current_period_end?: number };

function objectId(value: StripeObjectReference) {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

function entitlementStatus(status: Stripe.Subscription.Status) {
  if (status === 'trialing') return 'trialing';
  if (status === 'active') return 'active';
  if (status === 'past_due' || status === 'unpaid') return 'past_due';
  if (status === 'canceled') return 'canceled';
  return 'inactive';
}

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_INTERFACE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!secretKey || !webhookSecret || !signature) {
    return NextResponse.json({ ok: false, error: 'stripe_webhook_not_configured' }, { status: 503 });
  }

  const stripe = new Stripe(secretKey);
  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'invalid_stripe_signature',
    }, { status: 400 });
  }

  const service = createServiceSupabaseClient();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id || session.client_reference_id;
    if (userId) {
      const { error } = await service.from('sfi_user_entitlements').upsert({
        user_id: userId,
        tier: session.metadata?.entitlement || 'field_observer',
        status: 'active',
        stripe_customer_id: objectId(session.customer),
        stripe_subscription_id: objectId(session.subscription),
        source: 'stripe_checkout',
        metadata: { checkout_session_id: session.id },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as SubscriptionWithPeriod;
    const userId = subscription.metadata?.user_id;
    const periodEnd = Number(subscription.current_period_end || 0);
    const patch = {
      tier: subscription.metadata?.entitlement || 'field_observer',
      status: event.type === 'customer.subscription.deleted' ? 'canceled' : entitlementStatus(subscription.status),
      stripe_customer_id: objectId(subscription.customer),
      stripe_subscription_id: subscription.id,
      valid_until: periodEnd > 0 ? new Date(periodEnd * 1000).toISOString() : null,
      source: 'stripe_subscription',
      metadata: { stripe_status: subscription.status },
      updated_at: new Date().toISOString(),
    };

    const query = userId
      ? service.from('sfi_user_entitlements').upsert({ user_id: userId, ...patch }, { onConflict: 'user_id' })
      : service.from('sfi_user_entitlements').update(patch).eq('stripe_subscription_id', subscription.id);
    const { error } = await query;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, received: event.type });
}
