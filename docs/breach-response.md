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
and Gaurav immediately, write down the time, change nothing yet.**

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
2. **Tell Daksh and Gaurav.** Both. Not a group chat that either might
   mute — phone.
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

### The Board

Report to the Data Protection Board of India. Do this even where the risk
looks low — the duty to report is not conditioned on our own assessment of
severity the way GDPR's is.

**[TO CONFIRM: the Board's current reporting channel and the exact deadline
under the DPDP Rules as commenced. Check before an incident, not during one.
Nothing in this file should be relied on for the deadline.]**

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
