# Programmatic Video Production Pipeline — Development Plan

## Executive Summary

Automated system producing **3-4 avatar videos per day** using your existing HeyGen Business account (with built-in ElevenLabs voices), Claude API for scriptwriting, and GoHighLevel Social Planner for multi-platform distribution. Orchestrated by **n8n on your Hostinger VPS**.

**No separate ElevenLabs account needed.** HeyGen Business includes ElevenLabs voices natively — your cloned voice and avatar are already configured there.

---

## Simplified Architecture

```
┌──────────────┐    ┌───────────────┐    ┌──────────────┐    ┌───────────────────┐    ┌──────────────┐
│ Google Sheet  │───▶│  Claude API   │───▶│  HeyGen API  │───▶│  Download MP4     │───▶│ GHL Social   │
│ Topic Queue   │    │  Script Gen   │    │  Avatar+Voice │    │  (poll til done)  │    │ Planner API  │
└──────────────┘    └───────────────┘    └──────────────┘    └───────────────────┘    └──────────────┘
     cron trigger        Sonnet 4.6        Your avatar         video_url → S3          Multi-platform
     4x/day              structured JSON    Your voice          or direct URL           scheduled post
```

**Total services: 4** — Google Sheets, Claude API, HeyGen API, GoHighLevel API
**Orchestrator:** n8n (already on your Hostinger VPS)

---

## Why You Don't Need ElevenLabs Separately

HeyGen Business includes ElevenLabs voices in its voice library. When you call `GET https://api.heygen.com/v2/voices`, your cloned voice will appear with a `voice_id`. You pass that `voice_id` directly in the video generation request. HeyGen handles all TTS internally — no separate ElevenLabs API key, no extra cost, no audio file handoff.

---

## Why n8n Is Worth Using (You Already Have It)

You already have n8n on your Hostinger VPS. Here's why it's the right orchestrator vs. doing this in custom code:

| What n8n gives you | Why it matters for this pipeline |
|-------|------|
| **Cron triggers** | Fire 4 workflows/day at exact times with zero crontab management |
| **Visual polling loop** | HeyGen renders take 5-15 min; n8n's Wait + Switch nodes handle this cleanly |
| **Error handling UI** | See exactly which step failed, retry from that point |
| **Credential vault** | Store HeyGen, Claude, GHL API keys in one secure place |
| **Webhook receiver** | HeyGen can POST to n8n when video is done (faster than polling) |
| **Google Sheets node** | Built-in, no code needed to read/write your content calendar |

**Verdict:** n8n is not overhead here — it's the glue. You'd have to rebuild all of this in code otherwise.

---

## The Pipeline: Step by Step

### Step 1 — Topic Queue (Google Sheet)

| Column | Purpose | Example |
|--------|---------|---------|
| A: `topic` | Video subject | "5 AI tools every realtor needs" |
| B: `style_notes` | Tone/angle guidance | "casual, under 90 seconds, end with CTA" |
| C: `platforms` | Where to post | "youtube,instagram,tiktok,linkedin" |
| D: `status` | Pipeline state | `queued` → `scripted` → `rendering` → `rendered` → `posted` |
| E: `video_id` | HeyGen video ID | `abc123...` |
| F: `video_url` | Download URL | `https://...mp4` |
| G: `posted_at` | Timestamp | `2026-04-17T08:00:00Z` |
| H: `error` | Failure details | empty or error message |

### Step 2 — Script Generation (Claude API)

n8n HTTP Request node calls Claude API with a system prompt that forces structured output:

**System prompt (stored in n8n as a static text field):**
```
You are a video scriptwriter. Given a topic, write a short-form video script
for an AI avatar to deliver on camera. Output ONLY valid JSON:

{
  "title": "video title for social post",
  "script": "the full spoken script, 60-90 seconds when read aloud at natural pace",
  "description": "social media post caption, 2-3 sentences with a hook",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "thumbnail_text": "short punchy overlay text for thumbnail"
}

Rules:
- Script must open with a hook in the first sentence
- Conversational tone, as if speaking directly to camera
- End with a clear call to action
- No stage directions, just the spoken words
- Keep under 200 words for a 60-90 second delivery
```

**Claude API call:**
```
POST https://api.anthropic.com/v1/messages
Headers: x-api-key, anthropic-version: 2023-06-01
Body: {
  "model": "claude-sonnet-4-6-20250514",
  "max_tokens": 1024,
  "system": "<system prompt above>",
  "messages": [{ "role": "user", "content": "Topic: {{topic}}\nStyle: {{style_notes}}" }]
}
```

### Step 3 — Video Generation (HeyGen API)

Use your existing avatar and voice. No ElevenLabs needed.

**First, get your IDs (one-time setup):**
```
GET https://api.heygen.com/v2/avatars
→ Find your avatar_id

GET https://api.heygen.com/v2/voices
→ Find your voice_id (your cloned voice appears here)
```

**Generate video:**
```
POST https://api.heygen.com/v2/video/generate
Headers: x-api-key: <your_heygen_key>
Body: {
  "video_inputs": [{
    "character": {
      "type": "avatar",
      "avatar_id": "YOUR_AVATAR_ID",
      "avatar_style": "normal"
    },
    "voice": {
      "type": "text",
      "voice_id": "YOUR_VOICE_ID",
      "input_text": "{{script from Claude}}",
      "speed": 1.0
    },
    "background": {
      "type": "color",
      "value": "#f0f0f0"
    }
  }],
  "dimension": { "width": 1080, "height": 1920 },
  "callback_url": "https://your-n8n-instance.com/webhook/heygen-done"
}
```

Response: `{ "data": { "video_id": "xxx" } }`

**Dimension presets:**
- Shorts/Reels/TikTok: `1080 x 1920` (9:16)
- YouTube landscape: `1920 x 1080` (16:9)
- LinkedIn/Facebook square: `1080 x 1080` (1:1)

### Step 4 — Wait for Render

**Option A: Webhook (preferred, faster)**
HeyGen POSTs to your n8n webhook URL when done. n8n picks up immediately.

**Option B: Polling (fallback)**
```
GET https://api.heygen.com/v1/video_status.get?video_id={{video_id}}
```
Poll every 60 seconds. Status values: `pending` → `processing` → `completed` (or `failed`).

On `completed`, response includes `video_url` (expires in 7 days — download immediately).

### Step 5 — Distribution via GoHighLevel

**GHL Social Planner API:**
```
POST https://services.leadconnectorhq.com/social-media-posting/{{locationId}}/posts
Headers:
  Authorization: Bearer {{ghl_access_token}}
  Content-Type: application/json
  Version: 2021-07-28
Body: {
  "accountIds": ["fb_account_id", "ig_account_id", "yt_account_id", "tiktok_account_id"],
  "summary": "{{title}}\n\n{{description}}\n\n{{hashtags}}",
  "mediaUrls": ["{{video_url}}"],
  "postType": "video",
  "scheduledAt": "2026-04-17T12:00:00Z"
}
```

**Required GHL scopes:** `socialplanner/post.write`, `socialplanner/account.readonly`

**Platform-specific notes:**

| Platform | Video Limits | Rate Limits |
|----------|-------------|-------------|
| YouTube | 256 GB, 12 hrs max | No specific limit |
| Instagram Reels | 300 MB, 3s-15min, 1920px min width | Per account limits |
| Facebook Reels | 1 GB, 3s-90s, min 540x960 | 30 reels/24hrs |
| TikTok Business | 1 GB, 3s-10min, MOV/MP4/WebM | Unlimited (business) |
| LinkedIn | 500 MB, 3s-30min, MOV/MP4 | 200 posts/24hrs |

**Strategy for platform variants:**
For each video, hit the create post API multiple times with different `accountIds` and tailored `summary` text per platform. This lets you customize captions for each channel.

### Step 6 — Status Tracking

Update Google Sheet:
- Set `status` = `posted`
- Store `video_url`
- Store `posted_at` timestamp
- On failure: set `status` = `failed`, write error to `error` column

---

## Distribution Deep Dive — Best Approach

### Recommended: GHL Social Planner as Primary Hub

**Why GHL wins for you:**
1. Already in your ecosystem — no new tool
2. Single API handles YouTube, Instagram, Facebook, TikTok, LinkedIn, Google Business Profile
3. Scheduling built in — set `scheduledAt` to control exact post time
4. Media hosting handled — pass video URL, GHL handles platform-specific upload
5. Analytics in GHL dashboard — track engagement alongside your CRM data

**When to consider alternatives:**

| Scenario | Solution |
|----------|----------|
| GHL TikTok posting is unreliable | Add direct TikTok API via n8n HTTP node |
| Need YouTube-specific features (chapters, cards, end screens) | Supplement with YouTube Data API for metadata |
| Want cross-platform analytics in one place | Add Buffer ($15/mo) alongside GHL |
| Need approval workflow before posting | Add Slack notification with approve/reject buttons in n8n |

### Posting Schedule (3-4 videos/day)

```
Batch 1:  6:00 AM — n8n triggers → Script → Render → Post at  8:00 AM
Batch 2: 10:00 AM — n8n triggers → Script → Render → Post at 12:00 PM
Batch 3:  2:00 PM — n8n triggers → Script → Render → Post at  5:00 PM
Batch 4:  6:00 PM — n8n triggers → Script → Render → Post at  8:00 PM (optional)
```

Each batch takes ~20-30 minutes end-to-end (script: 10s, render: 5-15min, post: 10s).

---

## Budget (Revised — HeyGen-Only Pipeline)

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| n8n | $0 | Already self-hosted on Hostinger VPS |
| Claude API | $5-10 | ~100 script generations/mo |
| HeyGen Business | Included | Your existing plan covers API access |
| HeyGen credits (if usage exceeds plan) | $0.50-0.99/credit | 1 credit = 1 min standard render |
| GoHighLevel | Included | Your existing plan |
| Google Sheets | $0 | Free |
| **Total additional cost** | **~$5-10/mo** | Just Claude API on top of existing subscriptions |

---

## n8n Workflow Design

The workflow file is at: `docs/n8n-video-pipeline-workflow.json`

### Workflow nodes (in order):

1. **Cron Trigger** — Fires 4x/day
2. **Google Sheets — Read Row** — Get next `queued` topic
3. **IF — Topic Found?** — Skip if no queued topics
4. **Google Sheets — Update Status** — Set to `scripted`
5. **HTTP Request — Claude API** — Generate script JSON
6. **JSON Parse** — Extract script, title, description, hashtags
7. **HTTP Request — HeyGen Generate** — Create avatar video
8. **Google Sheets — Save video_id** — Store for tracking
9. **Wait** — 60 seconds initial wait
10. **HTTP Request — HeyGen Status** — Check render status
11. **Switch — Status Check** — Route by: completed / processing / failed
12. **Loop back to Wait** — If still processing (max 20 iterations)
13. **HTTP Request — GHL Post (YouTube)** — Post to YouTube
14. **HTTP Request — GHL Post (Instagram)** — Post to Instagram
15. **HTTP Request — GHL Post (TikTok)** — Post to TikTok
16. **HTTP Request — GHL Post (LinkedIn)** — Post to LinkedIn
17. **Google Sheets — Final Update** — Status = `posted`, save URLs
18. **Error Handler** — On any failure: update sheet, send Slack alert

---

## Implementation Phases

### Phase 1: Prove the Core (Days 1-2)
- [ ] Call `GET /v2/avatars` and `GET /v2/voices` to get your IDs
- [ ] Manually test Claude API → HeyGen API → video download (via curl/Postman)
- [ ] Confirm your voice and avatar render correctly
- [ ] Import the n8n workflow JSON, configure credentials

### Phase 2: Wire Up Distribution (Days 3-4)
- [ ] Connect GHL Social Planner accounts (YouTube, Instagram, TikTok, LinkedIn, Facebook)
- [ ] Get your GHL `locationId` and platform `accountIds`
- [ ] Test posting a video manually via GHL API
- [ ] Wire the GHL posting nodes into the n8n workflow

### Phase 3: Full Pipeline Test (Days 5-6)
- [ ] Load 5 topics into Google Sheet
- [ ] Run workflow manually — verify all 5 produce posted videos
- [ ] Check each platform for correct caption, hashtags, video quality
- [ ] Fix any issues with aspect ratios or platform limits

### Phase 4: Automate & Harden (Days 7-10)
- [ ] Enable cron triggers (4x/day)
- [ ] Add error handling: retry on API failures, Slack alerts on hard failures
- [ ] Add human review gate (optional): Slack button to approve before posting
- [ ] Run for 1 week with monitoring before going fully hands-off
- [ ] Set up weekly topic generation (Claude fills the sheet with 30 topics)

---

## Sources

- [HeyGen API v2 — Generate Video](https://docs.heygen.com/reference/create-an-avatar-video-v2)
- [HeyGen API — Video Status](https://docs.heygen.com/reference/video-status)
- [HeyGen API Pricing](https://www.heygen.com/api-pricing)
- [GHL Social Planner API](https://marketplace.gohighlevel.com/docs/ghl/social-planner/social-media-posting-api/index.html)
- [GHL Create Post Endpoint](https://marketplace.gohighlevel.com/docs/ghl/social-planner/create-post/index.html)
- [GHL Platform Video Limits](https://help.gohighlevel.com/support/solutions/articles/48001210585-social-planner-image-video-content-and-api-limitations)
- [Nate Herk — Claude + HeyGen Pipeline](https://www.skool.com/ai-automation-society/new-video-claude-heygen-just-changed-content-creation-forever)
- [n8n HeyGen → YouTube Template](https://n8n.io/workflows/8622-generate-ai-avatar-videos-from-text-with-heygen-and-upload-to-youtube/)
