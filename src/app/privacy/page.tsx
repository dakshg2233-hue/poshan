import type { Metadata } from "next";
import Link from "next/link";
import { NOTICE_VERSION, PROCESSORS, FIDUCIARY } from "@/lib/dpdp";

export const metadata: Metadata = {
  title: "Privacy, Poshan",
  description:
    "What Poshan stores, why, how long, who else sees it, and how to get it back or have it deleted. Written against India's DPDP Act, 2023.",
};

/**
 * Privacy policy.
 *
 * Written from what this codebase ACTUALLY does — the tables in
 * supabase/schema.sql and the migrations, Supabase email-OTP auth, the
 * Anthropic and OpenAI calls in /api/chat and /api/scan, and Razorpay
 * checkout — rather than from a template. Nothing here is invented,
 * because a privacy policy that states false facts about a health product
 * is worse than an incomplete one.
 *
 * The Data Fiduciary is Poshan Nutrition Pvt Ltd, Delhi, supplied by Daksh
 * on 20 September 2026. What remains marked [TO CONFIRM] is narrower than
 * it was: the registered office's street address and the CIN. A city is
 * not an address for service, so a Data Principal wanting to send a formal
 * notice still cannot.
 *
 * The processor list is rendered from lib/dpdp.ts rather than typed out
 * again here. It is the same list the sign-up notice shows, and two
 * hand-maintained copies of "who receives your health data" is precisely
 * the pair that drifts — the policy is usually the one that goes stale,
 * because nothing breaks when it does.
 */
export default function Privacy() {
  return (
    <main className="mx-auto w-[min(72ch,100%-2.5rem)] py-16" style={{ color: "var(--ink)" }}>
      <Link href="/" className="text-[0.85rem] no-underline" style={{ color: "var(--kesar)" }}>
        ← Poshan
      </Link>
      <h1 className="mt-6 text-[2.4rem]" style={{ fontFamily: "var(--font-display)" }}>
        Privacy
      </h1>
      <p className="mt-2 text-[0.85rem]" style={{ color: "var(--ink-soft)" }}>
        Last updated: 26 September 2026 · Notice version {NOTICE_VERSION}
      </p>

      <section className="mt-10 grid gap-4 text-[0.95rem] leading-relaxed">
        <p>
          This is written to meet India&apos;s Digital Personal Data Protection Act,
          2023. In its language, you are the <em>Data Principal</em> and{" "}
          {FIDUCIARY.legalName} is the <em>Data Fiduciary</em>: the rights below
          are yours, and the duties are ours.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>What we store</h2>
        <p>
          If you use Poshan without an account, your height, weight, goal, diet and
          region stay in your own browser&apos;s local storage. They are never sent to us.
        </p>
        <p>If you create an account, we store against your user id:</p>
        <ul className="ml-5 list-disc grid gap-1">
          <li>Your email address, for signing in.</li>
          <li>Height, weight, date of birth or age, sex, activity level, goal, diet, region and preferred language.</li>
          <li>Any health conditions you select.</li>
          <li>Any biomarker and lab values you enter.</li>
          <li>Meals you log, plates you scan, weights, symptoms and pantry items.</li>
          <li>Your messages to Ask Poshan and Health Companion.</li>
          <li>Payment records, if you subscribe.</li>
          <li>Profiles you create for family members — see below, because those are somebody else&apos;s data.</li>
        </ul>
        <p>
          A note on wording: this policy used to call health data{" "}
          <em>sensitive personal data</em>. That phrase comes from the older SPDI
          Rules and from GDPR. The DPDP Act deliberately has no separate tier for
          sensitive data — it applies the same standard to all personal data — so
          we have stopped implying a distinction the statute does not make. The
          practical effect is that health data gets the same protection as
          everything else here, which is to say: the strongest we have.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>How long we keep it</h2>
        <p>
          Your profile and health records are kept while your account exists, and
          erased when you delete it. Some things expire sooner on their own:
        </p>
        <ul className="ml-5 list-disc grid gap-1">
          <li><strong>Chat messages</strong> — 180 days. They exist to give the assistant context within a course of questions, not to build a permanent health record.</li>
          <li><strong>Scan corrections</strong> — 365 days.</li>
          <li><strong>Payment webhook records</strong> — 180 days, the minimum CERT-In requires for system logs. They hold no personal data.</li>
          <li><strong>Abuse counters</strong> — 7 days.</li>
          <li><strong>Clinician access grants</strong> — whatever expiry you set when granting.</li>
        </ul>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Who can see it</h2>
        <p>
          Every table uses row-level security, so a query can only return rows
          belonging to the signed-in account. We do not sell your data, and we do
          not share it with advertisers. A clinician sees your data only if you
          grant them access, only the categories you pick, and only until the
          expiry you set — and every time one opens anything, it is recorded in
          your <Link href="/privacy-centre" style={{ color: "var(--kesar)" }}>Privacy centre</Link>.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>
          Processors, and where they are
        </h2>
        <p>
          The DPDP Act permits personal data to be processed outside India except
          in countries the Central Government restricts by notification. Several of
          ours are outside India, so here is the list with locations rather than a
          line about &ldquo;global vendors&rdquo;:
        </p>
        <ul className="ml-5 list-disc grid gap-1">
          {PROCESSORS.map((p) => (
            <li key={p.name}>
              <strong>{p.name}</strong> — {p.does.en}. <em>{p.where.en}.</em>
            </li>
          ))}
        </ul>
        <p>
          Card details go to Razorpay directly; we never see or store them. When
          you ask Ask Poshan or Health Companion something that needs current
          information, your question may also be sent to a web search tool to
          answer it.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Meal photos</h2>
        <p>
          Photographs you scan are sent to our vision model to identify what is
          on the plate, then discarded — we do not save the photo itself
          anywhere. Only the dishes it recognised are stored against your
          account, the same as if you had picked them from the list by hand.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>
          Children under 18
        </h2>
        <p>
          The Act requires a parent or guardian&apos;s verifiable consent before a
          child&apos;s data may be processed, and separately forbids tracking,
          behavioural monitoring and targeted advertising directed at children.
        </p>
        <p>
          If you are under 18, or you add a family member who is, we ask for a
          guardian&apos;s email and send them a request. Until they confirm, we
          do not build a plan from that child&apos;s details — the profile stays
          visible to whoever entered it, marked as awaiting permission, but it
          is not used. Streaks, badges and
          leaderboards stay switched off for anyone under 18 regardless of what
          the guardian answers — that is not a setting either of you can change,
          because it is not ours to offer.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>
          Family profiles
        </h2>
        <p>
          Poshan Home lets you add up to five family members. Their name, age,
          height, weight and dietary details are <em>their</em> personal data, not
          yours, and under the Act each of them is a Data Principal with the same
          rights you have. We cannot send them a notice — they have no account —
          so when you add someone you confirm that you are either their guardian
          or that you have told them. If a family member asks us to remove their
          data, we will, and we will tell you that we have.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Your rights</h2>
        <p>
          All of these are in the{" "}
          <Link href="/privacy-centre" style={{ color: "var(--kesar)" }}>Privacy centre</Link>,
          and each is one click. The Act requires that withdrawing consent be as
          easy as giving it, so none of them is an email to us:
        </p>
        <ul className="ml-5 list-disc grid gap-1">
          <li><strong>See and download everything</strong> we hold about you, with the list of who it has been shared with.</li>
          <li><strong>Correct anything wrong</strong> — your profile is editable, and we will fix anything you cannot reach yourself.</li>
          <li><strong>Withdraw consent</strong> for usage measurement, or for any clinician&apos;s access.</li>
          <li><strong>Delete your account</strong> and everything attached to it.</li>
          <li><strong>Nominate someone</strong> to exercise these rights if you die or become unable to act for yourself.</li>
          <li><strong>Complain</strong> — to our Grievance Officer first, and to the Data Protection Board of India if we do not resolve it.</li>
        </ul>
        <p>
          One thing deletion does not remove: the record of which clinicians opened
          your data. Those entries stay, stripped of anything identifying you, so
          that past access to a patient&apos;s records remains auditable. That is a
          deliberate choice and we would rather say so than quietly do it.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>If there is a data breach</h2>
        <p>
          If we become aware that your personal data has been accessed, disclosed or
          lost without authorisation, we will notify you at the email address on your
          account without undue delay once the breach is confirmed, describing what
          happened, what was affected, and what we are doing about it. We will also
          notify the Data Protection Board of India as the Act requires.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Grievance Officer</h2>
        <p>
          As required under India&apos;s Digital Personal Data Protection Act, 2023,
          complaints or grievances about how your data is handled can be raised with:
        </p>
        <p>
          <strong>{FIDUCIARY.grievanceOfficer.name}</strong>, Grievance Officer
          <br />
          Email: <a href={`mailto:${FIDUCIARY.grievanceOfficer.email}`} style={{ color: "var(--kesar)" }}>{FIDUCIARY.grievanceOfficer.email}</a>
          <br />
          Phone: <a href={`tel:${FIDUCIARY.grievanceOfficer.phone}`} style={{ color: "var(--kesar)" }}>{FIDUCIARY.grievanceOfficer.phoneDisplay}</a>
        </p>
        <p className="text-[0.85rem]" style={{ color: "var(--ink-soft)" }}>
          If we do not resolve your complaint, you may take it to the Data
          Protection Board of India.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Contact</h2>
        <p>
          <strong>{FIDUCIARY.legalName}</strong>, {FIDUCIARY.city},{" "}
          {FIDUCIARY.country} — the Data Fiduciary responsible for the data
          described above.
          <br />
          {/* [TO CONFIRM: the registered office's street address and the CIN.
              The entity name is confirmed and stated; "Delhi" is a city, not
              an address for service, and a Data Principal who wants to send
              a formal notice cannot do it with this alone. Narrower than the
              gap it replaces, but still a gap. */}
          Email: <a href={`mailto:${FIDUCIARY.grievanceOfficer.email}`} style={{ color: "var(--kesar)" }}>{FIDUCIARY.grievanceOfficer.email}</a>
          <br />
          Phone: <a href={`tel:${FIDUCIARY.grievanceOfficer.phone}`} style={{ color: "var(--kesar)" }}>{FIDUCIARY.grievanceOfficer.phoneDisplay}</a>
        </p>
        <p className="text-[0.8rem]" style={{ color: "var(--ink-soft)" }}>
          Data protection queries go to the same address. Full contact details: <Link href="/contact" style={{ color: "var(--kesar)" }}>/contact</Link>.
        </p>

        <h2 className="mt-6 text-[1.3rem]" style={{ fontFamily: "var(--font-display)" }}>Not medical advice</h2>
        <p>
          Poshan gives general nutrition information based on published
          Asian-Indian BMI cutoffs. It does not diagnose, treat or replace advice
          from a doctor or registered dietitian.
        </p>
      </section>
    </main>
  );
}
