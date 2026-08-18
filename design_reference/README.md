# Handoff: Cinematch — Recommender Loop (Daylight look & feel)

## Overview

Cinematch answers one question — *what should I watch tonight?* — in about two minutes, for one person or a small group. The recommender loop covers: choosing solo vs. group, setting tonight's mood on a slot machine, a short "Cine is thinking" beat, a swipeable deck of five matched films with an explanation of *why*, a post-watch rating, and an occasional collectible "mood card" reward. The group path adds invite / push-notification / join-session screens before the shared mood spin.

This bundle documents the **Daylight** visual system (v3) — bright tinted paper, soft rounded type, one marigold action colour, playful copy, springy motion.

## About the Design Files

The files here are **design references created in HTML** — prototypes that demonstrate the intended look, copy, and behaviour. They are **not production code to copy**. The task is to **recreate these designs in the target codebase's environment** (React Native, Swift/SwiftUI, Kotlin/Compose, React web, etc.) using that codebase's established components, theming, navigation, and state patterns. If no environment exists yet, choose the framework that best fits the product (this is a phone-first product; the prototype is designed at 390×844) and implement there.

Specifically: the prototype uses inline React with inline style objects because that was the fastest way to demonstrate the design. Do not mirror that structure. Build a proper theme/token layer and real components.

## Fidelity

**High fidelity.** Colours, typography, spacing, radii, shadows, copy, motion timings and interaction behaviour are all final-intent and specified exactly below. Recreate them precisely, mapped onto the codebase's own primitives.

Two deliberate placeholders, called out again under **Assets**:
1. **Film posters are CSS gradient stand-ins.** Production must use real poster artwork.
2. **Cine the mascot is a lettered circle ("C") and emoji are used as spot illustration.** Both are placeholders pending real illustration assets.

---

## Design Tokens

### Colour

| Token | Hex | Use |
|---|---|---|
| `paper` | `#FBF4F0` | Screen background (blush-tinted paper) |
| `paper2` | `#FFFCFA` | Cards, panels, raised surfaces |
| `ink` | `#241F1D` | Primary text |
| `inkSoft` | `#6B625C` | Secondary text, sub-labels |
| `inkLight` | `#9A9089` | Tertiary text, micro-labels, disabled |
| `onAccent` | `#241F1D` | Text/icons on any accent fill |
| `accent` (`yellow`) | `#F6C85A` | **The** action colour: primary buttons, Cine's avatar, "Cine says" callouts, highlight cards |
| `pink` | `#F2A488` | Secondary tint — reel headers, avatars, pagination |
| `blue` | `#8FC7D4` | Secondary tint |
| `mint` | `#A8D8C4` | Secondary tint — streaming-service chip |
| `lilac` | `#C7B6EC` | Secondary tint |
| `coral` | `#F0B27A` | Secondary tint |

All accents are pastel by design and **always** carry `onAccent` (`#241F1D`) text — never white.

Vibe-bar fills use deeper, more saturated values so they read against the light track:

| Bar | Hex |
|---|---|
| cosy-ness | `#E8A72C` |
| funny | `#E8734A` |
| thinky | `#3E93A8` |
| tense | `#C2603F` |

Bar track: `rgba(36,31,29,.07)` fill, `1px solid rgba(36,31,29,.08)` border, `border-radius: 6px`, height `8px`.

**Page backdrop** (outside the device frame): base `#F7EFEA` plus three washes —
```css
radial-gradient(circle at 12% 12%, rgba(246,200,90,.28) 0%, transparent 46%),
radial-gradient(circle at 88% 78%, rgba(168,216,196,.34) 0%, transparent 48%),
radial-gradient(circle at 60% 40%, rgba(242,164,136,.16) 0%, transparent 55%)
```
In-app, the equivalent is a soft tinted wash behind the content — not a flat neutral.

**Links:** default `#C2603F`, hover `#241F1D`.

### Borders

Hairlines only — no heavy strokes.

| Use | Value |
|---|---|
| Standard divider / control border | `1px solid rgba(36,31,29,.13)` |
| Card border | `1px solid rgba(36,31,29,.10)` |
| Emphasis border | `1px solid rgba(36,31,29,.18)` |
| Informal / "draft" containers | `1px dashed rgba(36,31,29,.2)` |

### Shadows

Warm, soft, no offset-block shadows.

| Elevation | Value |
|---|---|
| Chip / small control | `0 5px 14px rgba(74,52,40,.09)` |
| Button, small card | `0 7px 20px rgba(74,52,40,.10)` |
| Panel | `0 10px 26px rgba(74,52,40,.11)` |
| Main film card | `0 16px 36px rgba(74,52,40,.13)` |
| Device frame | `0 30px 70px rgba(74,52,40,.18)`, plus `0 0 0 1px rgba(36,31,29,.08)` hairline |

### Radii

| Element | Radius |
|---|---|
| Buttons, chips, pills, avatars | `100px` (fully round) |
| Film card | `20px` |
| Panels, callouts, reels | `12–16px` |
| Inner blocks (poster, plate) | `8–12px` |
| Phone bezel / screen | `48px` / `34px` (prototype device frame only) |

### Typography

Three families, all Google Fonts:

| Role | Family | Weights |
|---|---|---|
| Display / headings / buttons | **Nunito** | 500, 600, 700, 800 |
| Body / UI copy | **Nunito Sans** | 400, 500, 600, 700 |
| Micro-labels, metadata, counters | **Space Mono** | 400, 700 |

Scale as used (px, at 390pt-wide screen):

| Element | Family | Size / weight | Notes |
|---|---|---|---|
| Screen hero ("who's watching?") | Nunito | 34 / 800 | line-height 1.02 |
| Screen title ("spin your mood") | Nunito | 25–30 / 800 | line-height 1.05 |
| Section / card heading | Nunito | 21–27 / 800 | line-height 1.05–1.1 |
| Film title on poster plate | Nunito | 20 / 800 | line-height 1.05 |
| Film title in list/loading | Nunito | 17–18 / 700 | |
| Primary button | Nunito | 15 / 700 | `white-space: nowrap` |
| Secondary button | Nunito | 14 / 600 | `white-space: nowrap` |
| Body copy | Nunito Sans | 13–14 / 400 | line-height 1.35–1.45 |
| Chip / meta | Nunito Sans | 11 / 400 | |
| Micro-label (uppercase) | Space Mono | 8–10 / 400 | `letter-spacing .10–.18em`, `text-transform: uppercase` |
| Counter / status | Space Mono | 9–13 / 700 | |

Micro-labels in Space Mono are a deliberate signature — they appear above almost every block ("TONIGHT", "CINE SAYS ✦", "WHAT YOU'RE IN FOR", "BEST MATCH", "SESSION LINK", "RARE DROP ✦").

### Spacing

4px base. Common values: screen side padding `16–22`, card padding `18`, inner block padding `11–13`, stack gaps `10–16`, chip gaps `6–7`, bottom action area `14 18 28`.

The v3 revision deliberately increased breathing room on the film-detail card (~40% more): card padding `18`, gap above chips `14`, above "Cine says" `14`, above vibe bars `12`, between bars `9`.

### Motion

| Behaviour | Spec |
|---|---|
| Button press | `transform .22s cubic-bezier(.2,1.5,.4,1)`; `:active { transform: scale(.96) }` |
| Screen enter | `settle .5s cubic-bezier(.2,1.2,.35,1)` — `opacity 0→1`, `translateY(10px)→0`, `scale(.99)→1` |
| Vibe bar fill | `width .6s ease` on mount/change |
| Card swipe follow | live `translateX(dragX)` + `rotate(dragX * 0.05deg)`; release under threshold returns with `transform .2s ease` |
| Card fly-out | `transform .3s ease-out` to `translate(±500px,-80px) rotate(±25deg)`, then advance index |
| Swipe threshold | 80px |
| LOVE / SKIP stamp opacity | `min(1, abs(dragX)/80)` |
| Slot reel roll | 9 ticks at 80ms, unlocked reels randomise each tick |
| Cine thinking screen | dot cycle every 350ms; auto-advance at 2200ms |
| Group member "ready" | Tay flips ready at 4000ms; badge/background cross-fade `.3–.5s` |
| Rating → mood card | 400ms after star tap |
| Watch → done | 600ms after logging the choice |

The intent: *things spring and settle.* Nothing linear, nothing longer than ~600ms except the deliberate 2.2s thinking beat.

---

## Screens / Views

Device canvas: **390 × 844** (iPhone 14-class). Status bar 9:41 + dynamic island are prototype furniture — use the platform's real status bar.

### 1. Fork — "who's watching?"
**Purpose:** branch solo vs. group; the answer changes the whole recommendation model.
**Layout:** vertically centred stack, 22px side padding, 20px gaps. Micro-label "TONIGHT" → hero "who's watching?" (34/800) → sub "your answer changes everything about how I pick." (13, `inkSoft`) → two option cards → Cine bubble.
**Components:**
- **Option card** ×2 — full width, `border-radius 16`, `1px solid rgba(36,31,29,.13)`, padding `16 18`, panel shadow, row with text left / emoji right (34px). Card 1 marigold `#F6C85A`: title "Just me" (21/800, `onAccent`), sub "→ slot machine" (12, `rgba(36,31,29,.65)`), 🛋️. Card 2 pink `#F2A488`: "Me + someone", "→ group vibe session", 👯.
- **Cine bubble** — 30px marigold avatar with "C" (Nunito 800, `onAccent`) + speech bubble on `paper2`, `border-radius 4px 14px 14px 14px`, 13px copy: "haven't watched in a while? i'll factor in your fingerprint too 🎬".

### 2. Slot machine — mood spin (solo and group)
**Purpose:** set tonight's vibe in four dimensions; the group variant blends everyone's taste on top.
**Layout:** back link + context label ("JUST ME" / "GROUP · 3 PEOPLE") → title ("spin your mood" solo / "what's the group vibe?" group) → instruction line → four reels, 10px apart → Cine readback → action row pinned bottom.
**Reels** (`paper2`, `border-radius 14`, hairline, shadow only when locked):
- Header strip: reel colour fill, `onAccent` text, Space Mono 10/.1em, label left + "n/total" right, `1px` bottom border. FEEL = pink, FLAVOUR = blue, LENGTH = marigold, ERA = mint.
- Body row: 30px lock toggle (🔒 marigold fill when locked / 🔓 transparent) → three-up option strip (prev and next at 14/700 opacity .25, current 20/600 centred) → two 24px ‹ › steppers.
- Footer: "‹ swipe ›" hint + dot pagination (active dot 10×4, others 4×4).
- Horizontal swipe (>30px) advances a reel; locked reels are exempt from rolls.
**Reel options:** FEEL cosy / bittersweet / silly / thinky / tense / romantic / weird / swoony · FLAVOUR neon + rain / cosy / slow burn / wild ride / escapist / grounded / cinematic · LENGTH under 90m / ~2 hrs / epic ok · ERA today / '10s / '00s / '90s / '80s / classic.
**Readback:** dashed container, 26px Cine + "reading: **feel** · **flavour** · **length**".
**Actions:** "surprise me" (outline, flex 1) + "find me something" (marigold primary, flex 2).

### 3. Cine thinking
**Purpose:** a short, honest beat that makes the recommendation feel considered.
80px marigold circle with "C" (Nunito 800/28, `onAccent`, panel shadow) → "finding something perfect…" (24/800, animated 0–3 dots) → "reading the room…" (14, `inkSoft`) → best-match preview card on `paper2` with micro-label "BEST MATCH", film title (18/700), "checking {service} · {runtime}". Auto-advances at 2200ms.

### 4. Film detail — swipeable deck of five
**Purpose:** the product's core screen. One recommendation at a time, with the reason for it.
**Layout:** back / "n of 5" / save-heart row → dot pagination (active 18×6 pink, others 6×6 at .35) → card (fills remaining height) → action row → hint line.
**Card** (`paper2`, `border-radius 20`, `1px solid rgba(36,31,29,.10)`, padding 18, `0 16px 36px rgba(74,52,40,.13)`):
1. **Poster** — flexible height, `border-radius 10`, hairline; real artwork in production. Title plate inset 10px from the bottom: `rgba(255,252,250,.93)` + `backdrop-filter: blur(8px)`, hairline, `border-radius 8`, padding `8 10`; title 20/800, meta "YEAR · DIRECTOR" in Space Mono 8/.1em uppercase `inkSoft`.
2. **Chips** — gap 7, top margin 14: streaming service (mint fill, `onAccent`), runtime, certificate (both transparent + hairline). Pills, 11px, padding `3 10`.
3. **"Cine says"** — marigold fill, hairline, `border-radius 10`, padding `11 13`, top margin 14. Micro-label "CINE SAYS ✦" then the reason in quotes, 12/1.35, `onAccent`. Copy is selected by the chosen FEEL value (see **Content**).
4. **Vibe bars** — `paper2`, hairline, `border-radius 12`, padding `12 13`, top margin 12, micro-label "WHAT YOU'RE IN FOR", four rows 9px apart: label (11, `inkSoft`, 56px column) / track / value (Space Mono 9, `inkLight`, 22px right-aligned).
5. **LOVE / SKIP stamps** — absolutely positioned top corners, rotated ±14°, 3px border, 18/700, opacity driven by drag distance. LOVE pink, SKIP `inkSoft`.
**Actions:** "not tonight" (outline pill, flex 1, 14/600) advances the deck; "this one, let's go" (marigold, flex 2, 15/700) logs the choice, shows "rolling credits…", then opens the streaming service and moves to rating.
**Hint:** "swipe left to pass · right to keep it for later" (Space Mono 8/.1em uppercase, centred).
**Save heart:** 32px circle, `♡` transparent → `♥` pink fill with `onAccent` when saved.

### 5. Post-watch rating
Micro-label "HOW WAS IT?" → film title (27/800) → Cine bubble "good choice? give it some stars and i'll get better at this 🌟" → rating panel (`paper2`, `border-radius 16`, panel shadow, padding `14 16`): micro-label "YOUR RATING", five 50px circular star buttons (transparent → marigold fill with `onAccent` on hover/selected, cumulative left-to-right), and "MEH" / "LOVED IT" end labels in Space Mono 8. Below: "skip for now" text link.
Tapping a star opens the streaming service in a new tab and, 400ms later, reveals the mood-card drop.

### 6. Mood card drop (the reward)
Two states.
**Tease:** marigold card, `border-radius 14`, panel shadow — "RARE DROP ✦" / "your april mood card is ready!" (21/800) / "based on everything you've watched this month. drops like this happen 1–4× a month." Cine bubble: "\"Bittersweet & Beautiful\" — that's the vibe of your april in film." Actions: "reveal card →" (primary, flex 2) + "later" (outline, flex 1).
**Card:** 240px wide, aspect `9/14`, `border-radius 18`, `linear-gradient(160deg, #F2A488 0%, #F0B27A 48%, #F6C85A 100%)`, hairline, `0 14px 34px rgba(74,52,40,.13)`. Contents top→bottom: "CINEMATCH" / "APR '26" (Space Mono 8/.2em), title "Bittersweet & Beautiful" (22/800), "andy's april in film" (11, .75 opacity); three 46×66 mini posters fanned at −5°/0°/+5°; "TOP PICKS" + numbered list (10/1.25). A rotated 18° "APR 2026" stamp sits off the right edge, marigold fill. All type `onAccent`.
Actions: "↗ share" (primary) + "save"; then "find another film →" (outline, full width) and "NEXT DROP: SOMETIME IN MAY 🎲".

### 7. Group — invite (host, step 1/2)
Title "who's in?" (27/800) + "send the link — i'll ping them a push notification. when everyone's ready, we spin together." Three member avatars (52px, pastel fills, `onAccent` initials) each with a status badge (✓ marigold when ready, … `paper2` when waiting) and name + state label. A status strip flips from `paper2` "waiting for Tay to join the session…" to marigold "🎉 everyone's here — ready to pick!" at 4000ms. Dashed "SESSION LINK" block showing `cinematch.co/g/FR1DAY` (code in `#C2603F`). Actions: "↗ invite" (uses `navigator.share`, falls back to WhatsApp) + "let's pick! →" (marigold, disabled until all ready). Below, a dashed utility button "👁 preview: how Tay sees the invite" — **prototype affordance only, do not ship.**

### 8. Group — push notification (invitee)
Full-bleed lock screen, dark gradient `linear-gradient(160deg,#1A1A2E,#16213E 50%,#0F3460)`. Clock 56/800 white, date 15. Frosted notification card: `rgba(255,255,255,.18)`, `backdrop-filter: blur(20px)`, `1px solid rgba(255,255,255,.25)`, `border-radius 20`. 40px marigold app icon with "C", "Cinematch" + "now", title "Andy's invited you to a film session 🎬", body "\"fancy a film tonight? 3 of us picking together →\"". Two actions: "Dismiss" (translucent) and "Join session →" (marigold, `onAccent`). This is the OS notification — implement with the platform's real push payload.

### 9. Group — join session (invitee)
"YOU'RE INVITED" → "film night 🎬" (30/800) → host bubble with a pink "A" avatar → "WHO'S IN" panel with three 44px avatars and states (ready / joining… / waiting) → Cine bubble "once everyone's in, we'll all spin the vibe together and i'll find something for the group 🍿" → full-width primary "i'm in! 🙌" which shows "joining…" for 900ms, then joins the shared spin.

### 10. Done
Centred: 72px Cine (tada) → "enjoy the film! 🎬" (30/800) → "in the real app, you'd be linked straight to your streaming service. see you on the other side." → "— END OF PROTOTYPE · GO AND WATCH SOMETHING —" → "↻ try again". The end-of-prototype line and the restart button are prototype furniture.

---

## Interactions & Behaviour

**Navigation graph** (single `step` value):
```
fork ──solo──> slot ──find──> loading ──2.2s──> detail ──watch──> rating ──> (mood card) ──> done
  └──group──> g1 (invite) ──> gslot ──find──> loading ──> detail ──> …
                 └──preview──> notify ──tap──> join ──> gslot
```
Back links: slot→fork, detail→slot (or gslot in group mode), g1→fork, notify→g1, join→notify, gslot→g1.

- **Deck:** pointer/touch drag with global mousemove/mouseup + touchmove/touchend listeners; 80px threshold; left = pass, right = save-for-later; both advance, clamped at the last card. Next card sits behind at `rotate(2deg) translateY(6px)`, opacity .45.
- **Watch:** logs the choice (see **State**), 600ms delay, then opens the streaming URL and advances to rating.
- **Star rating:** hover previews cumulative fill; tap commits, opens the service, reveals the drop after 400ms.
- **Reels:** lock toggles per reel; "surprise me" randomises unlocked reels over 9×80ms ticks with unlocked reels at .7 opacity while rolling.
- **Loading state:** the thinking screen is the only loader; buttons show text swaps ("rolling credits…", "joining…", "waiting…") rather than spinners.
- **Empty/error states:** not designed. Needed for production — no network, no streaming match, fewer than 5 results, group member drops out.
- **Responsive:** phone-first, single column, no landscape design. The prototype's page-level scale-to-fit is prototype-only.
- **Accessibility to fix in build:** several controls are emoji-only (lock, dismiss); all need labels. Contrast on pastel fills relies on `onAccent` dark text — keep that pairing. Swipe actions must have button equivalents (they do: "not tonight" / save heart).

## State Management

Prototype state, per screen:

| State | Type | Notes |
|---|---|---|
| `step` | enum | `fork · slot · loading · detail · rating · done · g1 · notify · join · gslot` — persisted to `localStorage.cr_step` |
| `group` | boolean | persisted to `localStorage.cr_group` |
| `reels` | array of `{label, colour, options[], index, locked}` | tonight's mood |
| `films` | array | the five matched films, ordered |
| `idx` | number | current card in the deck |
| `saved` | map filmId→bool | save-for-later |
| `dragX` / `flying` | number / `'left'\|'right'\|null` | swipe gesture |
| `watching` | boolean | debounce + label swap on the watch action |
| `rated` | 1–5 \| null | star rating |
| `showDrop` / `revealed` | boolean | mood-card sequence |
| `tayReady` / `joining` | boolean | group session status (simulated timers → real presence in production) |

Persisting `step` restores mid-flow states; the prototype deliberately resets `loading / detail / rating / done` back to `fork` on reload, since those depend on transient match results.

**Matching logic** (prototype stand-in for a real service — reimplement server-side):
- Each film carries `why: {cosy, thinky, funny, tense, romantic}` scored 0–100.
- The FEEL reel maps to weights, e.g. `cosy → {cosy:3, funny:1}`, `bittersweet → {romantic:2, thinky:2}`, `silly → {funny:3}`, `thinky → {thinky:3}`, `tense → {tense:3}`, `romantic → {romantic:3}`, `weird → {thinky:1, funny:1}`, `swoony → {romantic:2, cosy:1}`.
- Score = Σ(film.why[k] × weight); top 5 returned.
- Group: vibe weights ×1.5, plus each dimension of the members' averaged taste profile × (value/100), then top 5. Prototype members: Andy `{80,60,75,40,55}`, Sam `{70,80,50,60,70}`, Tay `{90,30,85,25,50}` in `{cosy, thinky, funny, tense, romantic}`.

**Data writes needed:** `POST /api/watch-choices { filmId, vibe, ts }` on "this one, let's go" (stubbed as a console log in the prototype); rating submission; saved-films toggle; group session create/join/presence.

**Streaming deep links** used in the prototype (replace with a proper availability provider): Netflix `netflix.com/search?q=`, Prime `amazon.co.uk/s?k=`, MUBI `mubi.com/en/films/`, Disney+ `disneyplus.com/search/`. Note the audience skews arthouse — BFI Player, Criterion Channel and Curzon should be first-class alongside the mainstream services.

## Content

Exact copy is in the prototype; the tone rules matter as much as the strings:

- Lower-case, conversational, first-person from Cine. Contractions always.
- Buttons state the outcome, not the mechanism: "find me something", "this one, let's go", "not tonight", "surprise me", "i'm in! 🙌".
- Cine explains *why* in one sentence and never hedges. Per-FEEL examples: cosy → "you said cosy — this one wraps you up like a blanket."; thinky → "big ideas, careful filmmaking. this one'll stick around in your head."; romantic → "not a romcom. something better — it trusts you to feel it."; tense → "buckle up. {title} earns every minute."; funny → "genuinely funny. not quirky, not charming — actually funny."; weird → "strange and wonderful. not for everyone — but definitely for you."
- Micro-labels are terse and uppercase; they carry the "serious about film" register while the sentences stay light.

## Assets

- **No image files.** Everything is CSS.
- **Film posters are placeholders** — per-film CSS gradients derived from a 3-colour palette and a pattern key (`horizontal`, `diagonal`, `vertical`, `burst`, `flame`, `splash`, `neon`). Production must load real artwork; the plate treatment (light frosted panel, dark type) is designed to sit over any poster.
- **Cine the mascot is a placeholder** — a marigold circle with a "C". Needs a real character; moods referenced in the prototype are `happy`, `think`, `wink`, `tada`.
- **Emoji stand in for illustration** (🛋️ 👯 🎬 🍿 🔒 🌟 🎲 🙌 👁). Treat these as spot-illustration slots, not final art.
- **Fonts:** Nunito, Nunito Sans, Space Mono — all Google Fonts (SIL Open Font License). Bundle them rather than hot-linking in a shipped app.
- The 12-film catalogue in the prototype is sample data with hand-authored vibe scores.

## Files

| File | What it is |
|---|---|
| `Cinematch Recommender v3.html` | **The reference implementation** — full recommender loop in the Daylight look. Open it and click through solo and group paths. |
| `Cinematch Colour & Type Directions.html` | The four original visual directions explored (Reel Room / Kodak Stock / Matinee / Afterdark) — context for why Daylight looks the way it does. |
| `Cinematch — What's Bugging You.html` | Five one-variable comparisons on the film-detail screen — useful if you need to justify or revisit a specific choice. |

Older versions kept in the project root for history: `Cinematch Recommender.html` (original sketchbook look), `Cinematch Recommender v2.html` (dark "Nocturne" direction, superseded), `Cinematch Wireframes.html` (structure only).

## Open questions for the team

1. **Real poster artwork and rights** — which provider (TMDB, JustWatch), and what happens to the frosted-plate treatment over busy artwork.
2. **Cine's illustration** — the whole personality currently rests on copy and one lettered circle.
3. **Streaming availability** — the prototype hardcodes one service per film; production needs regional availability, and the arthouse services matter to this audience.
4. **Group presence** — the prototype simulates ready-states on timers; real-time presence needs a transport decision.
5. **Mood card drop rules** — "1–4× a month" is stated in-product; the actual trigger logic is undefined.
6. **Undesigned states** — no results, offline, fewer than five matches, group abandonment.
