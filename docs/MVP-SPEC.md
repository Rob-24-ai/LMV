# Lick My Vintage — Listing Assistant
## MVP Spec v0.1

**Author:** Claude (for Rob)
**Date:** 2026-06-28
**Status:** DRAFT — pending eng / red-team / codex review

---

## 1. What this is

A web app that walks Rob through listing one vintage women's garment on eBay, from photographing
it to a finished, copy-ready listing. It wraps Claude (vision + text) around the domain knowledge
already captured in the `lick-my-vintage` Claude skill (dating, pricing, condition, titles, SEO,
shipping, policy).

**It is not** an eBay-integrated auto-lister. The MVP produces listing *content* Rob pastes into
eBay himself. Direct eBay API posting is explicitly out of scope for v0.1 (see §9).

## 2. The core insight driving the design

The two moments of listing work happen in different places, and the app should too:

- **In the field, phone in hand, garment on the table** → *capture*. Photos and measurements.
  This is physical, mobile, and must not involve typing paragraphs or copy-pasting.
- **At the desk, later** → *compose*. Claude writes; Rob reviews, pulls comps, and copies the
  final listing into eBay. Keyboard and a big screen make this painless.

So the app is **one app, responsive, with two modes** that share one item record:

| Surface | Role | Primary actions |
|---|---|---|
| **Mobile** | Capture station | Guided photo checklist, measurement prompts, flaw notes, tag shots |
| **Desktop** | Writing desk | Review captured data, run Claude (date/price/write), paste comps, copy final listing |

The handoff — *start an item on the phone, finish it on the desktop* — is the product. It requires
items to persist and sync across devices, which is the one piece of real backend (§6).

## 3. Primary user flow (happy path)

1. **(Mobile) New item.** Rob taps "+ New item." A draft item is created.
2. **(Mobile) Photo checklist.** App shows a checklist of required shots: front, back, side, brand
   tag, care/union tag, fabric close-up, each flaw, and a scale shot (tape measure in frame). Each
   row is "tap to capture." A row turns green when a photo is attached. Rob can add extra shots.
3. **(Mobile) Measurements.** Guided form, one field at a time, with a diagram per field
   (pit-to-pit, waist, hips, length, shoulder, sleeve; rise/inseam for bottoms). Numeric keypad.
   Values save as he goes.
4. **(Mobile) Quick condition.** Tap-to-add flaw chips (stain, hole, fade, pilling, repair, odor),
   each optionally tied to a photo and a one-line note. Pick an overall grade.
5. **Handoff.** Item now has photos + measurements + flaw notes, synced.
6. **(Desktop) Open the item.** Rob sees the captured photos and data laid out.
7. **(Desktop) Date & authenticate.** Claude vision reads the tag shots + cues and proposes a
   decade with its reasoning ("ILGWU AFL-CIO label + nylon center-back zip + care label present →
   circa early–mid 1970s"). Rob confirms or overrides.
8. **(Desktop) Price.** App generates a pre-filled eBay *sold/completed* search URL (brand + era +
   type + keywords) and a "Open eBay sold comps" button. Rob clicks, copies the sold results,
   pastes them into a box. Claude reads the comps and proposes a price + reasoning, applying the
   condition and rarity adjustments. Rob sets the final price.
9. **(Desktop) Generate listing.** Claude produces: an 80-char title, the full item-specifics set,
   and a structured description (measurements block + condition + features + fit note). Each field
   is individually editable and has a one-tap **Copy** button.
10. **(Desktop) Pre-list checklist.** Final gate: photos shot + sequenced, all flaws disclosed,
    shipping weight/method chosen, policies set. Rob ticks through, copies fields into eBay, marks
    the item **Listed**.

## 4. Screens (MVP set)

**Mobile**
- M1. Item list (drafts + recently listed)
- M2. Photo checklist (per-item)
- M3. Measurements form
- M4. Condition / flaws
- (M5. Item summary — read-only confirmation that capture is complete)

**Desktop**
- D1. Item list / dashboard
- D2. Item workspace — a single scrolling workspace with sections: Photos · Dating · Pricing ·
  Generated Listing · Checklist. (One unified screen, not a multi-page wizard.)

Auth: one shared screen (magic-link email via Supabase). Single user (Rob). No multi-tenant.

## 5. What Claude does (the AI surface)

Three discrete Claude calls, each grounded in the skill's reference files (shipped as the system
prompt / context for each call):

1. **Date & authenticate** — input: tag/garment photos. Output: `{ decade, confidence, cues[],
   notable_labels[] }`. Vision.
2. **Price** — input: item facts + pasted sold comps text. Output: `{ suggested_price, low, high,
   reasoning, condition_adjustment, rarity_note }`. Text.
3. **Write listing** — input: confirmed facts (brand, era, type, measurements, condition, flaws,
   keywords). Output: `{ title, item_specifics{}, description }`. Text.

All three return structured JSON for clean rendering and per-field editing. The reference files
are the knowledge base; no separate RAG/vector store in the MVP — the relevant reference markdown
is small enough to pass in context per call.

**Model:** Claude (Opus for dating/pricing judgment; the writing call can run Opus too in MVP —
optimize model tier later). Vision required for the dating call.

## 6. Data model (Supabase)

```
users           (Supabase auth; single user for MVP)
items
  id, user_id, status (draft|captured|listed), created_at, updated_at
  brand, decade, decade_confidence, garment_type, color, material, style_keywords[]
  measurements (jsonb)        -- {bust, waist, hips, length, shoulder, sleeve, rise, inseam}
  condition_grade, flaws (jsonb)   -- [{type, note, photo_id}]
  suggested_price, final_price
  title, item_specifics (jsonb), description
photos
  id, item_id, storage_path, role (front|back|side|brand_tag|care_tag|fabric|flaw|scale|extra), created_at
```

- Photos in **Supabase Storage**, one bucket, RLS scoped to `user_id`.
- Row Level Security on all tables (single user, but correct from day one).
- No comps stored (pasted text is transient input to the pricing call).

## 7. Stack

- **Next.js (App Router) + TypeScript**, deployed on **Vercel**.
- **Tailwind** for styling; responsive (mobile-first capture screens, desktop workspace ≥1024px).
- **Supabase**: Postgres + Auth (magic link) + Storage.
- **Anthropic API** (server-side route handlers; key never hits the client). Vision for dating.
- Image handling: client-side resize/compress before upload (garment photos are large).

## 8. MVP success criteria

Rob can, end to end: start an item on his phone, capture all photos + measurements + flaws, walk
to his desk, open the same item, get a defensible decade + a price grounded in real sold comps,
and copy a complete, accurate title + item specifics + description into eBay — for a real listing
that goes live. Target: a full listing produced in **under 10 minutes** of his active time.

## 9. Explicitly OUT of scope for v0.1

- Direct eBay API listing/posting (Rob copies into eBay manually).
- Automated sold-comps fetching (eBay blocks scrapers; sold-data API needs approval). MVP uses the
  pre-filled-search + paste pattern.
- Cross-listing to Depop/Poshmark/Etsy.
- Multi-user / accounts for anyone but Rob.
- Inventory management, sales/financial tracking, label printing.
- Offline mode / native app.
- AI background removal / photo editing (use existing tools; app just stores the photos).

## 10. Known risks / open questions (seeding the review)

- **R1 — Pricing comps friction.** The paste-comps step is the one manual seam. Is it acceptable,
  or does it kill the value? Alternative: a browser-extension/bookmarklet, or deferring pricing.
- **R2 — Vision dating reliability.** How often is Claude's decade wrong, and does a wrong-but-
  confident date erode trust? Mitigation: always show cues + a confidence level, easy override.
- **R3 — Phone→desktop handoff friction.** Requires auth on both devices. Is magic-link login on
  the phone too much friction mid-capture? Could capture work anonymously and claim later?
- **R4 — Photo upload on mobile data.** Large images over cellular. Need aggressive client-side
  compression; confirm it doesn't degrade the dating vision call.
- **R5 — Scope of "make money."** This produces good listings; it does not source inventory or
  guarantee sell-through. Is the MVP value proposition honest and sufficient?
- **R6 — Build size.** Realistic estimate for a working MVP? What's the thinnest possible v0 that
  still delivers the §8 outcome?
```
