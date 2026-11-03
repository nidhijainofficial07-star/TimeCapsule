import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const nowISO = () => new Date().toISOString();
export const todayDate = () => new Date().toISOString().slice(0, 10);

function parse(d?: string | null) {
  if (!d) return null;
  const v = parseISO(d);
  return isValid(v) ? v : null;
}

export function fmtDate(d?: string | null, fallback = "Not recorded") {
  const v = parse(d);
  return v ? format(v, "d MMM yyyy") : fallback;
}
export function fmtDateTime(d?: string | null, fallback = "Not recorded") {
  const v = parse(d);
  return v ? format(v, "d MMM yyyy, HH:mm") : fallback;
}
export function fmtRelative(d?: string | null, fallback = "never") {
  const v = parse(d);
  return v ? `${formatDistanceToNowStrict(v)} ago` : fallback;
}
export function daysSince(d?: string | null) {
  const v = parse(d);
  return v ? Math.floor((Date.now() - v.getTime()) / 86400000) : null;
}

export const splitList = (s: string) =>
  s
    .split("\n")
    .map((l) => l.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);

export const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "Project";

export function isLikelyUrl(s: string) {
  return /^https?:\/\/\S+$/i.test(s.trim());
}
