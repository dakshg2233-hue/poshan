# Poshan launch log

Everything done between 16 and 20 September 2026, getting Poshan from a local
project to a live site. Written so that the reasoning survives — most of what
follows was a bug that looked like nothing, and the useful part is *how* it was
found, not just that it was.

---

## Where things stand

| | |
|---|---|
| **Live** | https://poshanco.netlify.app and https://poshan.co.in |
| **Repo** | github.com/dakshg2233-hue/poshan, `main` |
| **Tests** | 137 passing |
| **Database** | 30 tables, RLS on every one, 5 migrations applied |
| **Blocking launch** | Razorpay configuration only |

---

## Infrastructure

### Domain

`poshan.co.in`, bought on GoDaddy. `.com` and `.in` were both taken; `.co.in`
reads right for an India-first product and was free.

DNS took three attempts. GoDaddy's Airo assistant set up **domain forwarding**
first, which is a 301 to the Netlify URL — the address bar never shows your
domain, SEO lands on `netlify.app`, and auth cookies bind to the wrong host.
Removed. Then the nameservers were pointed at Netlify DNS
(`dns1-4.p09.nsone.net`) without the delegation actually being changed, so
Netlify sat on "propagating" forever. Once the nameservers moved, SSL issued
itself and `www` redirects to the apex.

`.in` domains need registrant KYC through NIXI — done. Auto-renew should be on:
losing the domain to a missed renewal takes the site, email and SEO at once.

### Hosting

Netlify, not Vercel. Vercel's free Hobby tier prohibits commercial use and
Poshan takes subscriptions. Netlify's free tier allows it, runs Next.js 16 on
the OpenNext adapter, and — unlike Cloudflare Workers — gives a Node runtime, so
`node:crypto` and `web-push` work without a rewrite.

One trap cost a debugging round: environment variables were imported with
**Specific scopes** rather than **All scopes**, so they reached the build but
not the functions. The login page worked and every server route returned
`{"error":"Supabase not configured"}`.

### Database

Supabase, project `rbwqbjzxfveqyohsvrxs`. Five migrations, all verified after
applying rather than assumed:

- `webhook_events` — Razorpay replay protection
- `checkout_orders` — Poshan's own price ledger
- `rate_limits` + `check_rate_limit()` — a limiter that survives serverless
- plus the two that predate this work

The rate limiter was tested behaviourally, not just created: **10 simultaneous
requests against a limit of 4 let exactly 4 through.** The old in-memory
limiter would have passed all 10.

---

## Bugs found and fixed

Ordered by what they would have cost.

### Onboarding never saved anything

`profiles.id` **is** the auth user id — the table has no `user_id` column and
never had one. Onboarding sent `.eq("user_id", user.id)`, which PostgREST
rejects outright. Every other query against `profiles` already keyed on `id`;
this was the one that did not.

It failed in total silence. `supabase-js` resolves with `{ data, error }`
rather than throwing, so the `try/catch` never fired, the returned error was
never read, and the redirect to `/dashboard` ran as though it had worked.
Nothing was written — not the calorie target, the goal, the region, the diet,
nor `onboarding_completed`, which is why finishing onboarding never actually
finished it.

### Two different calorie models

Onboarding computed maintenance with **Mifflin-St Jeor**; every other surface —
the daily plan, the week plan, the Today widget, clinician plans, the hero —
used **ICMR-NIN 2020**. They disagree by **139 to 898 kcal** for the same
person, and onboarding's was always the lower one.

That number goes into `profiles.tdee`, and `/api/daily` reads
`target.tdee ?? estimate(...)` — so the saved figure wins and the ICMR path is
never reached again. Every user's target would have sat several hundred kcal
under the model the product is built on. Onboarding also discarded weight,
height, age, sex and activity, so it could not be recomputed.

Its activity scale was wrong with it: five levels offered, three accepted by
both the ICMR table and the `activity_level` check constraint.

### Two endpoints open to the internet that spend money

`/api/scan` and `/api/voice-log` take no authentication — by design, since the
Food Scanner is a nav tab a logged-out visitor is meant to try — and every
accepted call sends a photo or transcript to a paid model.

The only guard was `rateLimit()`, which counts in a `Map` in process memory.
Honest when this was one process; **very nearly a no-op on Netlify Functions**,
where concurrent requests each land on their own instance with an empty Map.
The guard did not fail loudly when the app was deployed — it quietly stopped
existing. The file predicted exactly this in its own header comment.

Confirmed before changing anything: `POST /api/scan` with an empty body
returned `400 "No image supplied"`, not `401`.

### The free tier's scan limit was in localStorage

"2 scans per day" is on the pricing page and the scanner UI honours it — by
counting in `localStorage`. Clearing site data, a private window, or POSTing
directly gave unlimited free scans. It also hollowed out the tier above:
"unlimited camera scans" is sold as a Home feature, but free was already
unlimited to anyone who looked.

### A subscriber could subscribe twice

`/api/razorpay/subscription` never checked for an existing subscription, the
table has no unique constraint on `user_id`, and `CheckoutButton` is only told
whether the visitor is signed in — not whether they already subscribe. Two
clicks and Razorpay bills one person on two live subscriptions. Both provision
cleanly, because provisioning upserts on `razorpay_subscription_id` and the
second has a different one. The customer finds out on their card statement.

### Cancelled subscriptions kept their access

Ten premium gates read `status in ('trialing','active')`, and nothing in the
codebase ever wrote any other value. The webhook only acted on
`subscription.charged`.

The mechanism was guard order: events that end a subscription carry no payment
entity, and the handler opened with
`if (!paymentId || !subscriptionId) return ignored` — so every cancellation was
dropped one line before anything could read it. A refund did the same thing one
event further along.

### The whole app counted days in UTC

Every "what day is it" was `new Date().toISOString().slice(0, 10)`. India is
UTC+5:30, so between midnight and 05:30 IST that returns **yesterday**.

Demonstrated before fixing: at 00:30, 02:00 and 05:00 IST on 19 September, the
old expression returns `2026-09-18`.

For an app built on one row per day this is five and a half hours every night of
writing to the wrong day. It fails exactly where it hurts — dinner in India is
late, so a meal logged at half past midnight went into yesterday's total, today
looked empty, and the streak broke. The chat quota reset mid-morning for Indian
users. Nineteen call sites now use `lib/day.ts`, with eight tests pinning the
boundary.

### The free-premium QA flag

`FORCE_PREMIUM` hands out every paid gate. It was protected by an argument
rather than by code — "the only place that sets it is `.env.local`, which is
gitignored" — which held until the app was deployed, because a hosting
dashboard is also a place env vars live. The real `.env.local` says `true`, so
copying it wholesale into Netlify was all it would have taken. A production
build now refuses it whatever the environment says.

### Email sent from a domain Poshan does not own

Both sender addresses said `@poshan.health`. That domain was on the shortlist
when the name was chosen and never bought. A wrong `from:` compiles,
type-checks and passes every test, then fails silently at Resend, which refuses
to send from an unverified domain.

### The Terms page showed editorial notes

Two `[TO CONFIRM]` blocks rendered inside `<p>` tags on the live page. One sat
where the billing terms belong, so anyone reading before paying ₹299 a month
found a bracketed note to the author. Most of what they covered was never
unknown — the trial, the prices and the cancellation mechanics are all facts
the codebase already held.

---

## Plans: what was sold versus what existed

### Removed, because nothing was behind them

**"A registered dietitian reviews your plan monthly."** No review queue, no
dietitian account, no scheduling, no record of a review ever happening. A
recurring human service on a ₹2,499/year plan with no mechanism.

**"Swap individual dishes and auto-adjust calories."** Swapping is free — the
week-plan route says so in its own comment. Listing it under Home implied free
users could not do it.

### Built, because the promise was fine and the app never kept it

The page sold "2 biomarkers: Vitamin D and HbA1c" free and "all 4 biomarkers"
on Home. There was no list of four, **no Vitamin D anywhere in the codebase**,
and no gate — `biomarker_readings.marker` is plain `text` with no constraint, so
any account could store any string.

The app now matches what was sold rather than the copy being walked back:

| Marker | Tier |
|---|---|
| Vitamin D | Free |
| HbA1c | Free |
| Haemoglobin | Home |
| LDL | Home |

Haemoglobin because anaemia is India's most common deficiency by a wide margin
and it moves with food; LDL because it is the lipid number people are given a
target for and told to eat around.

The endpoint needed the same attention: it spread the raw request body straight
into the insert, so the caller chose the columns, and a malformed body threw
into a 500 rather than a 400.

### Undersold

Condition support names four conditions. **Eleven are built**: diabetes, PCOS,
hypothyroid, anaemia, CKD, coeliac, dyslipidaemia, gout, hypertension, lactose
intolerance, NAFLD — 606 lines of clinical guidance.

### Open by choice

Poshan Plus (₹999/year) has no student verification, so anyone can buy it
instead of Home at ₹2,499. The academic-email check is built and tested, off
behind `COLLEGE_VERIFICATION=on`. Practical effect: **family profiles are now
the real difference between the two plans.**

---

## Design changes

### The cursor

A mithai followed the pointer — ladoo by default, with a picker offering modak,
jalebi, gulab jamun and eight others. It never replaced the arrow:
`MagneticCursor` renders a *second* element rather than setting `cursor: none`,
so people got an arrow with a 30px sweet riding beside it, covering whatever
they had just pointed at. On a page whose content is portion sizes and calorie
targets, the thing under the pointer is the thing being read.

Two pointer-following glows went with it. `PointerLight` pooled light under the
cursor across every page. The hero ran its own — a radial gradient drawn into a
canvas every frame, re-encoded to a data URL, and used as a mask to "uncover a
second still-life". **It never uncovered anything:** `STILL` and `MOTION` were
the same file, so the mask revealed the identical photograph. All that work
produced a bright disc chasing the pointer.

966 lines removed. The hero has no state, refs or effects left.

### The hero photograph

One thali on every landing read as the same page every time. It now picks from
`public/hero/` at random per visit — all vegetarian, all at the 1.83 aspect the
hero has always used.

**On "use vectors so it does not pixelate":** a photograph cannot be a vector.
SVG describes shapes, so vectorising a food photo produces a flat poster
illustration rather than a sharper photograph. Resolution and framing are what
prevent softness — each photograph is at least 1600px wide and painted with
`cover`, which crops rather than stretches.

Two wrong turns worth recording. The picker first went in the hero component,
which is a client component — **React inserts those scripts through innerHTML
and browsers never execute scripts added that way**, so it silently did nothing.
Moved to the root layout, a server component, it runs. It then set the CSS
property on `documentElement.style`, which React hydrates, and every load logged
a hydration mismatch. Writing it into an injected `<style>` leaves React nothing
to reconcile.

**To add photographs: drop files in `public/hero/`.** The folder is the list.
`npm run hero:check` verifies aspect, width, weight and progressive encoding
before they ship — worth checking rather than documenting, because a
wrongly-shaped image does not look broken, it silently crops, and what it crops
is usually the dish.

---

## Still to do

### Razorpay — the only launch blocker

1. **Rotate the key.** The old secret was pasted into chat twice and must not
   reach production.
2. **Create the three plans.** `scripts/` has a script that reads ₹299, ₹2,499
   and ₹999 from the app's own constants, so the plans cannot disagree with what
   `checkout_orders` records as the expected price.
3. **Set the webhook secret.** The URL is right; the secret still says "Not
   provided", and until it is set every delivery is rejected. Cut the 49
   subscribed events to the five the code handles: `subscription.charged`,
   `.cancelled`, `.halted`, `.completed`, `refund.processed`.
4. **Six variables on Netlify, All scopes**, then deploy without cache.

### Also outstanding

- **OpenAI credits.** The key is valid, the balance is zero, so the scanner and
  voice logging are off. `platform.openai.com` — *not* ChatGPT Plus, which does
  not touch the API. Set a hard monthly cap and leave auto-recharge off.
- **Custom SMTP.** Supabase's built-in email is rate-limited to a handful an
  hour and cannot be raised. Point it at Resend, which needs `poshan.co.in`
  verified there first — those DNS records now go in Netlify, not GoDaddy.
- **The operating entity.** Terms and Privacy carry a JSX comment where the
  registered name and address belong. It must match the entity on the Razorpay
  account that collects the money.
- **Statement descriptor.** Payments run through a Daxora Razorpay account.
  Customers paying for "Poshan" who see "Daxora" on a statement is the top
  driver of chargebacks for a consumer subscription. Check what the checkout
  modal actually shows in a test payment.

### Tests worth running once

- Sign in with a real OTP, complete onboarding, reload, confirm the answers
  persisted. Onboarding wrote nothing at all until this week, so this is the
  test that matters most.
- One real payment end to end: subscribe, confirm the row, cancel, confirm
  access is revoked. The cancellation path was rewritten and has never run
  against live Razorpay.
- Force `paymentSuccess = true` in the browser and confirm premium does **not**
  activate.

---

## Notes for later

- **`git revert 8c7eb53`** undoes the rotating hero alone. Nothing depends on it.
- `COLLEGE_VERIFICATION=on` turns student verification on. It is built and
  tested, including the lookalike domains a naive `endsWith` would wave through.
- `NEXT_PUBLIC_GAMIFICATION_ENABLED=false` keeps streaks, badges and
  leaderboards off. **Deleting the variable turns them on** — the default is on.
- `NEXT_PUBLIC_FORCE_PREMIUM` must never be set in production. The code now
  refuses it in a production build regardless, but do not set it.
- Netlify's durable cache can serve a stale page after a deploy. Check with a
  cache-busting query string before concluding a fix did not land.
