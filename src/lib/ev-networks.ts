/**
 * EV charging networks, connector types, speed tiers and price parsing.
 * Pure helpers shared by the Open Charge Map / OSM providers, the API and the UI.
 */

export type ConnectorType = "nacs" | "ccs" | "chademo" | "j1772" | "type2" | "other";

export type SpeedTier = "level1" | "level2" | "fast" | "ultra";

export type ChargerPricing = {
  /** Explicitly free. */
  free: boolean;
  perKwh?: number;
  perMinute?: number;
  perHour?: number;
  sessionFee?: number;
  idleFeePerMinute?: number;
  parkingFee?: number;
  /** Membership / app / sign-up needed, as stated by the source. */
  membership?: boolean;
  /** The source's own wording, shown when nothing structured could be read. */
  raw?: string;
};

export type Network = { id: string; label: string; short?: string; color: string; match: RegExp };

/** Every network we know how to recognise. Order matters: more specific patterns first. */
export const NETWORKS: Network[] = [
  { id: "tesla", label: "Tesla Supercharger", short: "Tesla", color: "#e82127", match: /tesla|supercharger/i },
  { id: "electrify_america", label: "Electrify America", short: "EA", color: "#00a19c", match: /electrify\s*america|\bEA\b/i },
  { id: "electrify_canada", label: "Electrify Canada", color: "#00a19c", match: /electrify\s*canada/i },
  { id: "evgo", label: "EVgo", color: "#2cb34a", match: /\bevgo\b/i },
  { id: "chargepoint", label: "ChargePoint", color: "#f47920", match: /charge\s*point/i },
  { id: "blink", label: "Blink", color: "#3bb3ec", match: /\bblink\b/i },
  { id: "rivian", label: "Rivian Adventure Network", short: "Rivian", color: "#1a2b3c", match: /rivian/i },
  { id: "ionna", label: "IONNA", color: "#6c3df4", match: /\bionna\b/i },
  { id: "mercedes", label: "Mercedes-Benz HPC", short: "Mercedes", color: "#0a0a0a", match: /mercedes/i },
  { id: "shell_recharge", label: "Shell Recharge", short: "Shell", color: "#fbce07", match: /shell|greenlots/i },
  { id: "bp_pulse", label: "bp pulse", color: "#009900", match: /bp\s*pulse|\bbp\b|amply/i },
  { id: "francis", label: "Francis Energy", short: "Francis", color: "#c8102e", match: /francis/i },
  { id: "flo", label: "FLO", color: "#00a3e0", match: /\bflo\b/i },
  { id: "volta", label: "Volta", color: "#2b2b2b", match: /\bvolta\b/i },
  { id: "semaconnect", label: "SemaConnect", color: "#0b6aa2", match: /sema\s*connect/i },
  { id: "evconnect", label: "EV Connect", color: "#1b75bb", match: /ev\s*connect/i },
  { id: "enel_x", label: "Enel X Way", short: "Enel X", color: "#1a5ba6", match: /enel|juice\s*box/i },
  { id: "circle_k", label: "Circle K Charge", short: "Circle K", color: "#e3001b", match: /circle\s*k/i },
  { id: "pilot_flyingj", label: "Pilot / Flying J (GM Energy)", short: "Pilot/FJ", color: "#cc0000", match: /pilot|flying\s*j|gm\s*energy/i },
  { id: "walmart", label: "Walmart", color: "#0071ce", match: /walmart|sam.?s club/i },
  { id: "seven_charge", label: "7Charge (7-Eleven)", short: "7Charge", color: "#f58220", match: /7\s*-?\s*eleven|7charge/i },
  { id: "wawa", label: "Wawa", color: "#b31b1b", match: /\bwawa\b/i },
  { id: "sheetz", label: "Sheetz", color: "#d7282f", match: /sheetz/i },
  { id: "buc_ees", label: "Buc-ee's", color: "#e4002b", match: /buc-?ee/i },
  { id: "red_e", label: "Red E", color: "#d62828", match: /\bred\s*e\b/i },
  { id: "evolve_ny", label: "EVolve NY", color: "#0f4c81", match: /evolve/i },
  { id: "petro_canada", label: "Petro-Canada", color: "#c8102e", match: /petro-?\s*canada/i },
  { id: "ivy", label: "Ivy Charging Network", short: "Ivy", color: "#2d6a4f", match: /\bivy\b/i },
  { id: "sun_country", label: "Sun Country Highway", short: "Sun Country", color: "#f4a300", match: /sun\s*country/i },
  { id: "powerflex", label: "PowerFlex", color: "#1c1c1c", match: /power\s*flex/i },
  { id: "ampup", label: "AmpUp", color: "#5a2d82", match: /amp\s*up/i },
  { id: "noodoe", label: "Noodoe", color: "#00b2a9", match: /noodoe/i },
  { id: "loop", label: "Loop", color: "#ff5a1f", match: /\bloop\b/i },
  { id: "chargelab", label: "ChargeLab", color: "#6b4eff", match: /charge\s*lab/i },
  { id: "opconnect", label: "OpConnect", color: "#0073b1", match: /op\s*connect/i },
  { id: "livingston", label: "Livingston Energy", short: "Livingston", color: "#1f6f8b", match: /livingston/i },
  { id: "greenspot", label: "Greenspot", color: "#3a7d44", match: /greenspot/i },
  { id: "zef", label: "ZEF Energy", short: "ZEF", color: "#2a9d8f", match: /\bzef\b/i },
  { id: "ford", label: "Ford (BlueOval)", short: "Ford", color: "#003478", match: /ford|blue\s*oval/i },
  { id: "hyundai", label: "Hyundai / Kia", short: "Hyundai", color: "#002c5f", match: /hyundai|\bkia\b/i },
  { id: "nissan", label: "Nissan", color: "#c3002f", match: /nissan/i },
  { id: "volkswagen", label: "Volkswagen", short: "VW", color: "#001e50", match: /volkswagen|\bvw\b/i },
  { id: "bmw", label: "BMW", color: "#1c69d4", match: /\bbmw\b/i },
  { id: "state_park", label: "Park / municipal", short: "Municipal", color: "#4b6043", match: /state park|county|city of|municipal|department of/i },
  { id: "utility", label: "Utility-run", short: "Utility", color: "#6c757d", match: /electric\s*(co-?op|cooperative|company)|\butility\b|power company|energy$/i },
];

export const OTHER_NETWORK: Network = { id: "other", label: "Other network", short: "Other", color: "#5b6478", match: /./ };
export const UNKNOWN_NETWORK: Network = { id: "unknown", label: "Network not listed", short: "Unknown", color: "#9aa3b5", match: /./ };

export function detectNetwork(operator: string | null | undefined, name?: string | null): Network {
  const haystacks = [operator ?? "", name ?? ""].filter(Boolean);
  if (haystacks.length === 0) return UNKNOWN_NETWORK;
  for (const h of haystacks) {
    for (const n of NETWORKS) if (n.match.test(h)) return n;
  }
  if (operator && !/unknown|private|other|\(none\)/i.test(operator)) return { ...OTHER_NETWORK, label: operator.trim(), short: operator.trim().slice(0, 18) };
  return UNKNOWN_NETWORK;
}

export function networkById(id: string): Network {
  return NETWORKS.find((n) => n.id === id) ?? (id === "other" ? OTHER_NETWORK : UNKNOWN_NETWORK);
}

/* ---------------- connectors ---------------- */

export const CONNECTOR_LABEL: Record<ConnectorType, string> = {
  nacs: "NACS / Tesla",
  ccs: "CCS",
  chademo: "CHAdeMO",
  j1772: "J1772",
  type2: "Type 2",
  other: "Other",
};

/** Map a source's connector title (OCM / OSM) onto our small set. */
export function normalizeConnector(title: string): ConnectorType {
  const t = title.toLowerCase();
  if (/nacs|tesla|supercharger|destination/.test(t)) return "nacs";
  if (/ccs|combo|sae j1772 combo|type 1 combo|type 2 combo|type1_combo|type2_combo/.test(t)) return "ccs";
  if (/chademo/.test(t)) return "chademo";
  if (/j1772|type 1\b|type1\b|sae j-?1772/.test(t)) return "j1772";
  if (/type 2|type2|mennekes|iec 62196/.test(t)) return "type2";
  return "other";
}

export function connectorTypes(titles: string[]): ConnectorType[] {
  return Array.from(new Set(titles.map(normalizeConnector)));
}

/* ---------------- speed ---------------- */

export const SPEED_TIERS: Array<{ id: SpeedTier; label: string; minKw: number }> = [
  { id: "level1", label: "Level 1", minKw: 0 },
  { id: "level2", label: "Level 2", minKw: 3 },
  { id: "fast", label: "DC fast", minKw: 50 },
  { id: "ultra", label: "Ultra-fast", minKw: 150 },
];

export function speedTier(maxKw: number | undefined, levelHint?: number): SpeedTier {
  if (maxKw != null && maxKw > 0) {
    if (maxKw >= 150) return "ultra";
    if (maxKw >= 50) return "fast";
    if (maxKw >= 3) return "level2";
    return "level1";
  }
  if (levelHint === 3) return "fast";
  if (levelHint === 2) return "level2";
  if (levelHint === 1) return "level1";
  return "level2";
}

export function speedLabel(tier: SpeedTier, maxKw?: number): string {
  const base = SPEED_TIERS.find((t) => t.id === tier)?.label ?? "";
  return maxKw ? `${base} · up to ${Math.round(maxKw)} kW` : base;
}

/* ---------------- pricing ---------------- */

const num = (s: string) => Number(s.replace(/,/g, ""));
/** "$0.48", "48¢", "48 cents" → dollars */
function money(m: RegExpMatchArray | null, dollarsIdx = 1, centsIdx?: number): number | undefined {
  if (!m) return undefined;
  if (centsIdx != null && m[centsIdx]) return num(m[centsIdx]) / 100;
  if (m[dollarsIdx]) return num(m[dollarsIdx]);
  return undefined;
}

const FREE_RE = /(\bfree\b|\bno charge\b|\bcomplimentary\b|\bno cost\b|\$0(?:\.00)?(?!\d))/i;
const PAID_HINT = /(\$\s?\d|\d\s?(?:¢|cents)|per\s?(?:kwh|hour|min)|\/\s?(?:kwh|hr|hour|min)|fee|paid|pay)/i;

/** Pull structured numbers out of free-text pricing such as "$0.48/kWh, $1 session, idle $0.40/min after 10 min". */
export function parsePricing(text: string | null | undefined, payAtLocation?: boolean | null): ChargerPricing | undefined {
  const raw = (text ?? "").replace(/\s+/g, " ").trim();
  if (!raw && !payAtLocation) return undefined;
  const p: ChargerPricing = { free: false, raw: raw || undefined };
  if (raw) {
    const withoutParking = raw.replace(/free parking/gi, "");
    p.free = FREE_RE.test(withoutParking) && !PAID_HINT.test(withoutParking.replace(FREE_RE, ""));
    const kwh = raw.match(/(?:\$\s?(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s?(?:¢|cents?))\s?(?:\/|per)\s?kwh/i);
    p.perKwh = money(kwh, 1, 2);
    // Per-minute figures: an "idle" within a short window before or after means an idle fee, not the charging rate.
    const minRe = /(?:\$\s?(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s?(?:¢|cents?))\s?(?:\/|per)\s?min(?:ute)?/gi;
    for (const m of raw.matchAll(minRe)) {
      const at = m.index ?? 0;
      const before = raw.slice(Math.max(0, at - 30), at);
      const after = raw.slice(at + m[0].length, at + m[0].length + 20);
      const v = money(m, 1, 2);
      if (/idle/i.test(before) || /^[^.;,]{0,12}idle/i.test(after)) {
        if (p.idleFeePerMinute == null) p.idleFeePerMinute = v;
      } else if (p.perMinute == null) p.perMinute = v;
    }
    if (p.idleFeePerMinute == null) {
      const idle = raw.match(/idle[^$\d]{0,40}(?:\$\s?(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s?(?:¢|cents?))/i);
      p.idleFeePerMinute = money(idle, 1, 2);
    }
    const hour = raw.match(/\$\s?(\d+(?:\.\d+)?)\s?(?:\/|per)\s?(?:hr|hour)/i);
    p.perHour = money(hour);
    const session = raw.match(/\$\s?(\d+(?:\.\d+)?)\s?(?:(?:\/|per)\s?)?(?:session|connection|start|flat|activation)/i) ?? raw.match(/(?:session|connection|start|activation)\s?fee[^$\d]{0,10}\$\s?(\d+(?:\.\d+)?)/i);
    p.sessionFee = money(session);
    const parking = raw.match(/parking[^$\d]{0,30}\$\s?(\d+(?:\.\d+)?)/i);
    p.parkingFee = money(parking);
    if (/member|subscription|app required|account required|rfid|sign[- ]?up/i.test(raw)) p.membership = true;
  }
  if (payAtLocation && !p.free && p.perKwh == null && p.perMinute == null && p.perHour == null) p.raw = p.raw || "Pay at location";
  return p;
}

export function pricingSummary(p: ChargerPricing | undefined, tier: "free" | "paid" | "unknown"): string {
  if (!p && tier === "free") return "Free";
  if (!p) return "Rate not published";
  if (p.free) return "Free";
  const parts: string[] = [];
  if (p.perKwh != null) parts.push(`$${p.perKwh.toFixed(2)}/kWh`);
  if (p.perMinute != null) parts.push(`$${p.perMinute.toFixed(2)}/min`);
  if (p.perHour != null) parts.push(`$${p.perHour.toFixed(2)}/hr`);
  if (parts.length === 0) return p.raw ? p.raw.slice(0, 80) : tier === "paid" ? "Paid, rate not published" : "Rate not published";
  return parts.join(" · ");
}

export function extraFees(p: ChargerPricing | undefined): string[] {
  if (!p) return [];
  const out: string[] = [];
  if (p.sessionFee != null) out.push(`$${p.sessionFee.toFixed(2)} session fee`);
  if (p.idleFeePerMinute != null) out.push(`Idle fee $${p.idleFeePerMinute.toFixed(2)}/min`);
  if (p.parkingFee != null) out.push(`Parking $${p.parkingFee.toFixed(2)}`);
  if (p.membership) out.push("Membership or app needed");
  return out;
}
