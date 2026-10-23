import { NextResponse, type NextRequest } from "next/server";
import { REFERRAL_COOKIE } from "@/lib/auth";

/** Invite links drop a referral cookie and send the visitor to sign up. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const url = req.nextUrl.clone();
  url.pathname = "/signup";
  url.search = "";
  url.searchParams.set("ref", code.toUpperCase().slice(0, 16));
  const res = NextResponse.redirect(url);
  res.cookies.set(REFERRAL_COOKIE, code.toUpperCase().slice(0, 16), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
