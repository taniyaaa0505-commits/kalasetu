# KalaSetu — SPEC

**Read this before you write any code.** One repo, one spec, one architecture.
If you disagree with something here, change *this file first*, then the code.

---

## What the app is

A phone-first web app (PWA) that turns **one photo + 30 seconds of speech** into a
professional product listing, priced fairly, published where buyers already are.

The golden path is six steps. Nothing else matters until all six work end to end:

```
1 photograph → 2 clean the photo → 3 speak 30s → 4 AI writes it → 5 price → 6 publish
   on phone       on phone           on phone      needs net       on phone   needs net
```

---

## Non-negotiable rules

1. **No typing in the sell flow.** If a screen needs a keyboard, that screen is wrong.
2. **Nothing publishes without her tick.** AI proposes, artisan decides.
3. **Every button has an icon AND a word**, and says its label out loud when tapped.
4. **Minimum 56px tap targets, minimum 15px text.** Enforced in `index.css`.
5. **No user-facing text inside a component.** It goes in `lib/i18n.ts` so it can be
   translated *and* spoken.
6. **No hardcoded colours.** Use the tokens in `index.css`.
7. **Never enhance a photo into a lie.** No colour shifting, no hiding defects.

---

## Layout

```
src/
  lib/          things that work everywhere, no business logic
    speak.ts      text-to-speech          ✅ works
    listen.ts     speech-to-text          ✅ works (Chrome/Android)
    i18n.ts       all user-facing strings ⚠️  Hindi + English only
  services/     anything that talks to the outside world
    db.ts         products                ✅ works (localStorage)
    pricing.ts    fair-price engine       ✅ floor works, band is fake
    gemini.ts     the AI brain            ⚠️  works, but needs a key
    bgRemove.ts   cut out the background  ❌ stub — returns the original
    queue.ts      offline job queue       ❌ stub
  components/   shared UI
  screens/      one file per step of the golden path
```

**Why services are `async` even when they don't need to be:** so swapping
localStorage for Firestore later changes `db.ts` and nothing else.

---

## Getting it running

```bash
npm install
npm run dev          # then open the Network URL on your phone, same wifi
```

To turn the real AI on:
```bash
cp .env.example .env
# put a free key from https://aistudio.google.com/apikey into VITE_GEMINI_API_KEY
```
Without a key the app uses mock listing text, so the flow still works.

> Note: `VITE_` variables are visible in the browser. Fine for a college demo,
> **not** fine for production — production routes the call through a server.
> Have that answer ready if a judge asks.

---

## What to build next, in order

| # | Task | Owner | Notes |
|---|------|-------|-------|
| 1 | Real background removal | Camera | `npm i @huggingface/transformers`, model `briaai/RMBG-1.4`, run in-browser, composite onto white in `bgRemove.ts` |
| 2 | Get the Gemini key working | AI | Test with a real craft photo + a Hindi voice clip on day one. If output is poor, we need to know *now* |
| 3 | Fill in UI strings for the other 4 languages | Voice | `lib/i18n.ts` has Hindi + English. Maithili, Bengali, Marathi, Tamil fall back to Hindi for interface text, though speech already works in all of them |
| 4 | Firestore instead of localStorage | Data | Only `db.ts` changes. Buyer view then listens live instead of polling |
| 5 | PWA + offline | Data | `vite-plugin-pwa`, then make `queue.ts` real with IndexedDB |
| 6 | Comparables dataset | Pricing | ~300 rows scraped by hand. Replaces the fake `marketBand()` |
| 7 | Capacitor → APK | Data | Do it before the pitch, not after. It answers "is it a mobile app?" |
| 8 | Ministry dashboard | Buyer/pitch | Artisans onboarded, GMV, income delta |

---

## Languages — what actually works

The picker sets one app-wide language (`lib/i18n.ts`), remembered in localStorage.
It drives three separate things, and they are NOT all at the same level:

| | Status |
|---|---|
| Speech in / out | Hindi, English, Bengali, Marathi, Tamil — all real |
| Maithili speech | Goes through the **Hindi** recogniser. Chrome has no Maithili model. The transcript comes out phonetically rough; Gemini is told this and reads it generously. Real Maithili ASR needs Bhashini or Whisper — a later task |
| Interface text | Hindi and English only. The rest fall back to Hindi |
| Listing output | Always both English and Hindi. She sees her own language first; the other is labelled "for the buyer" |

Say this plainly if a judge asks. Do not claim five working languages when the
honest answer is four plus a documented fallback.

## Things that are deliberately fake (be honest about these)

- **ONDC / GeM** — the `/buyer` page stands in for them. The adapter is designed,
  not built. Seller onboarding needs a registered business entity we don't have.
- **Market price band** — derived from the floor, not from real data. The *floor*
  is real and needs no data, which is the point.
- **The ₹450/day wage** in `pricing.ts` — replace with a sourced figure and cite it.
