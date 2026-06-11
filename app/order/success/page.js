import Link from 'next/link';
import { getStripe, capSubscriptionAt12Months } from '@/lib/stripe';
import { markPaidBySession } from '@/lib/db';

export const metadata = {
  title: 'Order Received — AutoCraft Studios',
};
export const dynamic = 'force-dynamic';

async function verifyPayment(sessionId) {
  const stripe = getStripe();
  if (!stripe || !sessionId) return null;
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = session.payment_status === 'paid' || session.status === 'complete';
    if (paid) {
      const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      markPaidBySession(session.id, subId || null);
      if (subId) await capSubscriptionAt12Months(subId);
    }
    return paid;
  } catch (e) {
    console.error('Payment verification failed:', e);
    return null;
  }
}

export default async function SuccessPage({ searchParams }) {
  const params = await searchParams;
  const ref = params?.ref || '';
  const paid = await verifyPayment(params?.session_id);

  return (
    <>
      <nav className="nav">
        <div className="container nav-inner">
          <Link href="/" className="logo">
            <img src="/logo.png" alt="AutoCraft Studios logo" className="logo-img" />
            AutoCraft Studios
          </Link>
        </div>
      </nav>
      <div className="success-wrap">
        <div className="success-icon">✓</div>
        <h1>{paid ? 'Payment confirmed!' : 'Order received!'}</h1>
        <p>
          {paid
            ? 'Your payment went through and your creative brief is in our production queue.'
            : 'Your creative brief is in our production queue.'}
        </p>
        {ref && <div className="order-ref">{ref}</div>}
        <p>
          {paid ? (
            <>
              We&apos;ll email you within <strong>one business day</strong> to schedule your
              kick-off briefing. Keep an eye on your inbox.
            </>
          ) : (
            <>
              We&apos;ll email you within <strong>one business day</strong> to confirm payment
              details and schedule your kick-off briefing. Keep an eye on your inbox.
            </>
          )}
        </p>
        <div style={{ marginTop: 32 }}>
          <Link href="/" className="btn btn-ghost">
            ← Back to home
          </Link>
        </div>
      </div>
    </>
  );
}
