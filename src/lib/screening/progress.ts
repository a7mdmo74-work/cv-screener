export type ScreeningStage =
  | "draft"
  | "queued"
  | "extracting"
  | "scoring"
  | "rescoring"
  | "pass_a"
  | "turbo"
  | "enrich"
  | "done"
  | "partial"
  | "cancelled"
  | "failed";

export function inferStage(input: {
  status: string;
  pending: number;
  extracted: number;
  scored: number;
  twoPass: boolean;
  turboMode?: boolean;
  notScreened?: number;
}): ScreeningStage {
  if (input.status === "done" && (input.notScreened ?? 0) > 0) {
    return "partial";
  }
  if (
    input.status === "done" ||
    input.status === "partial" ||
    input.status === "cancelled" ||
    input.status === "failed" ||
    input.status === "draft"
  ) {
    return input.status;
  }
  if (input.status === "queued") {
    return "queued";
  }
  if (input.turboMode) {
    if (input.pending > 0) {
      return "turbo";
    }
    if (input.extracted > 0) {
      return "enrich";
    }
    return "turbo";
  }
  if (input.pending > 0) {
    return "extracting";
  }
  if (input.extracted > 0) {
    return "scoring";
  }
  if (input.twoPass && input.scored > 0) {
    return "rescoring";
  }
  return "scoring";
}
