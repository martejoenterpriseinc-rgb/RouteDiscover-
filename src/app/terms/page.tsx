import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { getLiveSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Terms of Service" };

export default async function TermsPage() {
  const s = await getLiveSettings();
  return <LegalPage text={s.legal.termsMarkdown} updatedAt={s.legal.updatedAt} />;
}
