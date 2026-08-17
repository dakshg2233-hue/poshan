import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Sign in — Poshan",
  description: "Sign in with a one-time code to save your plate, conditions and biomarkers across devices.",
  robots: { index: false, follow: true },
};
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
