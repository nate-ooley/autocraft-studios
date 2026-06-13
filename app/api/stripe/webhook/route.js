import { NextResponse } from 'next/server';
import { getStripe, capSubscriptionAt12Months, saleDetailsFromSession } from '@/lib/stripe';
import { markPaidBySession } from '@/lib/db';

// Stripe webhook — the authoritative confirmation of payment. Configure the
// endpoint in the Stripe dashboard pointing at /api/stripe/webhook and set
// STRIPE_WEBHOOK_SECRET. The success page also verifies on redirect, but this
// catches buyers who pay and never return to the site.
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

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const details = saleDetailsFromSession(session);
      await markPaidBySession(session.id, details);
      if (details.subscriptionId) await capSubscriptionAt12Months(details.subscriptionId);
    }
  } catch (e) {
    // Return 500 so Stripe retries — better than silently dropping a paid sale.
    console.error('Webhook handling failed:', e);
    return NextResponse.json({ error: 'Handler error.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
