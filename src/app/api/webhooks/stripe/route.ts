import { requireServiceSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe configuration is not available.' }, { status: 500 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-04-22.dahlia',
  })

  const supabase = requireServiceSupabaseClient()
  const payload = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Falta la firma de Stripe' }, { status: 400 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook signature invalid'
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  // Cuando el pago es exitoso
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email;
    const amount = session.amount_total; // El monto en centavos (900 = $9, 1000 = $10, 1900 = $19)

    // Lógica de asignación de licencia
    let licenseToAssign = 'free';
    
    if (amount === 900) {
      licenseToAssign = 'dictamen';
    } else if (amount === 1000 || amount === 1900) {
      licenseToAssign = 'full';
    }

    // Actualizar Supabase
    if (email) {
      const { error } = await supabase
        .from('profiles')
        .update({ license_type: licenseToAssign })
        .eq('email', email);

      if (error) console.error("Error actualizando perfil:", error);
    }
  }

  return NextResponse.json({ received: true });
}