# Red-Team Review — Lick My Vintage MVP Spec v0.1

Reviewer: Claude (hostile adversarial agent, fresh context, read the spec + the existing skill)
Verdict: **BUILD THINNER**

## Axis 1 — The value is mostly not real; it duplicates a free tool that works better

The `lick-my-vintage` skill already implements the identical 9-step flow (intake → date →
measure → grade → price → title → specifics → description → checklist). The app adds a
wrapper, not a method. Three ways chat + skill is **strictly better** than the app:

1. **Comps.** The skill has `WebSearch`/`WebFetch` and can pull sold comps live. The app's
   §9 makes comps a manual copy-paste. The app makes the single money-deciding step *more
   manual* than the free tool — a regression.
2. **Cost.** The skill runs on Rob's Claude Max OAuth = **$0 marginal**. The app calls the
   **metered Anthropic API**, 3 Opus calls/listing (one with images). The app pays real
   money to do worse.
3. **Handoff is already free.** iPhone camera → iCloud/AirDrop already syncs photos to the
   desk. The "phone→desktop handoff is the product" claim collapses — the OS gives it away.

Net-new the app actually adds: (a) a guided mobile capture checklist with measurement
diagrams (the one thing chat is bad at), (b) a persistent item DB — which §9 declares out
of scope, so it exists only to power a handoff the OS already provides. Circular.

vs eBay-native AI / Vendoo / List Perfectly: the app sits in a dead middle — weaker than
free chat on AI, weaker than incumbents on integration/DB.

> **Most important finding:** chat + skill + native camera roll gets ~90% of the value at
> ~2% of the build, and beats the app on the two things that matter most (live comps, $0 cost).

## Axis 2 — Two fatal seams

- **Comps paste (will break):** eBay sold results are JS-rendered cards; "copy and paste
  the results" yields a garbled blob. Pricing quality is bounded by paste quality. The seam
  lands exactly where the dollar number is set — and the free skill avoids it by pulling live.
- **Auth on both devices mid-capture (predicted-high):** magic-link on a phone often opens
  in a different browser/webview than the capture session, so the session isn't shared and
  "claim later" needs extra code. For n=1 user, auth is pure tax.

## Axis 3 — Build cost: multi-week slog, ROI never clears

Real line items: responsive two-surface UI; Supabase Postgres + magic-link Auth + Storage +
RLS; client compress + chunked cellular upload with retry; photo-checklist UI (9 roles);
measurement form with ~8 hand-made diagrams; condition-chip↔photo linking; 3 server routes
each doing structured-JSON parse + validate + repair + partial-failure; desktop workspace;
dashboards on both surfaces; sync on handoff. Realistically **2–4 focused weeks** — a second
front while ArtSensei desktop/workspaces is mid-flight. Payoff: helping one person list used
clothes at tens-of-dollars margin, which free chat already does in <10 min. Won't pay back.

## Axis 4 — Hidden complexity / breakage

- Image upload over cellular: 8+ large shots/item on a flaky connection → stalls, partial items.
- **Vision dating vs compression collide (R2+R4):** dating needs fine detail (RN numbers,
  union labels, zipper type); aggressive compression destroys exactly those pixels. A
  confident-wrong decade then poisons the comps search *and* the title downstream.
- eBay sold-search URL rot: `_nkw/LH_Sold/LH_Complete`/category params churn and sold data
  is increasingly login-gated. The pre-filled link will silently break.
- Structured-output reliability: you own validate + repair for 3 routes (tax, not fatal).
- API cost: 3 Opus calls/listing incl. images vs a $0 Max-OAuth alternative.

Fair credit: the "references small enough to pass in-context, no RAG" call is correct. The
capture-vs-compose insight (§2) is the best idea in the doc. Neither justifies the build.

## Axis 5 — "MVP" is three products

(1) mobile structured-capture app, (2) cross-device synced item DB (auth+RLS+storage),
(3) an AI listing composer — which already exists as the skill. §8's success bar ("full
listing in <10 min") is already met today by chat + skill + camera roll.

## Thinnest v0 that delivers a real, net-new win

The only thing chat genuinely can't do is structured thumb-friendly capture. Build *only
that*, with **no backend, no auth, no Supabase, no storage, 2 of 3 AI routes deleted**: one
static client-only mobile web page (localStorage) = photo checklist + measurement/flaw form
→ emits a clean copy-paste capture block + a pre-filled eBay sold-search link. Rob shoots
with the native camera (iCloud handles handoff), then on desktop pastes the block and drags
photos into the existing `/lick-my-vintage` chat, which dates/prices/writes for free and
better. ~1 day. Complements the skill instead of duplicating it, and reveals whether Rob
even uses a capture sheet before any Supabase/auth/3-route machinery gets built.
