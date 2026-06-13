# Auto Craft Studios — Order Site

Customer-facing order site for short-form video production packages, with a guided
creative-brief questionnaire and an admin dashboard backed by SQLite.

**Full architecture documentation:** [docs/SITE-ARCHITECTURE.md](docs/SITE-ARCHITECTURE.md)

## Packages

| Package | Price | Includes |
|---|---|---|
| Starter Pack | $300 one-time | 10 short-form videos |
| Growth Plan | $249/mo × 12 months | 10 videos/month + creative & agency briefing |
| Annual Pro | $1,999/year prepaid | Everything in Growth, full year up front |

## Run it

```bash
npm install
npm run dev        # development on http://localhost:3000
# or
npm run build && npm start
```

## Pages

- `/` — landing page (hero, why-video, pricing, how it works)
- `/order` — 6-step order wizard: package → contact → main character → tone/inspiration/goal → content details → review. Deep-linkable: `/order?package=starter|monthly|annual`
- `/order/success` — confirmation with order reference
- `/admin` — order dashboard (password-protected). Shows every order with its full creative brief; advance status New → In Production → Delivered.

## Admin password

Set `ADMIN_PASSWORD` in your environment (or a `.env.local` file):

```
ADMIN_PASSWORD=your-strong-password
```

If unset, it falls back to the development default `autocraft2026` — **change this before going live.**

## Database

**Turso / libSQL** (hosted SQLite) in production; a local SQLite file
(`data/autocraft.db`, gitignored) in dev — same driver and SQL either way.

- Production: set `DATABASE_URL` + `DATABASE_AUTH_TOKEN` (from `turso db create` /
  `turso db tokens create`). Already configured in Vercel.
- Local: leave those unset — it falls back to `data/autocraft.db` automatically.

Tables:
- `orders` — order ref, package, contact, status, **payment_status, amount_total,
  currency, stripe ids, paid_at**, timestamp
- `briefs` — the creative brief answers plus a full `answers_json` copy

Inspect production with: `turso db shell autocraft-studios 'SELECT * FROM orders;'`

## Stripe payments

Set `STRIPE_SECRET_KEY` in `.env.local`. On order submit, the buyer is redirected to
Stripe Checkout:

- **Starter** ($300) and **Annual Pro** ($1,999) — one-time payments
- **Growth Plan** ($249/mo) — a monthly subscription automatically scheduled to end
  after 12 cycles (`cancel_at` is set when checkout completes)

Prices are created inline (`price_data`), so nothing needs pre-configuring in the
Stripe dashboard. Payment is confirmed two ways:

1. The success page verifies the Checkout session server-side on redirect.
2. Optionally, set `STRIPE_WEBHOOK_SECRET` and point a Stripe webhook
   (`checkout.session.completed`) at `/api/stripe/webhook` — this catches buyers who
   pay but never return to the site. Recommended for production.

If `STRIPE_SECRET_KEY` is unset, orders are still captured (marked Unpaid) and the
buyer is told you'll reach out to confirm payment.

Test cards: `4242 4242 4242 4242`, any future expiry, any CVC.

**Currently in test mode.** To take real payments: set `STRIPE_SECRET_KEY` to your
`sk_live_` key in Vercel, register a new webhook endpoint in **live** mode (a
test-mode webhook secret won't validate live events), update
`STRIPE_WEBHOOK_SECRET`, and redeploy.

## Notes
- The creative brief is stored both as structured columns and raw JSON, so it can feed
  the HeyGen production pipeline (`docs/VIDEO-PIPELINE-PLAN.md`) directly.
