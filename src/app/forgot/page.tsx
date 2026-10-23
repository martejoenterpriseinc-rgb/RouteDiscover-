import type { Metadata } from "next";
import { ForgotForm } from "@/components/ResetForms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPage() {
  return <ForgotForm />;
}
