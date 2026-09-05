# Pehchaan — SPEC

**Read this before you write any code.** One repo, one spec, one architecture.
If you disagree with something here, change *this file first*, then the code.

---

## What the app is

A phone-first web app (PWA) that turns **one photo + 30 seconds of speech** into a
professional product listing, priced fairly, published where buyers already are.

The golden path is six steps. Nothing else matters until all six work end to end:

```
0 which language?  ← before anything, because everything after it is words
1 photograph → 2 clean the photo → 3 speak 30s → 4 AI writes it → 5 price → 6 publish
   on phone       on phone           on phone      needs net       on phone   needs net
```

The first time through, the guide rings each of these controls in turn and says
what it does — on the real app, not a simulation of it. After that every screen
still narrates itself. See "The guided first run" and "What every screen says".

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
8. **One voice at a time.** Two utterances at once is worse than silence — she
   cannot re-read the half she missed. Anything that would start a second voice,
   or open the microphone while this one is running, disables itself.
9. **Nothing the app says follows her off the page.** A sentence about a screen
   she has left is the app talking about somewhere she is no longer looking.
10. **Never say a thing twice.** Two rings on one button, or a caption
    repeating what the screen beneath it already says, reads as the app
    stuttering. Cutting a step is usually the fix.

---

## Layout

```
src/
  lib/          things that work everywhere, no business logic
    speak.ts      text-to-speech          ✅ web + native, one voice at a time
    listen.ts     speech-to-text          ✅ works (Chrome/Android)
    i18n.ts       all user-facing strings ✅ all six languages
    guide.ts      the guided first run    ✅ runs ON the app, not a simulation
    arrival.ts    what a screen says      ✅ every step narrates itself
    idle.ts       has she stalled?        ✅ gates the beacon
  services/     anything that talks to the outside world
    idb.ts        raw IndexedDB plumbing  ✅
    store/        picks a backend         ✅ local (IndexedDB) or cloud (Firestore)
    firebase.ts   cloud config            ⚠️  needs .env to switch on
    db.ts         products                ✅ works
    pricing.ts    fair-price engine       ✅ floor works, band is STILL fake
    gemini.ts     the AI brain            ✅ works; chains models past a spent quota
    bgRemove.ts   cut out the background  ✅ real — RMBG-1.4, in the browser
    queue.ts      offline job queue       ✅ real — IndexedDB, survives a close
    messages.ts   artisan <-> buyer chat  ✅ works (translation needs the key)
    orders.ts     bulk orders             ✅ works (no payments)
  components/   shared UI
  screens/      one file per step of the golden path
                Start.tsx is the language screen, shown before anything else
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
| 1 | ~~Real background removal~~ | Camera | **Done.** `briaai/RMBG-1.4` in the browser. First run ~37s and 50 MB; every run after ~10s and 0 bytes |
| 2 | ~~Get the Gemini key working~~ | AI | **Done.** Key in local `.env`. Models chosen by benchmark, not guesswork — see below |
| 3 | ~~Fill in UI strings for the other 4 languages~~ | Voice | **Done.** All six live in `lib/locales/`, one file each, every locale typed against `hi.ts` so a missing key fails the build. Still wants a native speaker's eye — Maithili most of all |
| 4 | Firestore instead of IndexedDB | Data | Only `db.ts` changes. **This is what makes the demo's best moment possible** — right now the buyer page reads local storage, so a phone and a laptop cannot see each other's products |
| 5 | ~~PWA / offline queue~~ | Data | **Done.** Installable, shell precached, and `queue.ts` is a real IndexedDB job store that survives the app being closed |
| 6 | **Comparables dataset** | Pricing | **The most important thing left.** ~300 rows collected by hand from iTokri, GoCoop, Jaypore, Amazon Karigar. Replaces the fake `marketBand()` — see "deliberately fake" below. One day, ₹0, and it is the one weakness a judge can find in 90 seconds |
| 7 | ~~Capacitor → APK~~ | Data | **Set up.** `npx cap add android` done, launcher icons from the brand mark, and a manual **APK** workflow in Actions that builds a debug APK on ubuntu — nobody needs a 2 GB SDK locally. **Untested on a real phone**, and speech is the risk: see below |
| 8 | Ministry dashboard | Buyer/pitch | Artisans onboarded, GMV, income delta. The data model already supports it |
| 9 | Rotate several Gemini keys | AI | The daily quota is per PROJECT, so one key per teammate multiplies it. See the quota note below |
| 10 | Native-speaker pass on 4 locales | Voice | Bengali, Marathi, Tamil, Maithili are machine-translated. Coverage is complete; wording is provisional |

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

**Your key is in `.env`, which is gitignored.** The deployed PWA and the APK
read GitHub Actions secrets, and all seven of those **are set** — Gemini and
Firebase are both live in the deployed build.

### The free tier gives you TWENTY listings a day

Not per minute. Per day, per model, per project. The API says so itself when it
refuses:

```
GenerateRequestsPerDayPerProjectPerModel-FreeTier, limit: 20, model: gemini-3.5-flash
```

That is not a demo budget; it is barely a rehearsal, and a team testing all
afternoon will spend it before anyone stands up to present. Two consequences,
both already handled in `gemini.ts` — do not undo either:

**A 429 is not retried.** It used to be, and on a per-day quota that made
things worse: every retry spent another request from a bucket that was already
empty, so one listing burned three of the twenty and still failed. A 429 now
carries the API's own `RetryInfo` and is only retried when it says to come back
within eight seconds. Longer than that is the day's allowance, and waiting
cannot fix it.

**Each job names a CHAIN, not a model.** The bucket is per model, so a model
that is spent is not a failure — it is a reason to use the next one. The
benchmarked choice is still first and still the only one the happy path
touches; the rest turn "we ran out" into "slightly different words".

| Job | Chain |
|---|---|
| Listing | `gemini-3.5-flash` → `3.6-flash` → `3-flash-preview` → `3.5-flash-lite` |
| Translate | `3.1-flash-lite` → `3.5-flash-lite` → `flash-lite-latest` |

One trap worth writing down, because the error names no field:
**`thinkingBudget: 0` is rejected by most of these models the moment you also
ask for structured JSON output** — plain `400 Request contains an invalid
argument` and nothing more. Only the primary and `gemini-3-flash-preview` take
both. Turning thinking off is worth seconds, so we still send it; a model that
objects gets the same request again without it and is remembered as fussy for
the session.

If ~80 listings a day is still not enough, the next lever is free: the quota is
per *project*, so a key from each teammate multiplies it. `tools/quota.test.mjs`
guards all of the above.

## The APK

Run the **APK** workflow from the Actions tab (or push a `v*` tag) and download
`pehchaan-apk` from the run. The artifact is named after the commit it was
built from — `pehchaan-main-<sha>.apk` — so check that against `git log` before
demoing. **The APK does not rebuild itself when you push**; it went 23 commits
stale once and nobody noticed until it mattered. It is a **debug** APK on purpose: a release build
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

**One thing genuinely behaves differently, and it is worth testing on hardware:
the guided first run.** On the speak screen the guide rings the microphone —
unless the browser has no recogniser, in which case it rings the typing
fallback instead, with `cannotHear` as its caption. Android's WebView is
exactly that browser. Pointing an artisan at a microphone that cannot work,
with the caption card sitting over the one control that would get her out of
it, is the worst thing this guide could do, so the branch exists. It is tested
locally by faking the capability; **check it on a real phone before a demo.**

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
| **Bloom** (`Bloom.tsx`) | Publish success | A ring drawn from the logo's four segments. Replaced `Kolam.tsx`, which was a generic flourish rather than ours |
| **Jharokha arch** (`.arch`, `Empty.tsx`, `Shopfront.tsx`) | product cards, empty screens | The cusped window. An empty screen gets a lit niche, not a grey glyph at 40% opacity — that is the visual language of a page that failed, and she cannot tell the two apart |
| **Beacon** (`.beacon`) | the one control to press | See its own section. Off unless she has stalled |

Rules for anything added later:

- No gradients on buttons — contrast dies in sunlight
- **Never letter-space anything but English.** Devanagari, Bengali and Tamil
  build a syllable from a consonant plus marks that hang off it, and tracking
  pulls the marks away from what they belong to: "आपकी दुकान" at .16em reads as
  loose debris. Five of our six languages are in those scripts. The `.label`
  rule applies tracking only under `html[lang^="en"]`, and `<html lang>` now
  tracks the chosen language — it used to say "hi" forever, which also
  announced Tamil in Hindi to a screen reader
- **Green means yes.** Publish this, accept this order. It is not a colour for
  navigation; spending it on "go home" is what stops it meaning anything where
  it has to
- **A popover states its own ink.** Two bugs of exactly one shape: the language
  button and every row of its dropdown inherited cream text from the night
  header and sat on a cream panel. Both survived unnoticed because emoji ignore
  the text colour, so the glyph showed and only the words vanished
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

## The guided first run

There is no tour screen any more, and `screens/Tour.tsx` was deleted. What was
there was a **simulation**: ten screens of a pretend clay pot with fake buttons
that did nothing, ending in "now you try" and an empty home screen. She had
watched a film about an app, not used one, and everything she had just been
shown was somewhere she was no longer looking.

The guide now runs **on the real app**. `lib/guide.ts` holds the whole thing:
an ordered list of steps, persisted in localStorage, and `components/Coach.tsx`
draws one. It darkens the screen, rings the actual control, says out loud what
it does, and waits for her to press *that* control. A step ends because she
really photographed something, not because she pressed "next" on a picture of
photographing something. By the end she has a real published listing made from
her own photograph and her own voice.

`Start.tsx` comes before all of it: one screen, one question, which language.
Nothing else is shown until it is answered, because everything else is words.

Five rules that are load-bearing — `tools/guide.test.mjs` asserts them:

- **Never a trap.** The dim is an outward box-shadow on a box with no pointer
  events, so every control on the screen stays live and "skip" is on every
  card. An artisan who takes a wrong turn in a locked overlay has no way back.
- **The guide can never fall behind her.** She can outrun a ring that is
  waiting for a target that never appears, so `advanceGuide` jumps forward
  rather than requiring an exact match.
- **A self-skip is silent.** A step whose target is not on this screen gives up
  and moves on — and used to announce the next one, so the app talked twice, in
  full sentences, at someone who had touched nothing.
- **Escape hatches are unburiable.** The caption card picks the side that
  covers least, and anything marked `data-guide-keep` costs fifty times an
  ordinary control. That is how "type instead" stays reachable on the speak
  screen, which is exactly the screen where the microphone may not work.
- **Fewer steps is better.** Two rings on the same action bar one after another
  read as the photo step happening twice. Where no placement worked, the step
  was deleted rather than squeezed in.

## What every screen says

`lib/arrival.ts`. The guide talks her through the app once and then goes quiet
forever, and every screen after that used to open in silence — fine for someone
who can read the instruction printed at the top of it, useless for the person
this app is for.

Each step of the golden path now says three things: what this screen is for as
she arrives, what is happening while it happens, and that it is finished when
it is. Once per screen, keyed on the text. Never over the guide, which is
already talking. And `Screen.tsx` stops the voice on unmount, so a sentence
never follows her onto the next page.

**One voice at a time, everywhere.** `speak()` exposes whether the phone is
talking and anything that would start a second voice — or listen while this one
runs — disables itself off it. The microphone is the one that mattered: it
could open mid-word, so the recogniser's first words were the app's, not hers.
Navigation never disables. `tools/speech.test.mjs` guards the ordering.

## The beacon

`lib/idle.ts` plus `.beacon` in `index.css`. A gold ring that pulses around the
one control to press.

Two decisions, and the second is the important one:

- It is a ring **outside** the control, never a shine across it. A highlight
  sweeping over a button is a gradient on a button, and the rule below exists
  because gradients lose contrast in direct sunlight — which is where a woman
  photographing her work in a courtyard is standing.
- It is **off by default**. A permanent glow on every screen's main button was
  the first instinct and it is worse: a thing that always moves stops being
  seen within a day, and then the moment you truly need her eye has nothing
  left to grab it with. Nothing rings until 4.5 seconds without a touch, and it
  goes the instant she acts. Someone moving confidently never sees it.

On the price screen it follows what is **missing**: it rings "what did you used
to get" while that is still ₹0, and only moves to "next" once she has answered.
That field is the only input the income figure is computed from and the one
everybody skips.

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
screen with the brand mark (generated by `tools/make-icons.mjs`).

- App shell precached: 25 files, about 770 KB — including the three display
  font subsets, so headings survive airplane mode in whichever language she
  chose. `unicode-range` means a phone downloads exactly one of them: Devanagari
  77 KB, Bengali 43 KB, Tamil 19 KB, never the sum. `scripts/make-font.sh`
  regenerates them
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
- **The cost defaults.** ₹200 of material and half a day. Deliberately modest:
  they used to be ₹300 and *sixteen hours*, two working days assumed on her
  behalf for every object, so a clay lamp, a dupatta and a plastic bottle all
  priced at exactly ₹3,040. A default is us guessing her labour, and guessing
  high produces a price no buyer pays. The floor is there for her to raise.
