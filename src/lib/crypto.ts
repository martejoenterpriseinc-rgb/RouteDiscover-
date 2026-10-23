import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Secrets the owner enters in the console (Stripe keys, API keys) are encrypted
 * at rest with APP_SECRET. In development, a key is generated once and kept in
 * ./data/app-secret so restarts can still read what was saved.
 */
function appSecret(): Buffer {
  const env = process.env.APP_SECRET;
  if (env && env.length >= 16) return crypto.createHash("sha256").update(env).digest();
  const file = path.join(process.cwd(), "data", "app-secret");
  try {
    return crypto.createHash("sha256").update(fs.readFileSync(file, "utf8").trim()).digest();
  } catch {
    const generated = crypto.randomBytes(32).toString("hex");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, generated, { mode: 0o600 });
    return crypto.createHash("sha256").update(generated).digest();
  }
}

export const ENC_PREFIX = "enc:v1:";

export function encrypt(plain: string): string {
  if (!plain) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", appSecret(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ENC_PREFIX + Buffer.concat([iv, tag, data]).toString("base64url");
}

export function decrypt(value: string): string {
  if (!value) return "";
  if (!value.startsWith(ENC_PREFIX)) return value;
  const buf = Buffer.from(value.slice(ENC_PREFIX.length), "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", appSecret(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function isEncrypted(value: string | undefined): boolean {
  return !!value && value.startsWith(ENC_PREFIX);
}

/** "sk_live_••••1234" style hint for the console. */
export function maskSecret(plain: string): string {
  if (!plain) return "";
  if (plain.length <= 8) return "••••";
  return `${plain.slice(0, 4)}••••${plain.slice(-4)}`;
}

export const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");
export const shortCode = (len = 8) =>
  crypto
    .randomBytes(len)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, len)
    .toUpperCase();
