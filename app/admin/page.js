import Link from 'next/link';
import { isAdmin } from '@/lib/auth';
import { listOrders, getSalesSummary } from '@/lib/db';
import LoginForm from './login-form';
import StatusButtons from './status-buttons';

export const metadata = { title: 'Admin — AutoCraft Studios' };
export const dynamic = 'force-dynamic';

const STATUS_LABELS = {
  new: 'New',
  in_production: 'In Production',
  delivered: 'Delivered',
};

const CHARACTER_LABELS = {
  'me-on-camera': 'Owner / team on camera',
  'ai-spokesperson': 'AI avatar spokesperson',
  'customer-style': 'Customer / testimonial style',
  'voiceover-broll': 'Voiceover + product footage',
  'text-driven': 'Text & motion graphics',
  'not-sure': 'Not sure — recommend',
};

const GOAL_LABELS = {
  sales: 'Drive sales',
  awareness: 'Brand awareness',
  followers: 'Grow followers',
  leads: 'Generate leads',
  launch: 'Launch something new',
  mixed: 'Mix of everything',
};

function BriefItem({ k, v }) {
  if (!v) return null;
  return (
    <div className="item">
      <div className="k">{k}</div>
      <div>{v}</div>
    </div>
  );
}

export default async function AdminPage() {
  const authed = await isAdmin();

  if (!authed) {
    return (
      <div className="login-wrap">
        <div className="panel">
          <h2>Admin Login</h2>
          <p className="panel-sub">Auto Craft Studios order dashboard</p>
          <LoginForm />
        </div>
      </div>
    );
  }

  const [orders, summary] = await Promise.all([listOrders(), getSalesSummary()]);
  const usd = (cents) =>
    (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return (
    <>
      <nav className="nav">
        <div className="container nav-inner">
          <Link href="/" className="logo">
            <img src="/logo.png" alt="AutoCraft Studios logo" className="logo-img" />
            AutoCraft Studios <span style={{ color: 'var(--text-dim)', fontWeight: 500 }}>/ Admin</span>
          </Link>
        </div>
      </nav>
      <div className="admin-wrap">
        <div className="admin-head">
          <h1>Orders ({orders.length})</h1>
        </div>

        <div className="stats-row stats-row-4">
          <div className="stat-card">
            <div className="stat-num">{summary.totalOrders}</div>
            <div className="stat-cap">Total orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{summary.paidOrders}</div>
            <div className="stat-cap">Paid</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{usd(summary.collectedCents)}</div>
            <div className="stat-cap">Collected to date</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{usd(summary.bookedCents)}</div>
            <div className="stat-cap">Booked value</div>
          </div>
        </div>

        {orders.length === 0 && (
          <div className="empty-state">
            <p>No orders yet. They&apos;ll show up here the moment someone submits the order form.</p>
          </div>
        )}

        {orders.map((o) => (
          <div className="order-card" key={o.id}>
            <div className="order-top">
              <div>
                <div className="ref">
                  {o.order_ref} — {o.package_name} ({o.package_price})
                </div>
                <div className="meta">
                  {o.name}
                  {o.business_name ? ` · ${o.business_name}` : ''} · {o.email}
                  {o.phone ? ` · ${o.phone}` : ''}
                  {o.website ? ` · ${o.website}` : ''} · {o.created_at} UTC
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className={`status-pill pay-${o.payment_status || 'unpaid'}`}>
                  {o.payment_status === 'paid'
                    ? o.amount_total
                      ? `✓ Paid ${usd(o.amount_total)}${o.package_id === 'monthly' ? '/mo' : ''}`
                      : '✓ Paid'
                    : o.payment_status === 'pending'
                      ? 'Payment Pending'
                      : 'Unpaid'}
                </span>
                <span className={`status-pill status-${o.status}`}>
                  {STATUS_LABELS[o.status] || o.status}
                </span>
                <StatusButtons id={o.id} status={o.status} />
              </div>
            </div>
            <div className="brief-grid">
              <BriefItem k="Main character" v={CHARACTER_LABELS[o.main_character] || o.main_character} />
              <BriefItem k="Character notes" v={o.main_character_notes} />
              <BriefItem k="Tone" v={o.tone} />
              <BriefItem k="Goal" v={GOAL_LABELS[o.goal] || o.goal} />
              <BriefItem k="Inspiration" v={o.inspiration} />
              <BriefItem k="Inspiration links" v={o.inspiration_links} />
              <BriefItem k="Platforms" v={o.platforms} />
              <BriefItem k="Audience" v={o.audience} />
              <BriefItem k="Product focus" v={o.product_focus} />
              <BriefItem k="Key message" v={o.key_message} />
              <BriefItem k="Call to action" v={o.call_to_action} />
              <BriefItem k="Music" v={o.music_style} />
              <BriefItem k="Brand assets" v={o.brand_handles} />
              <BriefItem k="Avoid" v={o.avoid} />
              <BriefItem k="Extra notes" v={o.extra_notes} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
