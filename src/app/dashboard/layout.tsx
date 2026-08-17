import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Your dashboard — Poshan",
  description: "Your saved plate, tracked biomarkers and progress.",
  robots: { index: false, follow: false },
};
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
