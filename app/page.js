import Link from 'next/link';
import VideoCarousel from './components/video-carousel';

export default function Home() {
  return (
    <>
      <nav className="nav">
        <div className="container nav-inner">
          <Link href="/" className="logo">
            <img src="/logo.png" alt="AutoCraft Studios logo" className="logo-img" />
            AutoCraft Studios
          </Link>
          <div className="nav-links">
            <a href="#why">Why Video</a>
            <a href="#pricing">Packages</a>
            <a href="#how">How It Works</a>
            <Link href="/order" className="btn btn-primary btn-sm">
              Start Your Order
            </Link>
          </div>
        </div>
      </nav>

      {/* ============ HERO / ABOVE THE FOLD ============ */}
      <header className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">Short-Form Video Production</span>
            <h1>
              Video is how products get <span className="highlight">discovered, trusted, and bought.</span>
            </h1>
            <p className="lede">
              A simple, scroll-stopping short-form video — produced quickly and built for TikTok,
              Reels, and Shorts — is the highest-leverage asset your social campaigns can have.
              We craft them for you, done-for-you, every month.
            </p>
            <div className="hero-ctas">
              <Link href="/order" className="btn btn-primary">
                Start Your Order →
              </Link>
              <a href="#pricing" className="btn btn-ghost">
                See Packages
              </a>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <div className="num">2.5×</div>
                <div className="label">more engagement than static posts</div>
              </div>
              <div className="stat">
                <div className="num">73%</div>
                <div className="label">of buyers prefer short video to learn about products</div>
              </div>
              <div className="stat">
                <div className="num">10</div>
                <div className="label">videos in every package</div>
              </div>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <VideoCarousel />
          </div>
        </div>
      </header>

      {/* ============ WHY VIDEO ============ */}
      <section className="section section-alt" id="why">
        <div className="container">
          <div className="section-head">
            <h2>What video does for your product</h2>
            <p>
              Short-form video isn&apos;t a nice-to-have anymore — it&apos;s where attention lives.
              Quick to produce, easy to post, and worth every second of watch time.
            </p>
          </div>
          <div className="why-grid">
            <div className="why-card">
              <div className="icon">🚀</div>
              <h3>Drives discovery</h3>
              <p>
                TikTok, Reels, and Shorts algorithms push video to people who&apos;ve never heard of
                you. One good 30-second clip can out-reach months of static posting.
              </p>
            </div>
            <div className="why-card">
              <div className="icon">🤝</div>
              <h3>Builds trust fast</h3>
              <p>
                Seeing a product in motion — used by a real person, with a real voice — converts
                skeptics into buyers far faster than photos and copy ever will.
              </p>
            </div>
            <div className="why-card">
              <div className="icon">⚡</div>
              <h3>Quick to produce, built to repurpose</h3>
              <p>
                Simple short-form video is fast to make and cheap to run. One batch fuels weeks of
                social campaigns across every platform you&apos;re on.
              </p>
            </div>
            <div className="why-card">
              <div className="icon">📊</div>
              <h3>You&apos;ll know what&apos;s working</h3>
              <p>
                We deliver the analytics on every video we produce — views, watch time, engagement,
                and clicks — so you see exactly what&apos;s working and what&apos;s not, and every
                batch gets smarter.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section className="section" id="pricing">
        <div className="container">
          <div className="section-head">
            <h2>Pick your package</h2>
            <p>
              Every order starts with a guided creative brief — you tell us who the main character
              is, the tone, the inspiration — and we craft videos that feel like your brand.
            </p>
          </div>
          <div className="pricing-grid">
            {/* Starter */}
            <div className="price-card">
              <div className="plan-name">Starter Pack</div>
              <div className="price">$300</div>
              <div className="price-detail">one-time payment</div>
              <ul>
                <li>10 short-form videos</li>
                <li>Built for TikTok, Reels &amp; Shorts</li>
                <li>Guided creative brief on order</li>
                <li>Your tone, your style, your brand</li>
                <li>Delivered ready to post</li>
                <li>Analytics report on all 10 videos</li>
              </ul>
              <Link href="/order?package=starter" className="btn btn-ghost">
                Choose Starter
              </Link>
              <div className="fine">$30 per video. Perfect for testing the waters.</div>
            </div>

            {/* Monthly */}
            <div className="price-card featured">
              <div className="popular-pill">MOST POPULAR</div>
              <div className="plan-name">Growth Plan</div>
              <div className="price">$249<span style={{ fontSize: 20, fontWeight: 700 }}>/mo</span></div>
              <div className="price-detail">12 months · billed monthly</div>
              <ul>
                <li>10 new videos every month</li>
                <li>120 videos over 12 months</li>
                <li>Kick-off creative briefing session</li>
                <li>Agency briefing to launch your strategy</li>
                <li>Monthly content refresh aligned to campaigns</li>
                <li>Monthly analytics on every video — double down on what works</li>
                <li>Priority production queue</li>
              </ul>
              <Link href="/order?package=monthly" className="btn btn-primary">
                Choose Growth
              </Link>
              <div className="fine">Under $25 per video, with strategy included.</div>
            </div>

            {/* Annual */}
            <div className="price-card">
              <div className="plan-name">Annual Pro</div>
              <div className="price">$1,999</div>
              <div className="price-detail">one year · paid in advance</div>
              <ul>
                <li>Everything in the Growth Plan</li>
                <li>Monthly analytics on every video</li>
                <li>Full year locked in, one payment</li>
                <li>Save $989 vs. paying monthly</li>
                <li>Kick-off creative &amp; agency briefing</li>
                <li>Best per-video value we offer</li>
              </ul>
              <Link href="/order?package=annual" className="btn btn-ghost">
                Choose Annual
              </Link>
              <div className="fine">The committed-brand discount. ~$16 per video.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="section section-alt" id="how">
        <div className="container">
          <div className="section-head">
            <h2>How it works</h2>
            <p>From order to posted-and-performing in four simple steps.</p>
          </div>
          <div className="steps-grid">
            <div className="step">
              <div className="step-num">1</div>
              <h3>Pick a package</h3>
              <p>Choose the plan that fits where your brand is right now.</p>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <h3>Answer the brief</h3>
              <p>
                A quick guided Q&amp;A: who&apos;s the main character, what&apos;s the inspiration,
                what tone fits your brand.
              </p>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <h3>We produce</h3>
              <p>Our studio crafts your videos — scripted, voiced, and formatted for every platform.</p>
            </div>
            <div className="step">
              <div className="step-num">4</div>
              <h3>Post, measure &amp; grow</h3>
              <p>
                Delivered ready to publish — then we hand you the analytics on every video, so you
                know what&apos;s working and what&apos;s not.
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <Link href="/order" className="btn btn-primary">
              Start Your Order →
            </Link>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container footer-inner">
          <div className="logo" style={{ fontSize: 15 }}>
            <img src="/logo.png" alt="" className="logo-img logo-img-sm" />
            AutoCraft Studios
          </div>
          <div>
            We bridge the gap between technology and growth. © {new Date().getFullYear()} AutoCraft
            Studios
          </div>
        </div>
      </footer>
    </>
  );
}
