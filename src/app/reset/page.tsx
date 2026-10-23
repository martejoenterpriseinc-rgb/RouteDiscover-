import type { Metadata } from "next";
import { ResetForm } from "@/components/ResetForms";

export const metadata: Metadata = { title: "New password" };

export default function ResetPage() {
  return <ResetForm />;
}
