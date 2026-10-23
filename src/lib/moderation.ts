/**
 * Risk scoring for community submissions. Pure and unit-tested; the API
 * feeds it the submission plus facts about the submitter's recent behaviour.
 */
import type { SubmissionPayload, SubmissionType } from "@/db/schema";

export type SubmitterContext = {
  accountAgeHours: number;
  submissionsLast24h: number;
  submissionsOnThisBusinessLast24h: number;
  rejectedLast30d: number;
  banned: boolean;
};

export type RiskResult = { score: number; flags: string[] };

const URL_RE = /(https?:\/\/|www\.)\S+/i;
const PROFANITY = ["fuck", "shit", "bitch", "asshole", "bastard", "cunt", "dick", "scam", "fraud"];
const SHOUT_RE = /[A-Z]{12,}/;
const CLOSED_HOURS_RE = /\b(closed|permanently closed|out of business|shut down)\b/i;
const CONTACT_FIELDS = new Set(["phone", "website", "address"]);

export function scoreSubmission(type: SubmissionType, payload: SubmissionPayload, ctx: SubmitterContext): RiskResult {
  const flags: string[] = [];
  let score = 0;
  const text = `${payload.text ?? ""} ${payload.caption ?? ""} ${payload.value ?? ""}`.trim();
  const lower = text.toLowerCase();

  if (ctx.banned) {
    flags.push("submitter is banned");
    score += 10;
  }
  if (ctx.accountAgeHours < 24) {
    flags.push("account younger than 24h");
    score += 2;
  }
  if (ctx.submissionsLast24h >= 10) {
    flags.push(`${ctx.submissionsLast24h} submissions in 24h`);
    score += 3;
  } else if (ctx.submissionsLast24h >= 5) {
    flags.push(`${ctx.submissionsLast24h} submissions in 24h`);
    score += 1;
  }
  if (ctx.submissionsOnThisBusinessLast24h >= 3) {
    flags.push("repeated submissions on this business");
    score += 2;
  }
  if (ctx.rejectedLast30d >= 3) {
    flags.push(`${ctx.rejectedLast30d} rejected in 30d`);
    score += 2;
  }
  if (URL_RE.test(text) && !(type === "info" && payload.field === "website")) {
    flags.push("contains a link");
    score += 2;
  }
  if (PROFANITY.some((w) => lower.includes(w))) {
    flags.push("abusive or accusatory language");
    score += 3;
  }
  if (SHOUT_RE.test(text)) {
    flags.push("shouting");
    score += 1;
  }
  if (text.length > 2000) {
    flags.push("very long text");
    score += 1;
  }
  if (type === "review") {
    const r = payload.rating ?? 0;
    if (r < 1 || r > 5) {
      flags.push("rating out of range");
      score += 5;
    }
    if (r <= 1 && (payload.text ?? "").trim().length < 20) {
      flags.push("1-star review with no explanation");
      score += 2;
    }
  }
  if (type === "hours" || (type === "info" && payload.field === "hours")) {
    if (CLOSED_HOURS_RE.test(text)) {
      flags.push("marks the business closed");
      score += 3;
    }
  }
  if (type === "info" && payload.field && CONTACT_FIELDS.has(payload.field)) {
    flags.push(`changes ${payload.field}`);
    score += 2;
  }
  if (type === "info" && payload.field === "name") {
    flags.push("renames the business");
    score += 3;
  }
  return { score, flags };
}

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
