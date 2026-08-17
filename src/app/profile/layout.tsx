import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Your profile — Poshan",
  description: "Height, weight, goal, diet and region — saved to your account.",
  robots: { index: false, follow: false },
};
export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
