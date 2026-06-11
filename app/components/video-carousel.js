'use client';

import { useRef, useState } from 'react';

// Drop new videos in public/videos/ and add them here (slot 0 plays first).
// Keep them compressed for the web: 540x960 H.264, ~2-4MB.
const VIDEOS = [
  { src: '/videos/marisols-kitchen.mp4', title: "Marisol's Kitchen — The Birria Girl" },
  { src: '/videos/dreamcloud-haven.mp4', title: 'DreamCloud Haven — UGC Review' },
  { src: '/videos/cookie-impulse-buy.mp4', title: 'The Cookie Impulse Buy' },
  { src: '/videos/veloran-ev.mp4', title: '2026 Veloran — The EV I Kept' },
  { src: '/videos/glowrx-serum.mp4', title: 'GlowRx Barrier Serum — 28-Day Journey' },
];

export default function VideoCarousel() {
  const [index, setIndex] = useState(0);
  const touchX = useRef(null);
  const count = VIDEOS.length;
  const current = VIDEOS[index];

  const go = (dir) => setIndex((i) => (i + dir + count) % count);

  function onTouchStart(e) {
    touchX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e) {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchX.current = null;
  }

  return (
    <div className="carousel">
      <button className="carousel-arrow" aria-label="Previous video" onClick={() => go(-1)}>
        ‹
      </button>

      <div className="phone" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <span className="phone-btn phone-btn-mute" />
        <span className="phone-btn phone-btn-volup" />
        <span className="phone-btn phone-btn-voldown" />
        <span className="phone-btn phone-btn-power" />
        <div className="phone-screen">
          <div className="phone-island" />
          {current ? (
            <video
              key={current.src}
              className="phone-video"
              src={current.src}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
          ) : (
            <div className="phone-placeholder">
              <div className="play">▶</div>
              <div className="phone-caption">Next video dropping soon</div>
              <div className="phone-tags">#TikTok #Reels #Shorts</div>
            </div>
          )}
          {current && <div className="phone-overlay">{current.title}</div>}
          <div className="phone-home-indicator" />
        </div>
        <div className="phone-badge badge-1">
          <span className="dot" /> Posted to 4 platforms
        </div>
        <div className="phone-badge badge-2">🔥 10 videos delivered</div>
      </div>

      <button className="carousel-arrow" aria-label="Next video" onClick={() => go(1)}>
        ›
      </button>

      <div className="carousel-dots">
        {VIDEOS.map((v, i) => (
          <button
            key={i}
            className={`carousel-dot ${i === index ? 'active' : ''}`}
            aria-label={`Video ${i + 1}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}
