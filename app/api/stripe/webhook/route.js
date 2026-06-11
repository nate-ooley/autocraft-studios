import { NextResponse } from 'next/server';
import { getStripe, capSubscriptionAt12Months } from '@/lib/stripe';
import { markPaidBySession } from '@/lib/db';

// Stripe webhook — configure the endpoint in the Stripe dashboard pointing at
// /api/stripe/webhook and set STRIPE_WEBHOOK_SECRET. The success page already
// verifies payment on redirect; this catches buyers who never return to the site.
export async function POST(req) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 501 });
  }

  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (e) {
    console.error('Webhook signature verification failed:', e.message);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    markPaidBySession(session.id, subId || null);
    if (subId) await capSubscriptionAt12Months(subId);
  }

  return NextResponse.json({ received: true });
}
