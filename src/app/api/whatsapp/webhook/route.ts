import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Verificación de estructura de mensaje de WhatsApp
    if (payload.object === 'whatsapp_business_account') {
      const entry = payload.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message) {
        console.log(`[MOP-H Flow] Mensaje recibido de ${message.from}: ${message.text?.body}`);
        
        // Aquí se dispara la lógica de integración homeostática
        // puenteando hacia el Nodo de Trazabilidad Institucional
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ 
      error: 'Webhook Error', 
      details: error instanceof Error ? error.message : 'Unknown' 
    }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Verificación obligatoria para Meta/WhatsApp
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}