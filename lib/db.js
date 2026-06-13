import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';

// Persistence layer (Turso / libSQL — hosted SQLite).
//
//   Production: set DATABASE_URL + DATABASE_AUTH_TOKEN (the Turso libsql:// URL
//               and token). The client talks to Turso over HTTPS — durable, and
//               survives Vercel's stateless serverless functions.
//   Local dev:  no env vars needed — falls back to a real SQLite file at
//               ./data/autocraft.db using the identical driver and SQL.
//
let client;
let ready;

function rawClient() {
  if (client) return client;

  const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

  if (url) {
    client = createClient({ url, authToken });
  } else {
    // On Vercel the filesystem is ephemeral — fail loud rather than silently
    // writing paid orders to a throwaway file that vanishes on instance recycle.
    if (process.env.VERCEL) {
      throw new Error(
        'DATABASE_URL is required on Vercel. Refusing to run without durable storage.'
      );
    }
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    client = createClient({ url: 'file:' + path.join(dir, 'autocraft.db') });
  }
  return client;
}

// Migrations run exactly once per process (memoized via the `ready` promise).
// If migration REJECTS (e.g. a transient Turso timeout on a cold start), clear
// the memo so the next request retries instead of re-throwing forever.
async function getClient() {
  const c = rawClient();
  if (!ready) {
    ready = migrate(c).catch((e) => {
      ready = undefined;
      throw e;
    });
  }
  await ready;
  return c;
}

async function migrate(c) {
  await c.executeMultiple(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_ref TEXT NOT NULL UNIQUE,
      package_id TEXT NOT NULL,
      package_name TEXT NOT NULL,
      package_price TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      business_name TEXT,
      website TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      stripe_session_id TEXT,
      stripe_subscription_id TEXT,
      stripe_payment_intent TEXT,
      amount_total INTEGER,
      currency TEXT,
      paid_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS briefs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      main_character TEXT,
      main_character_notes TEXT,
      inspiration TEXT,
      inspiration_links TEXT,
      tone TEXT,
      goal TEXT,
      audience TEXT,
      platforms TEXT,
      product_focus TEXT,
      key_message TEXT,
      call_to_action TEXT,
      music_style TEXT,
      caption_style TEXT,
      brand_handles TEXT,
      avoid TEXT,
      extra_notes TEXT,
      answers_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Columns added after the initial schema; ignore "duplicate column" on
  // databases that already have them.
  const laterColumns = [
    "payment_status TEXT NOT NULL DEFAULT 'unpaid'",
    'stripe_session_id TEXT',
    'stripe_subscription_id TEXT',
    'stripe_payment_intent TEXT',
    'amount_total INTEGER',
    'currency TEXT',
    'paid_at TEXT',
  ];
  for (const col of laterColumns) {
    try {
      await c.execute(`ALTER TABLE orders ADD COLUMN ${col}`);
    } catch {
      /* column already exists */
    }
  }

  // Index for the webhook/success-page lookup by Stripe session.
  try {
    await c.execute('CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(stripe_session_id)');
  } catch {
    /* ignore */
  }
}

export const PACKAGES = {
  starter: {
    id: 'starter',
    name: 'Starter Pack',
    price: '$300',
    priceDetail: 'one-time',
    summary: '10 short-form videos, one-time purchase',
  },
  monthly: {
    id: 'monthly',
    name: 'Growth Plan',
    price: '$249/mo',
    priceDetail: '12 months, billed monthly',
    summary: '10 videos every month for 12 months + creative & agency briefing',
  },
  annual: {
    id: 'annual',
    name: 'Annual Pro',
    price: '$1,999',
    priceDetail: 'one year, paid in advance',
    summary: '12 months of video production, paid up front — best value',
  },
};

export async function createOrder({ packageId, contact, brief }) {
  const pkg = PACKAGES[packageId];
  if (!pkg) throw new Error('Unknown package: ' + packageId);

  const orderRef =
    'ACS-' +
    Date.now().toString(36).toUpperCase() +
    '-' +
    Math.random().toString(36).slice(2, 6).toUpperCase();

  const c = await getClient();
  const tx = await c.transaction('write');
  try {
    const res = await tx.execute({
      sql: `INSERT INTO orders
              (order_ref, package_id, package_name, package_price, name, email, phone, business_name, website)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        orderRef,
        pkg.id,
        pkg.name,
        pkg.price,
        contact.name,
        contact.email,
        contact.phone || null,
        contact.businessName || null,
        contact.website || null,
      ],
    });
    const orderId = Number(res.lastInsertRowid);

    await tx.execute({
      sql: `INSERT INTO briefs (
              order_id, main_character, main_character_notes, inspiration, inspiration_links,
              tone, goal, audience, platforms, product_focus, key_message, call_to_action,
              music_style, caption_style, brand_handles, avoid, extra_notes, answers_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        orderId,
        brief.mainCharacter || null,
        brief.mainCharacterNotes || null,
        brief.inspiration || null,
        brief.inspirationLinks || null,
        Array.isArray(brief.tone) ? brief.tone.join(', ') : brief.tone || null,
        brief.goal || null,
        brief.audience || null,
        Array.isArray(brief.platforms) ? brief.platforms.join(', ') : brief.platforms || null,
        brief.productFocus || null,
        brief.keyMessage || null,
        brief.callToAction || null,
        brief.musicStyle || null,
        brief.captionStyle || null,
        brief.brandHandles || null,
        brief.avoid || null,
        brief.extraNotes || null,
        JSON.stringify(brief),
      ],
    });

    await tx.commit();
    return { orderRef, orderId };
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

export async function setStripeSession(orderId, sessionId) {
  const c = await getClient();
  await c.execute({
    sql: "UPDATE orders SET stripe_session_id = ?, payment_status = 'pending' WHERE id = ?",
    args: [sessionId, orderId],
  });
}

// Records a completed sale. Idempotent — calling it twice for the same session
// (success page + webhook both fire) just rewrites the same paid row.
export async function markPaidBySession(sessionId, details = {}) {
  const { subscriptionId = null, paymentIntent = null, amountTotal = null, currency = null } = details;
  const c = await getClient();
  await c.execute({
    sql: `UPDATE orders SET
            payment_status = 'paid',
            stripe_subscription_id = COALESCE(?, stripe_subscription_id),
            stripe_payment_intent  = COALESCE(?, stripe_payment_intent),
            amount_total           = COALESCE(?, amount_total),
            currency               = COALESCE(?, currency),
            paid_at                = COALESCE(paid_at, datetime('now'))
          WHERE stripe_session_id = ?`,
    args: [subscriptionId, paymentIntent, amountTotal, currency, sessionId],
  });
}

export async function getOrderBySession(sessionId) {
  const c = await getClient();
  const res = await c.execute({
    sql: 'SELECT * FROM orders WHERE stripe_session_id = ?',
    args: [sessionId],
  });
  return res.rows[0] || null;
}

export async function listOrders() {
  const c = await getClient();
  const res = await c.execute(
    `SELECT o.*, b.main_character, b.main_character_notes, b.inspiration, b.inspiration_links,
            b.tone, b.goal, b.audience, b.platforms, b.product_focus, b.key_message,
            b.call_to_action, b.music_style, b.caption_style, b.brand_handles, b.avoid, b.extra_notes
     FROM orders o LEFT JOIN briefs b ON b.order_id = o.id
     ORDER BY o.created_at DESC, o.id DESC`
  );
  return res.rows;
}

export async function getSalesSummary() {
  const c = await getClient();
  // `collected_cents` = money actually charged so far (each paid transaction).
  // `booked_cents`    = contract value, counting the Growth Plan as its full
  //                     12-month commitment rather than just the first month.
  const res = await c.execute(
    `SELECT
       COUNT(*) AS total_orders,
       SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS paid_orders,
       COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount_total ELSE 0 END), 0) AS collected_cents,
       COALESCE(SUM(CASE WHEN payment_status = 'paid'
                         THEN amount_total * (CASE WHEN package_id = 'monthly' THEN 12 ELSE 1 END)
                         ELSE 0 END), 0) AS booked_cents
     FROM orders`
  );
  const row = res.rows[0] || {};
  return {
    totalOrders: Number(row.total_orders || 0),
    paidOrders: Number(row.paid_orders || 0),
    collectedCents: Number(row.collected_cents || 0),
    bookedCents: Number(row.booked_cents || 0),
  };
}

export async function updateOrderStatus(id, status) {
  const c = await getClient();
  await c.execute({ sql: 'UPDATE orders SET status = ? WHERE id = ?', args: [status, id] });
}
