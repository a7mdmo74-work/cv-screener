import { z } from "zod";
export const salaryReferenceSchema = z.object({ roleFamily: z.string().min(1).max(80), level: z.string().min(1).max(80), min: z.number().nonnegative(), max: z.number().nonnegative(), currency: z.string().regex(/^[A-Z]{3}$/), sourceName: z.string().min(1).max(160), sourceUrl: z.string().url().refine(v => v.startsWith("https://")), date: z.iso.date(), jurisdiction: z.string().min(1).max(80) }).refine(v => v.max >= v.min, { message: "Maximum must be at least minimum" });
export const skillSettingSchema = z.object({ enabled: z.boolean(), variant: z.enum(["auto", "compact", "full"]).default("auto") });
export const companyProfileSchema = z.object({
  name: z.string().max(160).default(""), industry: z.string().max(160).default(""), size: z.string().max(80).default(""), cultureValues: z.array(z.string().max(200)).max(8).default([]), hiringPolicies: z.array(z.string().max(300)).max(8).default([]), mandatoryChecks: z.array(z.string().max(200)).max(8).default([]), defaultCurrency: z.string().regex(/^[A-Z]{3}$/).default("AED"), salaryBands: z.array(salaryReferenceSchema).max(100).default([]), probationPolicy: z.string().max(500).default("Not set; verify with HR/legal"), languages: z.array(z.string().max(40)).max(8).default(["en", "ar"]), tone: z.string().max(100).default("neutral professional"), jurisdiction: z.enum(["mainland", "free_zone"]).default("mainland"), emirate: z.string().max(80).default(""), freeZoneName: z.string().max(80).default(""), skillSettings: z.record(z.string(), skillSettingSchema).default({}),
}).refine(v => v.jurisdiction !== "free_zone" || Boolean(v.freeZoneName.trim()), { message: "A free zone name is required" });
export type CompanyProfile = z.infer<typeof companyProfileSchema>;
export const defaultCompanyProfile = () => companyProfileSchema.parse({});
/** Conservative byte budget; valid JSON is retained rather than sliced mid-field. */
export function compactCompanyProfile(profile: CompanyProfile, byteBudget = 900): string {
  const result: Record<string, unknown> = { defaultCurrency: profile.defaultCurrency, jurisdiction: profile.jurisdiction, emirate: profile.emirate, freeZoneName: profile.freeZoneName };
  for (const [key, value] of Object.entries(profile)) {
    if (["skillSettings", "salaryBands"].includes(key)) continue;
    const proposal = { ...result, [key]: value };
    if (Buffer.byteLength(JSON.stringify(proposal), "utf8") <= byteBudget) result[key] = value;
  }
  return JSON.stringify(result);
}
export function companyJurisdiction(profile: CompanyProfile) { return profile.jurisdiction === "free_zone" ? profile.freeZoneName.toLowerCase() : (profile.emirate.toLowerCase() || "mainland"); }
