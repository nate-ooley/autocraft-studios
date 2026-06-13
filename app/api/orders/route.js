import { NextResponse } from 'next/server';
import { createOrder, setStripeSession, PACKAGES } from '@/lib/db';
import { createCheckoutSession } from '@/lib/stripe';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const { packageId, contact, brief } = body || {};

  if (!packageId || !PACKAGES[packageId]) {
    return NextResponse.json({ error: 'Please choose a valid package.' }, { status: 400 });
  }
  if (!contact?.name?.trim()) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  }
  if (!contact?.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email)) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  }
  if (!brief?.mainCharacter) {
    return NextResponse.json({ error: 'Please complete the creative brief.' }, { status: 400 });
  }

  try {
    const { orderRef, orderId } = await createOrder({ packageId, contact, brief: brief || {} });

    let paymentUrl = null;
    try {
      const session = await createCheckoutSession({
        packageId,
        orderRef,
        email: contact.email,
        origin: req.nextUrl.origin,
      });
      if (session) {
        await setStripeSession(orderId, session.id);
        paymentUrl = session.url;
      }
    } catch (e) {
      // The order is already saved — don't lose it because checkout failed.
      console.error('Stripe checkout session failed:', e);
    }

    return NextResponse.json({ ok: true, orderRef, paymentUrl });
  } catch (e) {
    console.error('Order creation failed:', e);
    return NextResponse.json({ error: 'Could not save your order. Please try again.' }, { status: 500 });
  }
}
