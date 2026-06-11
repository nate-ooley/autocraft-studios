import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// On Vercel the deployment filesystem is read-only and ephemeral — /tmp is the
// only writable path. Orders there do not survive between invocations; use a
// hosted database before taking real production traffic.
const DATA_DIR = process.env.VERCEL ? '/tmp/autocraft-data' : path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'autocraft.db');

let db;

export function getDb() {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    migrate(db);
  }
  return db;
}

function migrate(db) {
  db.exec(`
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

  // Columns added after the initial schema; ignore "duplicate column" on existing DBs.
  for (const col of [
    "payment_status TEXT NOT NULL DEFAULT 'unpaid'",
    'stripe_session_id TEXT',
    'stripe_subscription_id TEXT',
  ]) {
    try {
      db.exec(`ALTER TABLE orders ADD COLUMN ${col}`);
    } catch {}
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

export function createOrder({ packageId, contact, brief }) {
  const db = getDb();
  const pkg = PACKAGES[packageId];
  if (!pkg) throw new Error('Unknown package: ' + packageId);

  const orderRef =
    'ACS-' +
    Date.now().toString(36).toUpperCase() +
    '-' +
    Math.random().toString(36).slice(2, 6).toUpperCase();

  const insertOrder = db.prepare(`
    INSERT INTO orders (order_ref, package_id, package_name, package_price, name, email, phone, business_name, website)
    VALUES (@orderRef, @packageId, @packageName, @packagePrice, @name, @email, @phone, @businessName, @website)
  `);

  const insertBrief = db.prepare(`
    INSERT INTO briefs (
      order_id, main_character, main_character_notes, inspiration, inspiration_links,
      tone, goal, audience, platforms, product_focus, key_message, call_to_action,
      music_style, caption_style, brand_handles, avoid, extra_notes, answers_json
    ) VALUES (
      @orderId, @mainCharacter, @mainCharacterNotes, @inspiration, @inspirationLinks,
      @tone, @goal, @audience, @platforms, @productFocus, @keyMessage, @callToAction,
      @musicStyle, @captionStyle, @brandHandles, @avoid, @extraNotes, @answersJson
    )
  `);

  const tx = db.transaction(() => {
    const res = insertOrder.run({
      orderRef,
      packageId: pkg.id,
      packageName: pkg.name,
      packagePrice: pkg.price,
      name: contact.name,
      email: contact.email,
      phone: contact.phone || null,
      businessName: contact.businessName || null,
      website: contact.website || null,
    });
    insertBrief.run({
      orderId: res.lastInsertRowid,
      mainCharacter: brief.mainCharacter || null,
      mainCharacterNotes: brief.mainCharacterNotes || null,
      inspiration: brief.inspiration || null,
      inspirationLinks: brief.inspirationLinks || null,
      tone: Array.isArray(brief.tone) ? brief.tone.join(', ') : brief.tone || null,
      goal: brief.goal || null,
      audience: brief.audience || null,
      platforms: Array.isArray(brief.platforms) ? brief.platforms.join(', ') : brief.platforms || null,
      productFocus: brief.productFocus || null,
      keyMessage: brief.keyMessage || null,
      callToAction: brief.callToAction || null,
      musicStyle: brief.musicStyle || null,
      captionStyle: brief.captionStyle || null,
      brandHandles: brief.brandHandles || null,
      avoid: brief.avoid || null,
      extraNotes: brief.extraNotes || null,
      answersJson: JSON.stringify(brief),
    });
    return { orderRef, orderId: Number(res.lastInsertRowid) };
  });

  return tx();
}

export function setStripeSession(orderId, sessionId) {
  getDb()
    .prepare("UPDATE orders SET stripe_session_id = ?, payment_status = 'pending' WHERE id = ?")
    .run(sessionId, orderId);
}

export function markPaidBySession(sessionId, subscriptionId = null) {
  getDb()
    .prepare(
      "UPDATE orders SET payment_status = 'paid', stripe_subscription_id = COALESCE(?, stripe_subscription_id) WHERE stripe_session_id = ?"
    )
    .run(subscriptionId, sessionId);
}

export function getOrderBySession(sessionId) {
  return getDb().prepare('SELECT * FROM orders WHERE stripe_session_id = ?').get(sessionId);
}

export function listOrders() {
  const db = getDb();
  return db
    .prepare(
      `SELECT o.*, b.main_character, b.main_character_notes, b.inspiration, b.inspiration_links,
              b.tone, b.goal, b.audience, b.platforms, b.product_focus, b.key_message,
              b.call_to_action, b.music_style, b.caption_style, b.brand_handles, b.avoid, b.extra_notes
       FROM orders o LEFT JOIN briefs b ON b.order_id = o.id
       ORDER BY o.created_at DESC`
    )
    .all();
}

export function updateOrderStatus(id, status) {
  const db = getDb();
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
}
