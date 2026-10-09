import type { RecommendationTier } from "@/lib/schemas/score";

/** Presentation only: ranking thresholds remain in lib/ranking. */
export const recommendationTiers = {
  "Strong candidate — recommend technical interview": "success",
  "Good — conditional interview": "info",
  "Average — reserve list": "warning",
  "Not suitable at this time": "danger",
} as const satisfies Record<RecommendationTier, string>;

export type TierTone = (typeof recommendationTiers)[RecommendationTier];
export const tierClasses = {
  success: "border-success bg-success-bg text-success",
  info: "border-info bg-info-bg text-info",
  warning: "border-warning bg-warning-bg text-warning",
  danger: "border-danger bg-danger-bg text-danger",
} as const satisfies Record<TierTone, string>;

export function recommendationClass(tier: RecommendationTier): string {
  return tierClasses[recommendationTiers[tier]];
}

const tierTextClasses = {
  success: "text-success",
  info: "text-info",
  warning: "text-warning",
  danger: "text-danger",
} as const satisfies Record<TierTone, string>;

export function recommendationTextClass(tier: RecommendationTier | null): string {
  return tier ? tierTextClasses[recommendationTiers[tier]] : "text-muted";
}
