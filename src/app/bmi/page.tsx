import type { Metadata } from "next";
import { BmiTool } from "@/components/poshan/bmi-tool";

/* The one signed-out page in this batch that SHOULD be indexed — the whole
   point of giving the calculator its own URL is that it can be found and
   linked. Everything else added here sits over personal health data and is
   noindex. */
export const metadata: Metadata = {
  title: "BMI calculator on Indian cutoffs — Poshan",
  description:
    "Your BMI read against Asian-Indian thresholds, where overweight begins at 23 rather than 25. Free, no sign-up.",
  alternates: { canonical: "/bmi" },
  openGraph: {
    title: "Your BMI, on Indian cutoffs",
    description:
      "Most apps measure you against a European body. For Asian-Indian bodies, overweight starts at 23, not 25.",
    type: "website",
  },
};

export default function BmiPage() {
  return (
    <main className="w-[min(620px,100%-2rem)] mx-auto py-10 md:py-16">
      <BmiTool />
    </main>
  );
}
