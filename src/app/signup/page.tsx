import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/app");
  return <AuthForm mode="signup" />;
}
