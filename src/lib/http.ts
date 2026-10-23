import { NextResponse } from "next/server";
import { AuthError } from "./auth";

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handle(err: unknown) {
  if (err instanceof AuthError) return fail(err.message, err.status);
  console.error(err);
  return fail("Something went wrong.", 500);
}

export async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    const j = (await req.json()) as unknown;
    return j && typeof j === "object" ? (j as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
