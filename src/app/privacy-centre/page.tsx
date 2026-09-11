import type { Metadata } from "next";
import { PrivacyCenter } from "@/components/poshan/privacy-center";
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
      </main>
    </>
  );
}
