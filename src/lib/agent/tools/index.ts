import { createHash } from "node:crypto";
import { z } from "zod";
import { anonymizeCvText } from "@/lib/parsing/anonymize";
export function normalizeDigits(text: string) { return text.replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 0x6f0)); }
export function detectLanguage(text: string) { const ar = (text.match(/[\u0600-\u06ff]/g) ?? []).length, en = (text.match(/[a-z]/gi) ?? []).length; return ar && en ? "mixed" : ar ? "ar" : "en"; }
const months = ["jan|january|يناير", "feb|february|فبراير", "mar|march|مارس", "apr|april|ابريل|أبريل", "may|مايو", "jun|june|يونيو", "jul|july|يوليو", "aug|august|اغسطس|أغسطس", "sep|sept|september|سبتمبر", "oct|october|اكتوبر|أكتوبر", "nov|november|نوفمبر", "dec|december|ديسمبر"];
const monthPattern = months.join("|");
const datePattern = `(?:${monthPattern})\\s+\\d{4}|\\d{4}[-/]\\d{1,2}|\\d{1,2}/\\d{4}|\\d{4}|present|current|الآن|الحالي|حتى الآن`;
export const tenureSchema = z.object({ start: z.number().int(), end: z.number().int(), label: z.string(), evidence: z.string(), precise: z.boolean() });
export type Tenure = z.infer<typeof tenureSchema>;
function dateMonth(value: string, asOf: Date, ending = false): { month: number; precise: boolean } {
  if (/present|current|الآن|الحالي/i.test(value)) return { month: asOf.getUTCFullYear() * 12 + asOf.getUTCMonth() + (ending ? 1 : 0), precise: true };
  const nums = value.match(/\d+/g)?.map(Number) ?? [];
  let year: number, month: number;
  if (nums.length === 2) [year, month] = nums[0] > 1900 ? nums : [nums[1], nums[0]];
  else { year = nums[0]; const index = months.findIndex(m => new RegExp(`^(?:${m})\\b`, "i").test(value) || new RegExp(`^(?:${m})\\s`, "i").test(value)); month = index >= 0 ? index + 1 : ending ? 12 : 1; }
  if (!year || year < 1900 || year > 2200 || month < 1 || month > 12) throw new Error("Invalid employment date");
  return { month: year * 12 + month - 1 + (ending ? 1 : 0), precise: nums.length > 1 || /[a-z\u0600-\u06ff]/i.test(value) };
}
export function buildChronology(text: string, asOf = new Date()): Tenure[] {
  const normalized = normalizeDigits(text); const result: Tenure[] = []; let page: string | null = null;
  const pattern = new RegExp(`(${datePattern})\\s*(?:[-–—]|to|حتى|إلى)\\s*(${datePattern})`, "gi");
  for (const line of normalized.split(/\r?\n/)) {
    const marker = /\[\[PAGE (\d+)\]\]/.exec(line); if (marker) page = marker[1];
    for (const m of line.matchAll(pattern)) {
      try { const start = dateMonth(m[1], asOf), end = dateMonth(m[2], asOf, true); result.push({ start: start.month, end: end.month, label: line.slice(0, 240), evidence: page ? `[CV p.${page}]` : "[CV]", precise: start.precise && end.precise }); } catch { /* Invalid ranges are not guessed. */ }
    }
  }
  return result.sort((a, b) => a.start - b.start || a.end - b.end);
}
export function chronologyFindings(ranges: Tenure[], asOf = new Date(), gapMonths = 3) {
  const now = asOf.getUTCFullYear() * 12 + asOf.getUTCMonth() + 1;
  const sane = ranges.filter(r => r.start < r.end && r.end <= now);
  const anomalies = ranges.flatMap(r => r.start >= r.end ? [{ code: "impossible_tenure", months: r.start - r.end, evidence: [r.evidence] }] : r.end > now || r.start >= now ? [{ code: "future_date", months: r.end - now, evidence: [r.evidence] }] : r.end - r.start > 600 ? [{ code: "impossible_tenure", months: r.end - r.start, evidence: [r.evidence] }] : []);
  const gaps: Array<{ code: string; months: number; evidence: string[] }> = [], overlaps: typeof gaps = [];
  let coveredEnd = 0, previous: Tenure | undefined; let monthsCovered = 0;
  for (const range of sane) {
    if (previous && range.precise && previous.precise && range.start - coveredEnd >= gapMonths) gaps.push({ code: "date_gap", months: range.start - coveredEnd, evidence: [previous.evidence, range.evidence] });
    monthsCovered += Math.max(0, range.end - Math.max(range.start, coveredEnd));
    if (range.end > coveredEnd) { coveredEnd = range.end; previous = range; }
  }
  for (let i = 0; i < sane.length; i++) for (let j = i + 1; j < sane.length; j++) {
    const months = Math.min(sane[i].end, sane[j].end) - Math.max(sane[i].start, sane[j].start);
    if (months > 0 && sane[i].precise && sane[j].precise) overlaps.push({ code: "overlap", months, evidence: [sane[i].evidence, sane[j].evidence] });
  }
  return { ranges, gaps, overlaps, anomalies, years: Math.round(monthsCovered / 12 * 100) / 100, insufficientEvidence: !ranges.length || ranges.some(r => !r.precise) };
}
export function normalizeTitle(title: string) { const v = title.toLowerCase(); return /director|head|مدير عام|رئيس قسم/.test(v) ? "lead" : /senior|lead|أول|خبير/.test(v) ? "senior" : /junior|assistant|trainee|مبتدئ|مساعد|متدرب/.test(v) ? "junior" : "mid"; }
export function duplicateCvHash(text: string) { return createHash("sha256").update(anonymizeCvText(normalizeDigits(text)).normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim()).digest("hex"); }
export function validateContacts(contact: { email?: string | null; phone?: string | null; linkedin?: string | null }) { return { email: !contact.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email), phone: !contact.phone || /^\+?[\d ()-]{7,24}$/.test(normalizeDigits(contact.phone)), linkedin: !contact.linkedin || /^https:\/\/(?:www\.)?linkedin\.com\/(?:in|pub)\//i.test(contact.linkedin) }; }
export function raterStatistics(ratings: number[][]) {
  if (ratings.some(row => row.length !== 2 || row.some(n => !Number.isFinite(n) || n < 0 || n > 5))) throw new Error("Two ratings between 0 and 5 are required");
  const means = [0, 1].map(i => ratings.length ? ratings.reduce((s, r) => s + r[i], 0) / ratings.length : 0);
  const deltas = ratings.map(r => Math.abs(r[0] - r[1]));
  const variances = [0, 1].map(i => ratings.length ? ratings.reduce((s, r) => s + (r[i] - means[i]) ** 2, 0) / ratings.length : 0);
  return { means, deltas, disagreements: deltas.map((n, i) => n >= 2 ? i + 1 : null).filter(n => n !== null), relativeRaterPattern: Math.abs(means[0] - means[1]) >= 1 ? "relative leniency/severity; not proof of bias" : "none", possibleHalo: variances.map(n => ratings.length >= 4 && n < 0.1), insufficientEvidence: ratings.length < 4 };
}
