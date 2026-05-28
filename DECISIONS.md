# RosterRaise — Decision Log

**Last updated:** 2026-05-27

## Why This Exists
So we don't re-litigate the same decisions. Every choice here was either made explicitly by Shomari or derived from his confirmed preferences. If something needs to change, it gets logged here first.

---

## Brand & Design

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Logo | Text-based "ROST" / "RAI$E" — white over red | PIL-rendered image was blurry at nav bar scale; text renders sharp at any size |
| Nav bar height | 100px minimum | User said logo felt cramped; gave text logo room to breathe |
| Logo font | Oswald Bold 32px | Matches brand energy — bold, sporty, premium |
| Color scheme | Dark (#0A0A0A) nav/hero, white sections, red accents | Consistent with fundraising trust + premium feel |
| Form inputs | Dark #1A1A1A bg, red #E63946 text, red labels | User insisted on dark theme — makes inputs feel like premium terminal UI |

---

## Product & Offer

| Decision | Choice | Rationale |
|----------|--------|-----------|
| No "free" language | Removed all instances | User doesn't want to lead with "free" — trust over hype |
| Commission structure | 10% flat, no tiers, no quotas | Simple, repeatable, no confusion |
| Partner restriction | Partners can sign up as customers after signing on | Don't advertise this; don't hide it |
| No geographic exclusivity | Anyone can sign up as a partner | Avoids territorial conflicts and admin overhead |
| Logo required? | No — teams can skip with modal flow | Removes barrier to signup; skips brand team's work |
| Sample kit | Optional add-on, not required to earn | User wants zero barrier to entry |
| Minimum earnings guarantee | $200 in 30 days or refund sample kit | Reduces risk perception; backed by user decision |

---

## Funnel & Copy

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hero headline | "Turn Your Team Roster Into a Fundraising Machine" | User-selected; strong, benefit-forward |
| Problem section tone | Empowering, not shaming | Removed "chase" language; user approved new version |
| Hero subhead | "Nothing to stock. Nothing to deliver. Nothing to follow up on." | Three-punch list format |
| Stats | $3,400 first-season avg (both hero and stat strip) | User updated from $1,800 |
| Gallery | 4 user photos, 8s rotation, no text overlays | User rejected PIL slides; wanted real photos only |
| Earnings in gallery | Range from $1,800 to $9,000, varied | Not all uniformly low — shows upside |
| CTA button | "Start My Team Store →" / "Get My Team Store" | Removed "free" from buttons too |

---

## Technical

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Internal links | Full .html extension (/signup.html not /signup) | Python HTTP server doesn't auto-resolve extensions |
| Cloudflared tunnel | Fresh URL each restart | User knows it's temporary; main use is shareable preview |
| Tracking | Not yet implemented | Highest priority gap — analytics needs to go in |
| Image sending | Use "Photo" in Telegram, not "Document" | PNG files blocked as documents; photo bypasses restriction |
| No image generation | No GPU, no Stable Diffusion, no DALL-E/Midjourney | User generates complex images externally; PIL for textgraphics only |
| Vision tool | Use PIL pixel analysis as fallback | vision_analyze returns "no image attached" for forwarded Telegram images |

---

## What's Still Open (not yet decided)

- Analytics provider (Google Analytics? Meta Pixel? both?)
- Backend: GitHub repo, Vercel Postgres vs Supabase, email service
- Domain: rosterraise.com status
- A/B testing framework
- Multi-agent architecture (described by user, not implemented)

---

## What We're NOT Doing (rejected)

- Multi-agent orchestrator with 20+ agents (overkill for current stage)
- Security/red team ops division (not applicable yet)
- Formal data engineering pipeline (static site doesn't need it)
- "Free" language anywhere on the site
- Generic catalog-style fundraising imagery