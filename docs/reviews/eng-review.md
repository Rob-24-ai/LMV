# Eng Review — Lick My Vintage MVP Spec v0.1

Reviewer: Claude (eng-manager lens, plan-eng-review framework)
Scope: `docs/MVP-SPEC.md`

## Step 0 — Scope challenge (the finding that matters most)

**What already exists.** The `lick-my-vintage` Claude skill already does the actual
intelligence: dating, pricing-from-comps, title, item specifics, description. In a chat
window today, Rob can paste photos + comps and get every text artifact this app produces.
The app does **not** add new intelligence. It adds four things on top of the existing skill:
(1) a structured mobile photo checklist, (2) persistence + phone→desktop handoff, (3)
form-driven measurement capture, (4) one-tap copy of fields. Those are real conveniences,
but they are UI scaffolding around capabilities that already work. Be honest that the AI
value is already in hand; the build is buying ergonomics, not capability.

**Complexity check — this trips the smell test.** The spec introduces, for a single user
selling used clothes: Supabase Auth + Postgres + Storage + RLS, 3 AI route handlers with
structured JSON, client-side image compression, two responsive surfaces, and per-field
editing UI. That's well past the "8 files / 2 new services" threshold. It is a multi-week
build (CC-compressed: still days of real work + debugging), not a weekend.

**Boring-by-default: pass.** Next.js + Supabase + Anthropic are all proven. No innovation
token wasted on exotic infra. Good. The problem isn't the tech choices, it's the *amount*
of surface relative to the goal.

**Recommendation (make the change easy, then make the easy change):** Don't build §3
steps 1–10 in one shot. Build the thinnest slice that proves the workflow end to end,
ship it, use it on real listings, then add. See "Thinnest v0" below.

## Architecture

- **Auth is over-built for one user.** Magic-link login requires an email round-trip *on
  the phone, mid-capture* (spec's own risk R3). For a single known user on two devices, a
  long-lived device session or a single shared passphrase is enough. Full multi-tenant
  auth is premature. [P2]
- **Phone→desktop handoff is the architectural crux and the spec hedges it** ("could
  capture work anonymously and claim later?"). Commit to one model. Simplest that works:
  Rob is logged in on both devices; an item row synced via Supabase realtime/refetch.
  Don't build anonymous-claim. [P2]
- **The eBay sold-search URL is a load-bearing external dependency with no owner.** It's a
  template that eBay can and will change. Put it in one config constant, and expect to fix
  it. Note it as a known-fragile seam, not a stable integration. [P2]
- **Single point of failure: the 3 Anthropic calls.** No retry, timeout, or cost cap
  specced. For structured-output calls especially, a malformed/empty response must degrade
  to "try again," not a blank listing. [P1 — see failure modes]
- Data model is sound. `photos.role` enum and `flaws` jsonb are right. One gap: store the
  *generated* artifacts (title/specifics/description) AND the confirmed facts, so a
  re-generate doesn't lose Rob's manual edits.

## Code quality / right-sizing

- **Structured JSON is specced as output but the failure path isn't.** Three separate
  model calls each need: a schema, validation, and one bounded retry on parse failure.
  This is the single most under-specified part of the spec and the thing most likely to
  produce silent garbage in the UI. Spec it. [P1]
- **One app, responsive — say so explicitly.** The spec implies it but should state that
  mobile and desktop are the same Next app with responsive layouts/routes, not two
  codebases. Prevents a fork. [P3]
- Model tiering is hand-waved ("optimize later"). It's cheap to get right now: see Perf.

## Tests

No test plan exists. For a personal MVP that's defensible, but two paths are high-risk and
silent, so they earn coverage from day one:
- **Dating vision call → an eval, not a unit test.** Assemble 5–8 photos of garments with
  known decades (you have the reference cheat sheet) and assert the call lands the decade
  (or says low-confidence). This is the feature most likely to be confidently wrong. [→EVAL]
- **Image-compress-then-upload path** → one integration test that a compressed image still
  round-trips and is legible enough for the dating call (see Perf tension). [→E2E]
- Everything else (forms, copy buttons) is low-risk; smoke-level is fine.

## Performance / cost

- **Anthropic cost per listing is real and unbudgeted.** 3 calls, one with image tokens,
  on Opus, could run ~$0.10–0.50/listing. On $20–40 flips at volume that's a margin line,
  not a rounding error. **Tier the calls now:** dating (vision + judgment) wants the strong
  model; measurement formatting and the description write are well within Sonnet. This
  mirrors the standing "classifier must be Sonnet, not Haiku" instinct — match model to
  task, don't default everything to the top tier. [P2]
- **Compression vs. dating-accuracy tension (real, will bite).** R4 wants aggressive
  client-side compression for cellular upload. But the dating call must read tiny tag text
  (RN numbers, union labels). One global compression level can't serve both. Capture and
  send a **separate high-res crop of each tag** for the vision call, while compressing the
  display photos. Otherwise dating accuracy quietly degrades on exactly the inputs that
  matter. [P1]

## NOT-in-scope — validated

The spec's §9 exclusions are correct and well-judged (no eBay API, no scraping, no
cross-listing, no inventory). Good discipline. Add one: **no multi-user auth** — collapse
to single-user device session for v0.

## Failure modes (critical gaps)

| Failure | Test? | Error handling? | User sees? | Verdict |
|---|---|---|---|---|
| Malformed structured output → blank fields | no | not specced | silent blank | **CRITICAL — add retry + validation** |
| Compressed image too low-res to date | no | not specced | wrong/low-conf date | **CRITICAL — send hi-res tag crop** |
| eBay sold-search URL format change | no | not specced | pricing step dead | flag as known-fragile |
| Confidently-wrong decade | eval rec'd | mitigated (cues+confidence+override) | shown w/ caveat | acceptable |

## Thinnest v0 (the recommendation)

Cut to the slice that proves the workflow on one real listing:
1. **Mobile:** photo checklist + measurement form + flaw chips. (This is the genuinely new
   value — capture you can't do in a chat.)
2. **Sync:** single-user, logged in on both devices, one `items` table + Storage. No
   magic-link ceremony, no anonymous-claim.
3. **Desktop:** show captured item → one "Generate listing" action (dating + title +
   specifics + description) with per-field copy. Dating shows cues + confidence + override.
4. **Pricing:** keep the paste-comps step, OR defer pricing entirely to v0.1 and price in
   chat — decide based on whether the paste seam (see red-team/codex) is tolerable.

Defer until the slice is used on real items: editing history, model-tier optimization
beyond the obvious split, evals beyond the dating eval, any polish.

## Eng verdict

**BUILD THINNER.** The architecture is sound and boringly correct; the scope is 2–3x what
the goal needs for a first proof. Build the capture→generate→copy slice with single-user
auth, get the two CRITICAL failure modes (structured-output retry, hi-res tag crop) right
*in that slice*, list 5 real garments with it, then expand. Biggest open question is the
pricing paste seam — defer to the red-team and codex reads before deciding.
