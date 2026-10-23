import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { getLiveSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Privacy Policy" };

export default async function PrivacyPage() {
  const s = await getLiveSettings();
  return <LegalPage text={s.legal.privacyMarkdown} updatedAt={s.legal.updatedAt} />;
}
