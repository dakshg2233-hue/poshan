import type { Metadata } from "next";
import { TodayHome } from "@/components/poshan/today-home";
import { DashboardNavbar } from "@/components/poshan/dashboard-navbar";

export const metadata: Metadata = {
  title: "Today, Poshan",
  description: "What to eat next, and what's changed.",
  robots: { index: false, follow: false },
};

/* The manifest's start_url still points at /dashboard, which remains the
   full surface. This is the focused one — the screen a phone should open
   to once it has proved itself against the dashboard in real use. */
export default function TodayPage() {
  return (
    <>
      <DashboardNavbar />
      <main className="w-[min(560px,100%-2rem)] mx-auto py-6">
        <TodayHome />
      </main>
    </>
  );
}
