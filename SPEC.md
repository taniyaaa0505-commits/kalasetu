# Pehchaan — SPEC

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
    idb.ts        raw IndexedDB plumbing  ✅
    store/        picks a backend         ✅ local (IndexedDB) or cloud (Firestore)
    firebase.ts   cloud config            ⚠️  needs .env to switch on
    db.ts         products                ✅ works
    pricing.ts    fair-price engine       ✅ floor works, band is fake
    gemini.ts     the AI brain            ⚠️  works, but needs a key
    bgRemove.ts   cut out the background  ❌ stub — returns the original
    queue.ts      offline job queue       ❌ stub
    messages.ts   artisan <-> buyer chat  ✅ works (translation needs the key)
    orders.ts     bulk orders             ✅ works (no payments)
  components/   shared UI
  screens/      one file per step of the golden path
                Chat.tsx and BuyerProduct.tsx are the two sides of the
                translated conversation
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
| 2 | ~~Get the Gemini key working~~ | AI | **Done.** Key in local `.env`. Models chosen by benchmark, not guesswork — see below |
| 3 | ~~Fill in UI strings for the other 4 languages~~ | Voice | **Done.** All six live in `lib/locales/`, one file each, every locale typed against `hi.ts` so a missing key fails the build. Still wants a native speaker's eye — Maithili most of all |
| 4 | Firestore instead of IndexedDB | Data | Only `db.ts` changes. **This is what makes the demo's best moment possible** — right now the buyer page reads local storage, so a phone and a laptop cannot see each other's products |
| 5 | ~~PWA~~ / offline queue | Data | **PWA done** — installable, app shell precached. Still to do: make `queue.ts` real with IndexedDB |
| 6 | Comparables dataset | Pricing | ~300 rows scraped by hand. Replaces the fake `marketBand()` |
| 7 | ~~Capacitor → APK~~ | Data | **Set up.** `npx cap add android` done, launcher icons from the brand mark, and a manual **APK** workflow in Actions that builds a debug APK on ubuntu — nobody needs a 2 GB SDK locally. **Untested on a real phone**, and speech is the risk: see below |
| 8 | Ministry dashboard | Buyer/pitch | Artisans onboarded, GMV, income delta |

---

## Which Gemini model, and why

Measured, not guessed. Re-run `tools/bench-gemini.mjs` and `tools/bench-listing.mjs`
before changing either.

| Job | Model | Time |
|---|---|---|
| Listing (photo + voice -> JSON) | `gemini-3.5-flash` | 2.9s |
| Chat translation | `gemini-3.1-flash-lite` | 0.7s |

- **`gemini-3.7-flash` was tried and rejected: 17 seconds** for one short
  translation. Do not "upgrade" to it without re-running the benchmark.
- **`gemini-2.0-flash` is retired** — the API returns 404. That was our original
  model, hardcoded from memory.
- These models **think by default**, which we switch off (`thinkingBudget: 0`).
  It cost seconds and changed nothing we care about.
- The translate prompt insists on Arabic numerals. Without it the model wrote
  the quantity as `२००`, and a price she misreads is worse than no translation.

**Your key is in `.env`, which is gitignored. It is NOT in the deployed app** —
that build reads a GitHub Actions secret, which is not set. See below.

## The APK

Run the **APK** workflow from the Actions tab (or push a `v*` tag) and download
`pehchaan-apk` from the run. It is a **debug** APK on purpose: a release build
needs a keystore and an unsigned one will not install, which defeats the point.
On the phone, allow "install from unknown sources" once.

Locally, `npm run apk` does the same thing but needs the Android SDK installed.
You do not need it — that is why the workflow exists.

### Speech in the APK is NOT the web's speech

It was the risk, and it happened: **the first APK was silent.** The Web Speech
API is a Chrome feature and the Android System WebView is not Chrome, so
neither `speechSynthesis` nor `webkitSpeechRecognition` exists inside the app.
For a non-reader, an app that does not talk is an app that does not work.

Both now have a native path, over Android's own engines:

| | Web | APK |
|---|---|---|
| Voice out | `speechSynthesis` | `@capacitor-community/text-to-speech` |
| Voice in | `webkitSpeechRecognition` | `@capacitor-community/speech-recognition` |

The split is entirely inside `lib/speak.ts` and `lib/listen.ts`, chosen once
from `Capacitor.isNativePlatform()`. Both wear the same shape, so no screen
knows which one it got, and the web build is byte-for-byte the same behaviour
it always had.

Two Android details that will waste a day if you forget them:

- `RECORD_AUDIO` in the manifest, asked for when she first taps the mic.
- A `<queries>` block for `android.speech.RecognitionService` and
  `android.intent.action.TTS_SERVICE`. Android 11 hid other packages; without
  it both services are invisible and fail with nothing useful in the log.
- `popup: false` on the recogniser. With the system dialog up Android sends no
  partial results, and the live text is the only proof she has that the phone
  is hearing her — quite apart from putting a screenful of English in front of
  someone who cannot read it.

## Languages — what actually works

The picker sets one app-wide language (`lib/i18n.ts`), remembered in localStorage.
It drives three separate things, and they are NOT all at the same level:

| | Status |
|---|---|
| Speech in / out | Hindi, English, Bengali, Marathi, Tamil — all real |
| Maithili speech | Goes through the **Hindi** recogniser. Chrome has no Maithili model. The transcript comes out phonetically rough; Gemini is told this and reads it generously. Real Maithili ASR needs Bhashini or Whisper — a later task |
| Interface text | All six, in `lib/locales/`. Machine-translated from the Hindi and not yet read by a native speaker of Bengali, Marathi, Tamil or Maithili — treat wording as provisional, not the coverage |
| Listing output | Always both English and Hindi. She sees her own language first; the other is labelled "for the buyer" |

Say this plainly if a judge asks. The honest sentence is: six languages in the
interface, five with real speech recognition, and Maithili heard through the
Hindi recogniser on purpose because Chrome ships no Maithili model.

Do not upgrade that to "six fully working languages". The fallback is a
deliberate, documented choice and it survives being asked about; a claim that
Maithili ASR works does not.

## If the app opens to a blank screen

Almost certainly **the database is blocked by another tab**. When we add an
object store we bump `DB_VERSION` in `db.ts`, and IndexedDB cannot upgrade
while an older connection is still open somewhere.

Fix: **close every tab and window with the app open, then reopen one.**

The app now tells you this instead of sitting there empty — `db.ts` handles
`onblocked`, steps aside on `onversionchange`, and times out after 8 seconds
rather than hanging forever. `tools/db-blocked.test.mjs` proves the hang is
gone.

**When you bump `DB_VERSION`, tell the team.** Everyone with two tabs open
for the buyer demo will hit this.

## Visual language

One motif, used consistently. Do not add a second.

| Piece | Where | Why it is not just decoration |
|---|---|---|
| **Beads on a thread** (`Thread.tsx`) | the six selling steps, and order status | Craft is thread, *setu* is a bridge. She cannot read a step count; a filled bead among empty ones needs no reading |
| **Mic ring** (`MicRing.tsx`) | Speak, Chat | Moves with her real voice. She cannot read the transcript, so this is her only proof the phone is hearing her |
| **Before/after wipe** (`BeforeAfter.tsx`) | Capture | Two stacked images make you compare from memory; one frame with a handle does not |
| **Price scale** (`PriceScale.tsx`) | Price | Shows how floor, market and suggestion *relate*. Below the floor is hatched — that region is a refusal, not a low option |
| **Kolam** (`Kolam.tsx`) | Publish success | A kolam is drawn at a threshold on a good morning. Her work is now out in the world |

Rules for anything added later:

- No gradients on buttons — contrast dies in sunlight
- No pattern behind text
- Nothing may sit between her and the next tap; decoration never delays an action
- Colour is never the only signal — icon and word too
- Prefer CSS and inline SVG. Every byte is a ₹7,000 phone on a metered connection

**Never open a second microphone stream.** The first mic ring measured loudness
with its own `getUserMedia`, which fought with speech recognition for the device
and popped a second permission prompt mid-recording. The ring is now driven by
the recogniser's own `speechstart`/`speechend`/`result` events — no extra mic
access, and reacting to *recognised speech* is the more honest signal anyway. A
passing truck moved the old meter and told her nothing.

**Before/after is not a wipe.** A wipe assumes both images line up
pixel-for-pixel. Ours never can: the original is whatever shape her camera gave
us, the cleaned one is a square auto-cropped to the product's bounding box. The
subject jumps between them, so it read as a glitch. It is now hero + inset,
tap to swap.

## Storage — one API, two backends

`services/store` decides once, at startup, from whether Firebase is configured:

| | With Firebase config | Without |
|---|---|---|
| Where data lives | Firestore | IndexedDB on the device |
| Updates | live `onSnapshot` | polled every 1.5s |
| Cross-device | **yes** | no — one device only |

**Domain code never asks which one it got.** `db.ts`, `orders.ts` and
`messages.ts` are thin layers over a `Collection<T>` with five operations. The
screens call `subscribeProducts` / `subscribeOrders` / `subscribeMessages` and
run no timers of their own, so they get realtime the moment config lands
without a line changing.

To switch it on, fill the `VITE_FIREBASE_*` block in `.env` from
console.firebase.google.com → your project → add a Web app. Leave it blank and
the app works exactly as before, on-device.

Two things to know:

- **`tools/store.test.mjs` guards the change-detection.** The polling backend
  only wakes a screen when fields the screen actually shows have changed —
  otherwise a list of photos re-renders twice a second forever. That test also
  caught a real bug: an empty collection has an empty signature, so subscribing
  to an empty store never fired the callback at all.
- **Photos travel inside the product document**, about half a megabyte of data
  URL. Firestore's limit is 1 MB, so it fits, but every read pulls the photos
  down again. Moving images to Cloudinary and storing URLs is the proper fix.
  `cloud.ts` warns above 800 KB.

Still open: **no per-artisan accounts.** Everything is one shared shop that
everyone can see. That is the deferred-identity design we chose, and it is fine
for a prototype — say so plainly rather than implying otherwise. Firestore
rules are prototype rules, not production ones.

## Removing a product

`services/products.ts` owns this, not `db.ts` — `db.ts` knows how to delete a
row, but only this layer knows what deleting a product *means*.

Two rules:

1. **A product with a live order cannot be removed.** An accepted order is a
   promise to a buyer, and a delivered one is the sales history the credit
   story depends on. Only a *declined* order stops blocking. She is told why,
   out loud, rather than the button silently doing nothing.
2. **Messages go with the product.** A conversation about a listing that no
   longer exists is unreadable on both sides.

The safety is the spoken confirmation, not a hidden button. Hiding a
destructive action from someone who cannot read does not protect her — it means
she can trigger it without understanding what she did. So the bin is plainly
visible, the sheet says aloud what is about to happen, shows the photo, and
puts the safe answer first.

`tools/remove.test.mjs` covers seven cases and fails if removal could ever
leave an orphaned order or message behind.

Still open: **unlisting is not deleting.** When a real product sells out she
wants it hidden from buyers, not erased. Do not conflate the two.

## The first-run tour

`/tour`. Shown automatically the first time the app opens, and reachable any
time from the 🎓 button on Home. `lib/tour.ts` remembers that she has seen it.

Ten steps, each of which **speaks itself the moment it appears**. Four of them
are hands-on — she presses the real camera, microphone, tap-to-hear and publish
buttons — because watching is not learning and her hands should know the flow
before anything is at stake.

**It touches no hardware, no network and no data.** The photos are drawn
(`tools/make-demo-images.mjs`), the transcript is scripted, the price is fixed.
That is deliberate: it has to run on a stranger's phone in a hall with bad wifi,
which is exactly when a demo matters most. `tools/tour.test.mjs` asserts this —
it fails if anyone adds `getUserMedia`, `fetch`, `listen` or `saveProduct` to
that screen.

It reuses the real `PriceScale`, `PriceInNotes`, `Kolam` and `Thread`, so what
she learns is what she later meets rather than a lookalike.

## The app icon

Two layers on purpose, and the reason is a mistake worth not repeating.

The first icon drew the kolam the same way the publish animation does — thin
outlines. It was an **unreadable smudge at 16px**, which is the size that
actually matters, because that is the browser tab.

So `tools/make-icons.mjs` builds it as:

- a **solid six-petal silhouette**, which is all you see at 16px
- **gold pulli and a fine ring**, which only resolve at 192px and above

The SVG favicon is the silhouette alone. The large PNGs get the detail. If you
redraw this, check it at 16px before anything else — outlines die there, filled
shapes survive.

## The PWA

`vite-plugin-pwa`, `autoUpdate`, `display: standalone`. Installs to the home
screen with a kolam icon (generated by `tools/make-icons.mjs`).

- App shell precached: 16 files, about 911 KB
- The 23 MB ONNX runtime is **excluded from precache** and runtime-cached
  instead — precaching it would make installing brutal on a metered connection
- The Hugging Face model is runtime-cached too, so background removal works
  offline once it has run a single time

## Orders — how the loop closes

The problem statement asks us to "connect directly with larger B2B buyers", so
an order carries a **quantity**: a gifting company ordering 200 diyas is the
case we design for, not one person buying one piece.

```
buyer places order → 🔊 she hears "आपका ऑर्डर आया है"
                   → ✅ yes / ❌ no    (two buttons, nothing else on screen)
                   → 📦 she marks it sent
                   → buyer marks it received
```

The state machine in `orders.ts` refuses anything else — she cannot ship an
order she never accepted, a decline cannot be undone, nothing moves backwards.
`tools/orders.test.mjs` checks all eight rules.

Deliberately NOT built: payments, escrow, shipping labels. An order is enough
to close the loop and to start the sales history that the credit story needs.

## The translated conversation

She speaks Maithili into her phone. He reads English on a laptop. Neither
needs a middleman and neither learns the other's language.

- `Chat.tsx` — her side. Voice in, voice out, never a keyboard. A new buyer
  message is read aloud automatically, because she cannot read it.
- `BuyerProduct.tsx` — his side. Types English, reads English, and sees her
  original words quoted under the translation so the exchange stays honest.
- Both renderings of every message are stored, so neither side is ever left
  with nothing to show, and a translation is never recomputed.
- Offline, a message still sends. It is stored untranslated and clearly
  marked, then retried on reconnect — never lost, never faked.

**To demo it on one machine:** open the app in two windows, one on `/#/buyer`
and one on the artisan's product. They share the same IndexedDB, so messages
cross between them. Across two devices this needs Firestore.

## Things that are deliberately fake (be honest about these)

- **ONDC / GeM / Amazon Karigar / Flipkart Samarth** — NOT connected. Nothing is
  sent anywhere. `publish()` sets a local flag and the listing appears on our own
  `/buyer` page, which is the only real destination.

  The Publish screen shows these as dashed, greyed, and labelled "not connected
  yet" on purpose. **Do not restyle them to look live.** Every one requires a
  registered business entity to onboard:

  | Channel | What onboarding actually needs |
  |---|---|
  | ONDC | Network Participant agreement, a legal entity, a subscriber ID and key pair registered with the ONDC registry |
  | GeM | Seller registration with Udyam/MSME, PAN, business bank account |
  | Amazon Karigar | An Amazon Seller Central account; SP-API needs developer registration |
  | Flipkart Samarth | Programme enrolment through a registered seller account |

  None of this is available to a student team in two weeks. That is a fact about
  the platforms, not a shortcoming of the build — say it plainly if asked.
- **Market price band** — derived from the floor, not from real data. The *floor*
  is real and needs no data, which is the point.
- **Chat translation without a Gemini key** — a tiny phrasebook covers a few
  demo sentences; anything else is stored and clearly marked "not translated".
  We never invent a translation.
- **The ₹450/day wage** in `pricing.ts` — replace with a sourced figure and cite it.
