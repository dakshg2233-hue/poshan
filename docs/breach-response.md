# Personal data breach: what to do

DPDP Act, 2023 — s.8(6). Written 20 September 2026.

The privacy policy promises we will tell affected users and the Data
Protection Board if their data is exposed. Before this file that promise had
nothing behind it: no way to notice a breach, no decision about who declares
one, and no drafted words to send. A commitment you have not rehearsed is a
commitment you will not meet at 2am on the day it matters.

Penalty ceiling for failing to notify is ₹200 crore, and it applies to the
failure to report — separately from any penalty for the breach itself. The
reporting is the part fully within our control.

---

## 0. The one-line version

**Anything that looks like unauthorised access to personal data → tell Daksh
immediately, write down the time, change nothing yet.**

Preserving evidence beats a fast fix in the first hour. A wiped server is
both an unsolved breach and an unprovable one.

---

## 1. What counts

A personal data breach is any unauthorised processing, accidental
disclosure, acquisition, sharing, use, alteration, destruction or loss of
access to personal data. It does not require an attacker, and it does not
require malice. All of these count:

- The `SUPABASE_SERVICE_ROLE_KEY` appearing anywhere public — a commit, a
  client bundle, a screenshot, a support thread. This key bypasses every RLS
  policy, so its exposure is a breach of the whole database, not a scare.
- An RLS policy change that lets one account read another's rows, whether or
  not anyone did.
- A clinician account used by someone it was not issued to.
- Avatar files readable by anyone with the URL. **Note: the `avatars` bucket
  is public by design today**, so anything in it is already world-readable
  by URL. That is worth revisiting independently of any incident.
- A laptop with a live `.env.local` lost or stolen.
- Sending one user's export to another user's address.

If you are debating whether something counts, it counts. Declare it, then
downgrade after review. The reverse never works.

---

## 2. First hour

**Do, in order:**

1. **Write down the clock.** When it started, when we noticed, how. A rough
   note now is worth more than a precise reconstruction next week.
2. **Tell Daksh.** By phone, not a group chat that can sit unread.

   Worth fixing before you need it: a single named contact is also a
   single point of failure. If Daksh is on a flight when this fires,
   there is no second name in this file to call. Add one.
3. **Preserve.** Screenshot, export logs, save the offending commit hash. Do
   not force-push, do not delete the branch, do not wipe the container.
4. **Contain, if containment is reversible.** Rotating a key is reversible.
   Deleting data is not.

**Do not:**

- Email users yet. A first message that turns out to be wrong cannot be
  withdrawn, and the Act asks for accuracy, not speed.
- Post publicly.
- Blame anyone. Nearly every breach of this shape is a process failure.

### Rotating the service role key

The highest-severity single action, and the one most likely to be needed:

1. Supabase dashboard → Settings → API → roll `service_role`.
2. Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel, and anywhere else it is set.
3. Redeploy.
4. Assume everything it could reach was reached. It can reach everything.

---

## 3. Deciding what was affected

Answer these four before drafting any notification. Guessing at this stage is
what produces a notification that has to be corrected later.

1. **Whose data?** Which accounts, how many. `audit_log` covers clinician
   access; a database-level breach will not appear there at all, which is
   itself worth remembering.
2. **What categories?** Email only is very different from lab values and
   conditions. Say which, precisely.
3. **How long was it open?**
4. **Is it closed now?** If not, that goes in the notification too.

---

## 4. Notifying

### Two regulators, not one

This is the part most breach plans get wrong. An Indian data breach can
trigger **two separate obligations with different deadlines, different
recipients and different content**. Satisfying one does not satisfy the
other.

| | CERT-In | Data Protection Board |
|---|---|---|
| Deadline | **6 hours** from detection | Initial: **without delay**. Detailed: **72 hours** |
| Basis | CERT-In Directions, 2022 (IT Act s.70B) | DPDP Rules, 2025 — Rule 7 |
| Trigger | Cyber security incident | Personal data breach |
| Penalty | IT Act | Up to ₹200 crore |

Six hours is among the shortest reporting windows in the world, and the
Directions are worded broadly enough that they are generally read as
applying to almost any body corporate operating in India — which includes
Poshan. **[TO CONFIRM with counsel: whether Poshan is in scope, and which
incident categories apply.]** Assume yes until told otherwise; the cost of
over-reporting is a form, and the cost of under-reporting is a penalty.

The practical consequence for whoever is holding this page at 2am: **the
six-hour clock is the one that will run out first.** Do not spend it
perfecting the Board report.

### The Board — what to send, and when

Rule 7 is a two-stage process:

1. **Without delay** — an initial intimation: the nature, extent, timing
   and location of the breach, and its likely impact. Short. Send it as
   soon as you can describe the shape of the thing, not once you fully
   understand it.
2. **Within 72 hours** of becoming aware — the detailed report: updated
   description, the circumstances that led to it, remedial and mitigation
   measures taken, and findings on who caused it.

The Board may grant longer than 72 hours, but only on a **reasoned written
request** — so if you are going to need it, ask before the deadline rather
than explaining afterwards.

Every breach is reportable regardless of severity. There is no materiality
threshold to hide behind, unlike GDPR's risk-based test.

**[TO CONFIRM: the Board's current filing channel — portal URL or email —
and the prescribed CERT-In incident form. Look both up now and paste them
here. Finding out where to file while the clock runs is the single most
avoidable delay in this document.]**

### The people affected

Email every affected Data Principal at the address on their account. Plainly,
in both English and Hindi, saying:

- What happened, in one sentence, without euphemism. Not "a security
  incident" — "someone outside Poshan was able to read X".
- Exactly which of their data was involved.
- When, and whether it is fixed.
- What they should do, if anything.
- Who to contact: the Grievance Officer, by name.

**Never**: "we take your privacy seriously", "out of an abundance of
caution", or any sentence whose purpose is to make us feel better. People
being told their health data leaked can tell the difference, and the tone
is what they will remember.

---

## 4b. A conflict to resolve before it matters

The CERT-In Directions also require **ICT system logs to be retained for
180 days** within Indian jurisdiction, and NTP-synchronised clocks so that
timestamps across systems agree.

Poshan's retention policy, in `retention_policy`, currently sets windows
shorter than that on two tables:

| Table | Window | Concern |
|---|---|---|
| `rate_limits` | 7 days | Abuse counters. Arguably a security log. |
| `webhook_events` | 90 days | Payment events. Arguably an audit trail. |

These were chosen against DPDP s.8(7) — erase once the purpose is served —
without CERT-In's retention floor in view. The two duties genuinely pull in
opposite directions: one says delete promptly, the other says keep for 180
days.

**[TO CONFIRM with counsel: whether either table counts as a "log" under
the Directions.]** If they do, lengthen the windows in `retention_policy`
rather than disabling retention — it is a data change, one row each, no
deploy.

Worth noting what is *not* in tension: `chat_messages` at 180 days is
already at the floor, and the health tables have no retention window at all
while an account lives. The conflict is narrow, and it is better to find it
here than in a regulator's question.

## 5. Afterwards

Within two weeks:

1. **Write it up.** What happened, why, what we changed. Blameless.
2. **Fix the class, not the instance.** If a key leaked, the question is not
   "why did that key leak" but "what stops the next one".
3. **Update this file** with what it did not anticipate.

---

## Related

- `public/ASSET-PROVENANCE.md` — image rights, a different kind of exposure
- `src/lib/dpdp.ts` — notice, purposes, and the age gate
- `supabase/migrations/20260920120000_add_dpdp_compliance.sql` — the consent
  ledger and erasure records this process would need to produce as evidence
