import Stripe from 'stripe';

let stripe;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripe) stripe = new Stripe(key);
  return stripe;
}

// Stripe line-item config per package. Prices are created inline (price_data),
// so nothing needs to be pre-configured in the Stripe dashboard.
export const STRIPE_PRICING = {
  starter: {
    mode: 'payment',
    unit_amount: 30000,
    product_name: 'Starter Pack — 10 Short-Form Videos',
    description: 'One-time purchase of 10 short-form videos.',
  },
  monthly: {
    mode: 'subscription',
    unit_amount: 24900,
    product_name: 'Growth Plan — 10 Videos/Month',
    description: '12-month plan billed monthly. Includes creative & agency briefing.',
    months: 12,
  },
  annual: {
    mode: 'payment',
    unit_amount: 199900,
    product_name: 'Annual Pro — One Year of Video Production',
    description: 'Full year of monthly video production, paid in advance.',
  },
};

export async function createCheckoutSession({ packageId, orderRef, email, origin }) {
  const stripe = getStripe();
  if (!stripe) return null;

  const cfg = STRIPE_PRICING[packageId];
  const lineItem = {
    quantity: 1,
    price_data: {
      currency: 'usd',
      unit_amount: cfg.unit_amount,
      product_data: { name: cfg.product_name, description: cfg.description },
      ...(cfg.mode === 'subscription' ? { recurring: { interval: 'month' } } : {}),
    },
  };

  return stripe.checkout.sessions.create({
    mode: cfg.mode,
    customer_email: email,
    line_items: [lineItem],
    metadata: { order_ref: orderRef, package_id: packageId },
    ...(cfg.mode === 'subscription'
      ? { subscription_data: { metadata: { order_ref: orderRef } } }
      : {}),
    success_url: `${origin}/order/success?ref=${encodeURIComponent(orderRef)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/order?canceled=1`,
  });
}

// The Growth Plan is a 12-month commitment: once Checkout completes we schedule
// the subscription to end after 12 cycles. Safe to call more than once.
export async function capSubscriptionAt12Months(subscriptionId) {
  const stripe = getStripe();
  if (!stripe || !subscriptionId) return;
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  if (sub.cancel_at) return;
  const start = (sub.start_date || Math.floor(Date.now() / 1000)) * 1000;
  const end = new Date(start);
  end.setMonth(end.getMonth() + STRIPE_PRICING.monthly.months);
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at: Math.floor(end.getTime() / 1000),
  });
}
