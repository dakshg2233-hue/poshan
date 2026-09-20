import type { Metadata } from "next";
import { GuardianConsent } from "@/components/poshan/guardian-consent";

export const metadata: Metadata = {
  title: "Permission for a child's profile, Poshan",
  description: "Confirm or refuse permission for a child's nutrition profile on Poshan.",
  /* A consent link should not be indexed, followed, or previewed anywhere.
     It carries a single-use token in the path. */
  robots: { index: false, follow: false },
};

export default async function GuardianConsentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="mx-auto w-[min(60ch,100%-2.5rem)] py-16" style={{ color: "var(--ink)" }}>
      <GuardianConsent token={token} />
    </main>
  );
}
