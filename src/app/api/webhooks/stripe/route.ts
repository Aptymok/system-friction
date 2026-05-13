import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16', // o la versión más reciente
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Usa la Service Role Key para poder saltar reglas de seguridad
);

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
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