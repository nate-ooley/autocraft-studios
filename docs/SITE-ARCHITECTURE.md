# AutoCraft Studios — Order Site Architecture

Customer-facing site for selling short-form video production packages, capturing a
guided creative brief with every order, taking payment through Stripe, and giving
the studio an admin dashboard to run production from.

- **Live site:** https://autocraft-studios-nateooley68-gmailcoms-projects.vercel.app
- **Repository:** https://github.com/nate-ooley/autocraft-studios (private)
- **Local dev:** `npm install && npm run dev` → http://localhost:3000

---

## 1. Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server components + API routes in one deployable app |
| UI | React 19, plain CSS (`app/globals.css`) | No CSS framework — one stylesheet, full design control |
| Fonts | Poppins (headings), Nunito (body) via `next/font/google` | Matches autocraftstudios.com brand typography |
| Database | Turso / libSQL (`@libsql/client`) | Hosted SQLite — durable across Vercel's stateless functions; same SQL dialect as local dev (file fallback) |
| Payments | Stripe Checkout (hosted) | No card data ever touches the app; PCI burden stays with Stripe |
| Hosting | Vercel (project `autocraft-studios`) | Serverless deploy from the repo |

## 2. Repository layout

```
.
├── app/
│   ├── layout.js                  # Root layout: fonts, metadata, favicon
│   ├── globals.css                # Entire design system (brand tokens in :root)
│   ├── page.js                    # Landing page (server component)
│   ├── components/
│   │   └── video-carousel.js      # Hero iPhone mockup + 5-video carousel (client)
│   ├── order/
│   │   ├── page.js                # Wizard wrapper (Suspense for useSearchParams)
│   │   ├── wizard.js              # 6-step order wizard (client)
│   │   └── success/page.js        # Confirmation + Stripe payment verification
│   ├── admin/
│   │   ├── page.js                # Order dashboard (server component, cookie-gated)
│   │   ├── login-form.js          # Password form (client)
│   │   └── status-buttons.js      # New → In Production → Delivered (client)
│   └── api/
│       ├── orders/route.js        # POST: create order + Stripe Checkout session
│       ├── admin/login/route.js   # POST: set admin auth cookie
│       ├── admin/orders/route.js  # PATCH: update order status (admin only)
│       └── stripe/webhook/route.js# POST: checkout.session.completed handler
├── lib/
│   ├── db.js                      # SQLite connection, schema, queries, PACKAGES
│   ├── stripe.js                  # Stripe client, pricing config, checkout, 12-mo cap
│   └── auth.js                    # Admin cookie check (ADMIN_PASSWORD)
├── public/
│   ├── logo.png                   # Brand logo (extracted from autocraftstudios.com)
│   └── videos/                    # 5 carousel videos (540x960 H.264, ~2-4MB each)
├── data/                          # SQLite file (gitignored, created on first run)
└── docs/                          # This doc + HeyGen fulfillment pipeline plan
```

## 3. Brand system

All design tokens live in `:root` of `app/globals.css`:

| Token | Value | Use |
|---|---|---|
| `--accent` | `#2e67cd` | Primary blue (buttons, links, selected states) |
| `--teal` | `#1ba3bd` | Secondary teal (gradients, eyebrow labels) |
| `--grad` | teal → blue gradient | Primary buttons, step numbers, highlights |
| `--text` | `#2c3345` | Navy body text |
| `--bg` | `#f6f9fc` | Light page background |

Brand name is spelled **AutoCraft Studios** (one word "AutoCraft"). The logo is the
teal 3D orbit-"A" mark. Footer tagline: "We bridge the gap between technology and
growth."

## 4. Pages & user flow

### Landing page `/`
Above the fold: headline ("Video is how products get discovered, trusted, and
bought"), value copy, CTAs, engagement stats, and the **hero video carousel** — a
CSS-built iPhone mockup (titanium frame, Dynamic Island, hardware buttons, home
indicator) playing 5 real client videos. Carousel supports arrows, dots, touch
swipe, and a sound toggle (videos autoplay muted per browser policy; the speaker
button unmutes and the choice persists across slides, falling back to muted if the
browser blocks unmuted playback).

Below the fold: "What video does for your product" (4 cards: discovery, trust,
speed, **analytics** — we deliver per-video analytics so clients know what's
working), 3-tier pricing, and a 4-step "How it works."

### Order wizard `/order`
Six steps, client-side state, validation per step:

1. **Package** — Starter / Growth / Annual (deep-linkable: `/order?package=monthly`
   skips this step)
2. **Your Info** — name*, email*, phone, business, website
3. **Main Character** — owner on camera, AI avatar, testimonial style,
   voiceover + b-roll, text/motion graphics, or "recommend for me" + free notes
4. **Style & Tone** — up to 3 tone chips, inspiration description, inspiration
   links, primary goal
5. **Content Details** — platforms*, audience, product focus, key message/hooks,
   CTA, music style, brand assets, things to avoid, open notes
6. **Review** — full summary → "Continue to Payment"

On submit the wizard POSTs everything to `/api/orders` and redirects to the Stripe
Checkout URL (or straight to the success page when Stripe isn't configured).
`?canceled=1` (Stripe's cancel return) shows a "no charge was made" notice.

### Success `/order/success`
Shows the order reference. If a `session_id` query param is present, the page
retrieves the Checkout session server-side, marks the order paid, and (for
subscriptions) caps the subscription at 12 cycles. Copy adapts to paid vs.
pending-payment.

### Admin `/admin`
Cookie-gated dashboard. Lists every order (newest first) with package, contact,
payment pill (Paid / Payment Pending / Unpaid), production status pill, the full
creative brief, and a one-click status advance (New → In Production → Delivered).

## 5. Packages & pricing

| Package | Price | Stripe mode | Contents |
|---|---|---|---|
| Starter Pack | $300 | `payment` (one-time) | 10 short-form videos + analytics report |
| Growth Plan | $249/mo × 12 | `subscription`, capped at 12 cycles | 10 videos/month, creative + agency briefing, monthly analytics |
| Annual Pro | $1,999 | `payment` (one-time) | Growth Plan for a full year, prepaid (saves $989) |

Pricing is defined twice by design: display copy in `lib/db.js` (`PACKAGES`) and
Stripe amounts in `lib/stripe.js` (`STRIPE_PRICING`). Change both when prices move.

## 6. Database

SQLite file at `data/autocraft.db` locally; on Vercel at `/tmp/autocraft-data/`
(see §9 limitations). Schema is created/migrated automatically on first connection
(`lib/db.js` — `CREATE TABLE IF NOT EXISTS` plus guarded `ALTER TABLE` for columns
added after launch).

```sql
orders (
  id INTEGER PRIMARY KEY,
  order_ref TEXT UNIQUE,          -- e.g. ACS-MQ9L179H-3FW2 (shown to customer)
  package_id / package_name / package_price,
  name, email, phone, business_name, website,
  status TEXT DEFAULT 'new',      -- new | in_production | delivered
  payment_status TEXT DEFAULT 'unpaid',  -- unpaid | pending | paid
  stripe_session_id TEXT,
  stripe_subscription_id TEXT,
  created_at TEXT
)

briefs (
  id INTEGER PRIMARY KEY,
  order_id REFERENCES orders(id),
  main_character, main_character_notes,
  inspiration, inspiration_links,
  tone, goal, audience, platforms,
  product_focus, key_message, call_to_action,
  music_style, caption_style, brand_handles, avoid, extra_notes,
  answers_json TEXT,              -- raw JSON copy of the whole brief
  created_at TEXT
)
```

The brief is stored both as columns (queryable) and as `answers_json` (lossless),
so it can feed the HeyGen production pipeline (`docs/VIDEO-PIPELINE-PLAN.md`)
without schema friction.

## 7. Payments (Stripe)

Flow:

```
wizard submit
  → POST /api/orders
      1. validate, insert order + brief        (order survives even if Stripe fails)
      2. stripe.checkout.sessions.create        (inline price_data — no dashboard setup)
      3. save session id, payment_status='pending'
      4. return { orderRef, paymentUrl }
  → browser redirects to Stripe Checkout
  → customer pays
  ├─ returns to /order/success?session_id=...   → server verifies session → paid
  └─ webhook checkout.session.completed         → backstop if they never return
```

Details:

- **Growth Plan 12-month cap** — Checkout can't end a subscription after N cycles,
  so `capSubscriptionAt12Months()` sets `cancel_at` (start + 12 months) on the
  subscription after payment. Called from both the success page and the webhook;
  idempotent (skips if `cancel_at` already set).
- **Sale details stored on payment** — `saleDetailsFromSession()` extracts
  amount, currency, payment intent, and subscription id; `markPaidBySession()`
  writes them with a `paid_at` stamp. Idempotent: the success page and the webhook
  both call it, COALESCE keeps the first paid write.
- **No key configured** → `getStripe()` returns null, orders are captured as
  Unpaid, the buyer sees "we'll reach out to confirm payment." The site never
  breaks for a missing key.
- **Webhook** (`/api/stripe/webhook`) verifies the `stripe-signature` header
  against `STRIPE_WEBHOOK_SECRET`; returns 501 when unconfigured, 400 on bad
  signature, 500 on a handler error (so Stripe retries rather than dropping a sale).
- Test card: `4242 4242 4242 4242`, any future expiry/CVC.
- **Status: wired and verified in TEST mode** on production (June 13, 2026). To
  take real money, swap `STRIPE_SECRET_KEY` to the `sk_live_` key AND register a
  new webhook endpoint in **live** mode (test webhook secrets don't validate live
  events), then update `STRIPE_WEBHOOK_SECRET` and redeploy.

## 8. Auth (admin)

`POST /api/admin/login` checks the password (constant-time compare) against
`ADMIN_PASSWORD` — **no hardcoded fallback**, so a misconfigured deploy fails
closed. On success it sets an httpOnly, SameSite=Lax cookie holding an
**HMAC-signed, 30-day-expiring session token** (not the password itself), marked
Secure over HTTPS. `lib/auth.js` verifies the token signature + expiry on every
admin request. The login route has best-effort per-IP rate limiting. Local dev
uses a dev placeholder password; production uses a strong `ADMIN_PASSWORD` in Vercel.
Single-admin by design.

## 9. Deployment

- **Git:** local repo has two remotes — `origin` (heygen-video-pipeline, the
  original project) and `autocraft` (github.com/nate-ooley/autocraft-studios, where
  this site lives). Push site changes to `autocraft`.
- **Vercel:** project `autocraft-studios`. Deploy with `npx vercel deploy --prod --yes`
  from the repo root (the `.vercel/` link config is gitignored). Deployment
  Protection is **disabled** — the site is publicly reachable for user feedback.
- **Env vars (Vercel → Settings → Environment Variables):**

| Variable | Status | Purpose |
|---|---|---|
| `ADMIN_PASSWORD` | ✅ set (production) | Admin dashboard login |
| `DATABASE_URL` | ✅ set (prod + dev) | Turso libsql:// connection URL |
| `DATABASE_AUTH_TOKEN` | ✅ set (prod + dev) | Turso auth token |
| `STRIPE_SECRET_KEY` | ✅ set — **test key** (production) | Enables Checkout; swap to `sk_live_` to go live |
| `STRIPE_WEBHOOK_SECRET` | ✅ set — **test webhook** (production) | Webhook signature verification |

Database provisioned with the `turso` CLI: `turso db create autocraft-studios`,
then `turso db tokens create autocraft-studios`. Locally, leave the `DATABASE_*`
vars unset to use the `./data/autocraft.db` file.

### Known limitations / next steps

1. **Stripe is in TEST mode.** Real cards aren't charged yet — see §7 for the
   go-live swap (live key + live-mode webhook).
2. **No email notifications** — new orders are only visible in `/admin`. A
   transactional email (Resend/Postmark) on order creation is the natural next add.
3. **Rate limiting is per-instance** (in-memory). Fine at this scale; move to a
   shared store (Upstash) if abuse becomes a concern.

## 10. Hero video pipeline

Carousel videos are produced client work, compressed for web before committing:

```bash
ffmpeg -i input.mp4 -vf scale=540:960 -c:v libx264 -crf 27 -preset medium \
       -movflags +faststart -c:a aac -b:a 96k public/videos/name.mp4
```

(540×960 ≈ 2-4MB per ~40s clip; `+faststart` enables instant streaming. A static
ffmpeg binary is available via `pip install imageio-ffmpeg` if none is installed.)
Then add one line to the `VIDEOS` array in `app/components/video-carousel.js`.

## 11. Relationship to the HeyGen fulfillment pipeline

This site is the **order intake** side of the business. Fulfillment — generating
the videos with Claude scripts + HeyGen avatars and distributing via GoHighLevel —
is designed separately in `docs/VIDEO-PIPELINE-PLAN.md`. The brief's structured
fields (main character, tone, goal, platforms, hooks, CTA) map directly onto that
pipeline's script-generation inputs; `answers_json` carries anything the columns
don't.
