import type { TurboFlag, TurboProfile, TurboResult } from "@/lib/schemas/turbo";
import { recommendationTier } from "@/lib/ranking/rank";
import type { RecommendationTier as Tier } from "@/lib/schemas/score";

export const ARABIC_MISSING = "غير مذكور";

export const ARABIC_TIER: Record<Tier, string> = {
  "Strong candidate — recommend technical interview":
    "مرشح قوي — يُوصى بمقابلة تقنية",
  "Good — conditional interview": "جيد — مقابلة مشروطة",
  "Average — reserve list": "متوسط — قائمة احتياط",
  "Not suitable at this time": "غير مناسب حالياً",
};

export const ARABIC_FLAG_QUESTION: Record<TurboFlag, string> = {
  date_gap: "وضّح الفجوة الزمنية بين الوظائف وأرفق خطابات الخبرة",
  overlap: "وضّح تداخل فترات العمل بين جهتين إن وُجد، مع إثبات التواريخ",
  summary_mismatch: "طابق ملخص السيرة مع الخبرات الفعلية وأعط مثالاً قابلاً للتحقق",
  future_date: "صحّح أي تاريخ مستقبلي في السيرة وأرفق ما يثبت الفترة الفعلية",
  missing_dates: "أكمل تواريخ البدء والانتهاء لكل وظيفة مع الشهر والسنة",
};

const GENERIC_QUESTIONS = {
  certifications: "أرفق الشهادات المهنية وأرقامها وتواريخها للتحقق",
  notice: "حدّد فترة الإشعار وتاريخ المباشرة المتوقع",
  uae: "وضّح سنوات الخبرة داخل الإمارات وجهة العمل الأخيرة هناك",
} as const;

export function arabicRecommendationTier(totalScore: number): string {
  return ARABIC_TIER[recommendationTier(totalScore)];
}

export function arabicStrengthsLabel(): string {
  return "نقاط القوة";
}

export function arabicGapsLabel(): string {
  return "الفجوات والمخاطر";
}

export function verificationQuestionsFromTurbo(
  result: TurboResult,
  profile: TurboProfile = result.profile,
): string[] {
  const questions: string[] = [];
  for (const flag of result.flags.slice(0, 3)) {
    questions.push(ARABIC_FLAG_QUESTION[flag]);
  }
  if (!profile.certifications || profile.certifications.length === 0) {
    questions.push(GENERIC_QUESTIONS.certifications);
  }
  questions.push(GENERIC_QUESTIONS.notice);
  if (profile.uaeYears === null || profile.uaeYears === 0) {
    questions.push(GENERIC_QUESTIONS.uae);
  }
  return unique(questions).slice(0, 8);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function arabicNarrative(input: {
  totalScore: number;
  strengths: string;
  gaps: string;
}): string {
  return [
    arabicRecommendationTier(input.totalScore),
    `${arabicStrengthsLabel()}: ${input.strengths || ARABIC_MISSING}`,
    `${arabicGapsLabel()}: ${input.gaps || ARABIC_MISSING}`,
  ].join(" — ");
}

