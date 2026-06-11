'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    price: '$300',
    sub: '10 short-form videos · one-time payment',
  },
  {
    id: 'monthly',
    name: 'Growth Plan',
    price: '$249/mo',
    sub: '10 videos/month for 12 months + creative & agency briefing',
  },
  {
    id: 'annual',
    name: 'Annual Pro',
    price: '$1,999',
    sub: 'Full year paid in advance — best value',
  },
];

const CHARACTER_OPTIONS = [
  { value: 'me-on-camera', title: '🎤 Me / our team on camera', desc: 'You or someone from your business presents' },
  { value: 'ai-spokesperson', title: '🤖 AI avatar spokesperson', desc: 'A polished digital presenter delivers your message' },
  { value: 'customer-style', title: '⭐ Customer / testimonial style', desc: 'Feels like a real customer sharing their experience' },
  { value: 'voiceover-broll', title: '🎬 Voiceover + product footage', desc: 'No face on camera — voice over product shots & b-roll' },
  { value: 'text-driven', title: '✍️ Text & motion graphics', desc: 'Bold captions, trends, and motion — no presenter' },
  { value: 'not-sure', title: '🤷 Not sure — recommend for me', desc: "We'll pick what fits your brand and goals" },
];

const TONE_OPTIONS = [
  'High-energy & hype',
  'Casual & friendly',
  'Professional & polished',
  'Funny / meme-style',
  'Inspirational',
  'Educational / how-to',
  'Luxury / premium',
  'Edgy & bold',
];

const GOAL_OPTIONS = [
  { value: 'sales', title: '💰 Drive sales', desc: 'Get viewers to buy a product or service' },
  { value: 'awareness', title: '📣 Brand awareness', desc: 'Get your name in front of new people' },
  { value: 'followers', title: '📈 Grow followers', desc: 'Build an audience on your channels' },
  { value: 'leads', title: '🧲 Generate leads', desc: 'Collect signups, bookings, or inquiries' },
  { value: 'launch', title: '🚀 Launch something new', desc: 'Promote a new product, offer, or location' },
  { value: 'mixed', title: '🎯 A mix of everything', desc: 'Balanced content across goals' },
];

const PLATFORM_OPTIONS = ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Facebook', 'LinkedIn'];

const MUSIC_OPTIONS = ['Trending sounds', 'Upbeat / energetic', 'Chill / lo-fi', 'Cinematic', 'Voice only, minimal music', 'No preference'];

const CTA_OPTIONS = ['Visit our website', 'Shop now / Buy now', 'Follow for more', 'DM / Contact us', 'Book a call or appointment', 'Visit us in person'];

const STEPS = ['Package', 'Your Info', 'Main Character', 'Style & Tone', 'Content Details', 'Review'];

export default function OrderWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPkg = ['starter', 'monthly', 'annual'].includes(searchParams.get('package'))
    ? searchParams.get('package')
    : '';

  const [step, setStep] = useState(initialPkg ? 1 : 0);
  const canceled = searchParams.get('canceled') === '1';
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [packageId, setPackageId] = useState(initialPkg);
  const [contact, setContact] = useState({ name: '', email: '', phone: '', businessName: '', website: '' });
  const [brief, setBrief] = useState({
    mainCharacter: '',
    mainCharacterNotes: '',
    tone: [],
    inspiration: '',
    inspirationLinks: '',
    goal: '',
    audience: '',
    platforms: [],
    productFocus: '',
    keyMessage: '',
    callToAction: '',
    musicStyle: '',
    captionStyle: '',
    brandHandles: '',
    avoid: '',
    extraNotes: '',
  });

  const setBriefField = (k, v) => setBrief((b) => ({ ...b, [k]: v }));
  const toggleInList = (k, v) =>
    setBrief((b) => ({
      ...b,
      [k]: b[k].includes(v) ? b[k].filter((x) => x !== v) : [...b[k], v],
    }));

  function validateStep(s) {
    if (s === 0 && !packageId) return 'Please choose a package to continue.';
    if (s === 1) {
      if (!contact.name.trim()) return 'Please enter your name.';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email)) return 'Please enter a valid email address.';
    }
    if (s === 2 && !brief.mainCharacter) return 'Pick who the main character should be — or choose "Not sure".';
    if (s === 3) {
      if (brief.tone.length === 0) return 'Pick at least one tone.';
      if (!brief.goal) return 'Pick a primary goal.';
    }
    if (s === 4 && brief.platforms.length === 0) return 'Pick at least one platform.';
    return '';
  }

  function next() {
    const msg = validateStep(step);
    if (msg) {
      setError(msg);
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0 });
  }

  function back() {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0 });
  }

  async function submit() {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId, contact, brief }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        router.push(`/order/success?ref=${encodeURIComponent(data.orderRef)}`);
      }
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  const pkg = PACKAGES.find((p) => p.id === packageId);
  const pct = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <>
      <nav className="nav">
        <div className="container nav-inner">
          <Link href="/" className="logo">
            <img src="/logo.png" alt="AutoCraft Studios logo" className="logo-img" />
            AutoCraft Studios
          </Link>
          <div className="nav-links">
            <Link href="/#pricing">Packages</Link>
          </div>
        </div>
      </nav>

      <div className="wizard-wrap">
        <div className="wizard-head">
          <h1>Start Your Order</h1>
          <p>A few quick questions so every video we craft feels unmistakably yours.</p>
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="progress-label">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </div>

        {canceled && step === 0 && (
          <div className="notice-msg">
            Checkout was canceled — no charge was made. Pick up where you left off whenever
            you&apos;re ready.
          </div>
        )}
        {error && <div className="error-msg">{error}</div>}

        {/* ---------- STEP 0: PACKAGE ---------- */}
        {step === 0 && (
          <div className="panel">
            <h2>Choose your package</h2>
            <p className="panel-sub">You can change this any time before you submit.</p>
            <div className="pkg-pick">
              {PACKAGES.map((p) => (
                <div
                  key={p.id}
                  className={`pkg-option ${packageId === p.id ? 'selected' : ''}`}
                  onClick={() => setPackageId(p.id)}
                >
                  <div>
                    <div className="pkg-name">{p.name}</div>
                    <div className="pkg-sub">{p.sub}</div>
                  </div>
                  <div className="pkg-price">{p.price}</div>
                </div>
              ))}
            </div>
            <div className="wizard-nav">
              <span />
              <button className="btn btn-primary" onClick={next}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ---------- STEP 1: CONTACT ---------- */}
        {step === 1 && (
          <div className="panel">
            <h2>Tell us about you</h2>
            <p className="panel-sub">
              {pkg ? `You're ordering the ${pkg.name} (${pkg.price}). ` : ''}
              We&apos;ll use this to deliver your videos and coordinate your briefing.
            </p>
            <div className="field">
              <label>Your name *</label>
              <input
                type="text"
                value={contact.name}
                onChange={(e) => setContact({ ...contact, name: e.target.value })}
                placeholder="Jane Smith"
              />
            </div>
            <div className="field">
              <label>Email *</label>
              <input
                type="email"
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
                placeholder="jane@yourbusiness.com"
              />
            </div>
            <div className="field">
              <label>Phone</label>
              <input
                type="tel"
                value={contact.phone}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="field">
              <label>Business name</label>
              <input
                type="text"
                value={contact.businessName}
                onChange={(e) => setContact({ ...contact, businessName: e.target.value })}
                placeholder="Your Business LLC"
              />
            </div>
            <div className="field">
              <label>Website or main social profile</label>
              <input
                type="text"
                value={contact.website}
                onChange={(e) => setContact({ ...contact, website: e.target.value })}
                placeholder="yourbusiness.com or @yourhandle"
              />
            </div>
            <div className="wizard-nav">
              <button className="btn btn-ghost" onClick={back}>
                ← Back
              </button>
              <button className="btn btn-primary" onClick={next}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ---------- STEP 2: MAIN CHARACTER ---------- */}
        {step === 2 && (
          <div className="panel">
            <h2>Who should the main character be?</h2>
            <p className="panel-sub">
              Every great short-form video has a face, a voice, or a focus. Who carries yours?
            </p>
            <div className="choice-grid">
              {CHARACTER_OPTIONS.map((o) => (
                <div
                  key={o.value}
                  className={`choice ${brief.mainCharacter === o.value ? 'selected' : ''}`}
                  onClick={() => setBriefField('mainCharacter', o.value)}
                >
                  <span className="choice-title">{o.title}</span>
                  <span className="choice-desc">{o.desc}</span>
                </div>
              ))}
            </div>
            <div className="field" style={{ marginTop: 22 }}>
              <label>Anything we should know about the main character?</label>
              <textarea
                value={brief.mainCharacterNotes}
                onChange={(e) => setBriefField('mainCharacterNotes', e.target.value)}
                placeholder='e.g. "Our founder Maria is great on camera", "AI presenter should feel young and energetic", "Feature our product in every shot"'
              />
            </div>
            <div className="wizard-nav">
              <button className="btn btn-ghost" onClick={back}>
                ← Back
              </button>
              <button className="btn btn-primary" onClick={next}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ---------- STEP 3: TONE / INSPIRATION / GOAL ---------- */}
        {step === 3 && (
          <div className="panel">
            <h2>Style, tone &amp; inspiration</h2>
            <p className="panel-sub">This shapes how your videos feel the moment someone stops scrolling.</p>

            <div className="field">
              <label>
                What tone fits your brand? <span className="hint">Pick up to 3.</span>
              </label>
              <div className="chip-row">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`chip ${brief.tone.includes(t) ? 'selected' : ''}`}
                    onClick={() => {
                      if (brief.tone.includes(t) || brief.tone.length < 3) toggleInList('tone', t);
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>What&apos;s the inspiration?</label>
              <textarea
                value={brief.inspiration}
                onChange={(e) => setBriefField('inspiration', e.target.value)}
                placeholder='Describe the vibe — "fast cuts like Gymshark ads", "calm and aesthetic like a coffee shop reel", "talking-head storytelling like Alex Hormozi"…'
              />
            </div>

            <div className="field">
              <label>Links to videos or accounts you love</label>
              <textarea
                value={brief.inspirationLinks}
                onChange={(e) => setBriefField('inspirationLinks', e.target.value)}
                placeholder={'Paste TikTok/Reels/Shorts links or @handles, one per line'}
              />
            </div>

            <div className="field">
              <label>What&apos;s the primary goal of these videos?</label>
              <div className="choice-grid">
                {GOAL_OPTIONS.map((o) => (
                  <div
                    key={o.value}
                    className={`choice ${brief.goal === o.value ? 'selected' : ''}`}
                    onClick={() => setBriefField('goal', o.value)}
                  >
                    <span className="choice-title">{o.title}</span>
                    <span className="choice-desc">{o.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="wizard-nav">
              <button className="btn btn-ghost" onClick={back}>
                ← Back
              </button>
              <button className="btn btn-primary" onClick={next}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ---------- STEP 4: CONTENT DETAILS ---------- */}
        {step === 4 && (
          <div className="panel">
            <h2>Content details</h2>
            <p className="panel-sub">Rough ideas are perfect — we&apos;ll shape them into scroll-stoppers.</p>

            <div className="field">
              <label>Where will these videos live?</label>
              <div className="chip-row">
                {PLATFORM_OPTIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`chip ${brief.platforms.includes(p) ? 'selected' : ''}`}
                    onClick={() => toggleInList('platforms', p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Who&apos;s your target audience?</label>
              <input
                type="text"
                value={brief.audience}
                onChange={(e) => setBriefField('audience', e.target.value)}
                placeholder='e.g. "Car enthusiasts 25-45", "local homeowners", "busy moms who shop online"'
              />
            </div>

            <div className="field">
              <label>What product or service should we feature?</label>
              <textarea
                value={brief.productFocus}
                onChange={(e) => setBriefField('productFocus', e.target.value)}
                placeholder="The product, service, or offer these videos should spotlight"
              />
            </div>

            <div className="field">
              <label>Key message or hook ideas</label>
              <textarea
                value={brief.keyMessage}
                onChange={(e) => setBriefField('keyMessage', e.target.value)}
                placeholder='What should viewers remember? e.g. "Fastest detail shop in town", "Handmade, ships in 24h"'
              />
            </div>

            <div className="field">
              <label>What should viewers do at the end?</label>
              <div className="chip-row">
                {CTA_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`chip ${brief.callToAction === c ? 'selected' : ''}`}
                    onClick={() => setBriefField('callToAction', brief.callToAction === c ? '' : c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Music style</label>
              <div className="chip-row">
                {MUSIC_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`chip ${brief.musicStyle === m ? 'selected' : ''}`}
                    onClick={() => setBriefField('musicStyle', brief.musicStyle === m ? '' : m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Brand handles, colors, or assets we should use</label>
              <input
                type="text"
                value={brief.brandHandles}
                onChange={(e) => setBriefField('brandHandles', e.target.value)}
                placeholder="@yourhandle · brand colors · logo location"
              />
            </div>

            <div className="field">
              <label>Anything to avoid?</label>
              <input
                type="text"
                value={brief.avoid}
                onChange={(e) => setBriefField('avoid', e.target.value)}
                placeholder='e.g. "No politics", "Don&apos;t mention pricing", "Avoid cheesy stock footage"'
              />
            </div>

            <div className="field">
              <label>Anything else we should know?</label>
              <textarea
                value={brief.extraNotes}
                onChange={(e) => setBriefField('extraNotes', e.target.value)}
                placeholder="Open floor — anything that helps us nail your videos"
              />
            </div>

            <div className="wizard-nav">
              <button className="btn btn-ghost" onClick={back}>
                ← Back
              </button>
              <button className="btn btn-primary" onClick={next}>
                Review Order →
              </button>
            </div>
          </div>
        )}

        {/* ---------- STEP 5: REVIEW ---------- */}
        {step === 5 && (
          <div className="panel">
            <h2>Review your order</h2>
            <p className="panel-sub">
              Look it over — then continue to secure checkout powered by Stripe. Production kicks
              off as soon as your payment is confirmed.
            </p>

            <div className="review-block">
              <h4>Package</h4>
              <div className="review-row">
                <span className="k">Plan</span>
                <span>
                  <strong>{pkg?.name}</strong> — {pkg?.price}
                </span>
              </div>
              <div className="review-row">
                <span className="k">Includes</span>
                <span>{pkg?.sub}</span>
              </div>
            </div>

            <div className="review-block">
              <h4>Contact</h4>
              <div className="review-row"><span className="k">Name</span><span>{contact.name}</span></div>
              <div className="review-row"><span className="k">Email</span><span>{contact.email}</span></div>
              {contact.phone && <div className="review-row"><span className="k">Phone</span><span>{contact.phone}</span></div>}
              {contact.businessName && <div className="review-row"><span className="k">Business</span><span>{contact.businessName}</span></div>}
              {contact.website && <div className="review-row"><span className="k">Website</span><span>{contact.website}</span></div>}
            </div>

            <div className="review-block">
              <h4>Creative Brief</h4>
              <div className="review-row">
                <span className="k">Main character</span>
                <span>{CHARACTER_OPTIONS.find((o) => o.value === brief.mainCharacter)?.title.replace(/^\S+\s/, '') || '—'}</span>
              </div>
              {brief.mainCharacterNotes && <div className="review-row"><span className="k">Character notes</span><span>{brief.mainCharacterNotes}</span></div>}
              <div className="review-row"><span className="k">Tone</span><span>{brief.tone.join(', ') || '—'}</span></div>
              {brief.inspiration && <div className="review-row"><span className="k">Inspiration</span><span>{brief.inspiration}</span></div>}
              {brief.inspirationLinks && <div className="review-row"><span className="k">Links</span><span>{brief.inspirationLinks}</span></div>}
              <div className="review-row">
                <span className="k">Goal</span>
                <span>{GOAL_OPTIONS.find((o) => o.value === brief.goal)?.title.replace(/^\S+\s/, '') || '—'}</span>
              </div>
              <div className="review-row"><span className="k">Platforms</span><span>{brief.platforms.join(', ') || '—'}</span></div>
              {brief.audience && <div className="review-row"><span className="k">Audience</span><span>{brief.audience}</span></div>}
              {brief.productFocus && <div className="review-row"><span className="k">Featuring</span><span>{brief.productFocus}</span></div>}
              {brief.keyMessage && <div className="review-row"><span className="k">Key message</span><span>{brief.keyMessage}</span></div>}
              {brief.callToAction && <div className="review-row"><span className="k">Call to action</span><span>{brief.callToAction}</span></div>}
              {brief.musicStyle && <div className="review-row"><span className="k">Music</span><span>{brief.musicStyle}</span></div>}
              {brief.brandHandles && <div className="review-row"><span className="k">Brand assets</span><span>{brief.brandHandles}</span></div>}
              {brief.avoid && <div className="review-row"><span className="k">Avoid</span><span>{brief.avoid}</span></div>}
              {brief.extraNotes && <div className="review-row"><span className="k">Notes</span><span>{brief.extraNotes}</span></div>}
            </div>

            <div className="wizard-nav">
              <button className="btn btn-ghost" onClick={back} disabled={submitting}>
                ← Back
              </button>
              <button className="btn btn-primary" onClick={submit} disabled={submitting}>
                {submitting ? 'Redirecting…' : 'Continue to Payment →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
