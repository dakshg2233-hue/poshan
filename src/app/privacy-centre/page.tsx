import type { Metadata } from "next";
import { PrivacyCenter } from "@/components/poshan/privacy-center";
import { YourData } from "@/components/poshan/your-data";
import { DashboardNavbar } from "@/components/poshan/dashboard-navbar";

export const metadata: Metadata = {
  title: "Privacy centre, Poshan",
  description: "See who can access your health data, and take it back at any time.",
  robots: { index: false, follow: false },
};

/* Deliberately a separate route from /privacy, which is the public privacy
   policy. The policy says what Poshan does; this shows what has actually
   happened to this person's data. They serve different questions and
   collapsing them would bury the one people actually want answered. */
export default function PrivacyCentrePage() {
  return (
    <>
      <DashboardNavbar />
      <main className="w-[min(760px,100%-2.5rem)] mx-auto py-8 md:py-12">
        <PrivacyCenter />
        {/* The rights against Poshan itself, below the record of who else
            has looked. Same page on purpose: someone who came to check on
            their data should not have to discover that erasing it lives
            somewhere different. */}
        <div className="mt-14 border-t pt-10" style={{ borderColor: "var(--line)" }}>
          <YourData />
        </div>
      </main>
    </>
  );
}
