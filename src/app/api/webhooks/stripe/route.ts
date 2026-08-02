import type { NextRequest } from 'next/server';
import { createKernelRoute } from '@/runtime/api/createKernelRoute';
import { POST as handleStripeEntitlement } from '@/app/api/webhooks/interface-stripe/route';

const handleKernelStripeEvent = createKernelRoute('stripe_webhook');

export async function POST(request: NextRequest) {
  if (request.headers.get('stripe-signature')) {
    return handleStripeEntitlement(request);
  }
  return handleKernelStripeEvent(request);
}
