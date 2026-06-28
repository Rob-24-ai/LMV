# Codex Review (cross-model) — Lick My Vintage MVP Spec v0.1

Reviewer: OpenAI Codex (codex-cli 0.125.0, high reasoning, read-only, independent)
Verdict: **BUILD THINNER — single desktop listing generator + phone capture checklist/template**

## Core miss
Overbuilt for one person. A Claude Project/skill plus a rigid capture checklist gets most of
the value with almost none of the app surface. The spec treats "phone-to-desktop shared
record" as the product, but the real product is: good photos, measurements, flaws, sold
comps, and a disciplined listing prompt.

The pricing seam undercuts the smooth-app promise. Rob still leaves the app, searches eBay,
judges relevance, copies messy comps, pastes them back, then later copies fields into eBay.
That's not a smooth workflow — it's a nicer clipboard.

## Build size
Not a weekend MVP. Auth + Supabase + RLS + storage policies + mobile uploads + compression +
retries + vision + structured outputs + editable fields + two responsive workflows is
multi-week. Weekend gets a brittle demo.

## Cost correction (notable — disagrees with the red-team's emphasis)
API cost is probably **not** the blocker. Opus 4.8 ~$5/$25 per MTok in/out; Sonnet 4.6
~$3/$15. Per-listing cost is likely cents to low dollars unless context/images are bloated.
So cost isn't the reason to not build — duplication of the free skill and the manual seam are.

## Will definitely break
- The "under 10 minutes" target once sold comps are manual.
- Cellular photo upload without progress/retry/background-resume/compression.
- Tag legibility if compression is too aggressive (Anthropic warns lossy compression hurts
  text/image performance).
- **Private Supabase image URLs if the Claude route naively passes inaccessible storage
  URLs** (concrete gotcha not in the spec).
- Structured JSON as false comfort: parseable JSON ≠ correct decade/price/specifics/category.
- eBay sold-search URLs eventually changing.
- Pasted comps being noisy: wrong sizes, unsold relists, promoted junk, lots, best-offer ambiguity.
- Vision dating confidence overread by the UI.

## Might be a problem
- Magic-link auth on phone killing capture momentum.
- RLS/storage/auth mostly theater for a single-user private app.
- "No comps stored" removes auditability when Rob later asks why a price was suggested.
- **eBay item specifics vary by category; a generic generated `item_specifics{}` misses
  required/valuable fields** (real eBay-domain gap).
- Browser camera quirks: HEIC, EXIF rotation, iOS memory pressure, multi-photo selection.

## Thinnest v0
Desktop-only Claude listing workbench: upload/select photos, paste measurements/flaws/comps,
run one "analyze + write listing" call, output copy blocks. Mobile capture is just an Apple
Notes/printed checklist plus an iCloud/Photos album. No Supabase, no auth, no storage, no
dashboard.
