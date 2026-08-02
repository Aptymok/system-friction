import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { AccessDeniedError, requireAuthenticatedUser } from '@/lib/system/access/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_PAYMENT_LINK = 'https://buy.stripe.com/7sYbJ2eyif964W3aOn5Ne04';

function buildTrackedPaymentLink(paymentLink: string, userId: string, email?: string | null) {
  const url = new URL(paymentLink);
  if (url.protocol !== 'https:' || url.hostname !== 'buy.stripe.com') {
    throw new Error('invalid_stripe_payment_link');
  }
  url.searchParams.set('client_reference_id', userId);
  if (email) url.searchParams.set('prefilled_email', email);
  return url.toString();
}

export async function POST(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const configuredPaymentLink = process.env.STRIPE_INTERFACE_PAYMENT_LINK || DEFAULT_PAYMENT_LINK;

    if (configuredPaymentLink) {
      return NextResponse.json({
        ok: true,
        mode: 'payment_link',
        url: buildTrackedPaymentLink(configuredPaymentLink, user.id, user.email),
      });
    }

    // Optional fallback for installations that prefer API-created Checkout Sessions.
    const secretKey = process.env.STRIPE_API_KEY || process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_INTERFACE_PRICE_ID;
    if (!secretKey || !priceId) {
      return NextResponse.json({ ok: false, error: 'stripe_interface_not_configured' }, { status: 503 });
    }

    const stripe = new Stripe(secretKey);
    const requestOrigin = new URL(request.url).origin;
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || requestOrigin).replace(/\/$/, '');
    const metadata = {
      user_id: user.id,
      entitlement: 'field_observer',
      source: 'sfi_user_interface',
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${appUrl}/interface?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/interface?payment=cancelled`,
      metadata,
      subscription_data: { metadata },
    });

    if (!session.url) {
      return NextResponse.json({ ok: false, error: 'stripe_checkout_url_missing' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, mode: 'checkout_session', url: session.url });
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return NextResponse.json({ ok: false, error: error.code }, { status: error.status });
    }
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'stripe_checkout_failed',
    }, { status: 500 });
  }
}
