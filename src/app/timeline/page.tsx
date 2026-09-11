import type { Metadata } from "next";
import { HealthTimeline } from "@/components/poshan/health-timeline";
import { DashboardNavbar } from "@/components/poshan/dashboard-navbar";

export const metadata: Metadata = {
  title: "Your health timeline, Poshan",
  description: "Every lab result, plan and reading Poshan holds for you, in one place.",
  /* Signed-in surface over personal health data: never indexed, same as
     the dashboard. */
  robots: { index: false, follow: false },
};

export default function TimelinePage() {
  return (
    <>
      <DashboardNavbar />
      <main className="w-[min(760px,100%-2.5rem)] mx-auto py-8 md:py-12">
        <HealthTimeline />
      </main>
    </>
  );
}
