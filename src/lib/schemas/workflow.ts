import { z } from "zod";

export const levelSchema = z.enum(["junior", "mid", "senior", "lead"]);
export const bilingualSchema = z.object({ en: z.string().min(1), ar: z.string() });
export const rubricPointSchema = z.object({ key: z.string().min(1), points: z.number().positive() });
export const questionSchema = z.object({
  id: z.string().min(1), type: z.enum(["multiple_choice", "true_false", "identification", "scenario", "calculation", "journal_entry", "case"]),
  topic: z.string().min(1), subtopic: z.string(), difficulty: z.enum(["easy", "medium", "hard"]),
  jdRequirementRef: z.string(), cvProbeRef: z.string().nullable(), stem: bilingualSchema,
  options: z.array(z.object({ id: z.string(), text: bilingualSchema })), correctAnswer: z.string().min(1),
  acceptedAnswers: z.array(z.string()), explanation: z.string().min(1), points: z.number().positive(),
  estimatedSeconds: z.number().int().positive(), rubric: z.array(rubricPointSchema), commonMistakes: z.array(z.string()),
  calculation: z.object({ expression: z.string(), result: z.number() }).nullable(),
  needsReview: z.boolean().default(false), reviewReason: z.string().default(""),
}).superRefine((q, ctx) => {
  if (["multiple_choice", "true_false"].includes(q.type) && (!q.options.some(o => o.id === q.correctAnswer) || new Set(q.options.map(o => o.id)).size !== q.options.length || q.options.length < 2)) ctx.addIssue({ code: "custom", message: "Key must reference a unique option; provide at least two options" });
  if (q.type === "calculation" && !q.calculation) ctx.addIssue({ code: "custom", message: "Calculation requires a machine-checkable expression" });
  if (["scenario", "journal_entry", "case"].includes(q.type) && (q.rubric.length === 0 || Math.abs(q.rubric.reduce((s,r) => s+r.points, 0)-q.points)>0.001)) ctx.addIssue({ code: "custom", message: "Open answers require a rubric totaling the question points" });
});
export const practicalSchema = z.object({ system: z.string(), timeLimitMin: z.number().positive(), steps: z.array(z.object({ id: z.string(), instruction: bilingualSchema, points: z.number().positive(), evidence: z.string() })).min(1) });
export const blueprintSchema = z.object({ level: levelSchema, questionCount: z.number().int().positive(), durationMin: z.number().positive(), passMark: z.number().min(0).max(100), difficulty: z.object({ easy: z.number(), medium: z.number(), hard: z.number() }), includesCase: z.boolean(), topicWeights: z.record(z.string(), z.number().positive()), probes: z.array(z.string()), uncoveredProbes: z.array(z.string()), practical: practicalSchema });
export const answersSchema = z.record(z.string(), z.object({ answer: z.string(), rubricScores: z.array(z.number().min(0)).default([]), override: z.number().min(0).nullable().default(null), overrideReason: z.string().default("") }));
export const practicalRatingsSchema = z.record(z.string(), z.object({ points: z.number().min(0), evidence: z.string().min(1) }));
export const gradeInputSchema = z.object({ answers: answersSchema, practical: practicalRatingsSchema, durationMin: z.number().positive().nullable(), confirmed: z.literal(true) });
export const gradeSchema = z.enum(["A", "B", "C", "D", "E"]);
export const interviewInputSchema = z.object({ formTemplate: z.enum(["PH", "LA"]), interviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), location: z.string().min(1), interviewType: z.enum(["Telephone", "Online", "In-person"]), interviewers: z.array(z.string().min(1)).min(1).max(2), ratings: z.array(z.object({ id: z.number().int().min(1).max(26), grades: z.array(gradeSchema).min(1).max(2), evidence: z.string().min(1) })).length(26), header: z.record(z.string(), z.string()), deptManagerNotes: z.string(), hrRecommendation: z.string() }).superRefine((v,c) => { if (new Set(v.ratings.map(r=>r.id)).size!==26 || v.ratings.some(r=>r.grades.length!==v.interviewers.length)) c.addIssue({code:"custom",message:"Provide all 26 unique criteria and one rating per interviewer"}); });
export const coverageSchema = z.object({ requirement: z.string(), status: z.enum(["Met", "Partial", "Not met", "Unverified"]), evidence: z.array(z.string()).min(1), verification: z.string() });
export const workflowSettingsSchema = z.object({ compositeWeights: z.object({ cv: z.number().min(0), exam: z.number().min(0), interview: z.number().min(0) }).refine(w=>w.cv+w.exam+w.interview>0).optional(), relevantExcludedItems: z.array(z.number().int().refine(n=>[2,3,26].includes(n))).default([]), relevanceReason: z.string().default(""), blueprintOverrides: z.object({ questionCount: z.number().int().min(10).max(100).optional(), durationMin: z.number().positive().optional(), passMark: z.number().min(0).max(100).optional() }).default({}), marketReference: z.object({ text: z.string(), source: z.string().min(1), date: z.string() }).nullable().default(null) }).refine(v=>v.relevantExcludedItems.length===0||v.relevanceReason.trim().length>0,{message:"Job relevance reason is required"});
export const taggedClaimSchema = z.object({ kind: z.enum(["Evidence", "Inference", "Recommendation"]), text: z.string().min(1), evidence: z.array(z.string().regex(/^\[(CV|JD|EXAM Q\d+|INTERVIEW #\d+)\]$/)).min(1), verification: z.string() }).refine(c=>c.kind!=="Inference"||c.verification.trim().length>0,{message:"Inference requires verification"});
export const narrativeSchema = z.object({ executiveSummary: z.array(taggedClaimSchema).min(1), strengths: z.array(taggedClaimSchema), risks: z.array(taggedClaimSchema), verificationItems: z.array(taggedClaimSchema), plan: z.array(z.object({ days: z.enum(["30", "60", "90"]), action: taggedClaimSchema, kpi: z.string().min(1) })).length(3), probationKpis: z.array(taggedClaimSchema) });
export const decisionSchema = z.object({ outcome: z.enum(["Hire", "Conditional hire", "Hold", "Reject"]), composite: z.number().min(0).max(100), weights: z.object({cv:z.number(),exam:z.number(),interview:z.number()}), conditions: z.array(z.string()), gates: z.array(z.object({ rule: z.string(), evidence: z.array(z.string()) })), recommendedTitle: z.string(), level: levelSchema });
export const gradedItemSchema = z.object({ id:z.string(), earned:z.number(), possible:z.number(), result:z.enum(["correct","wrong","blank","partial"]), answer:z.string() });
export const scoreGroupSchema = z.object({ earned:z.number(), possible:z.number(), percentage:z.number() });
export const gradedSchema = z.object({ items:z.array(gradedItemSchema), rawScore:z.number(), maxScore:z.number(), percentage:z.number(), passMark:z.number(), passed:z.boolean(), correctCount:z.number(), wrongCount:z.number(), blankCount:z.number(), partialCount:z.number(), answersNeededToPass:z.number().nullable(), pointsNeededToPass:z.number(), topic:z.record(z.string(),scoreGroupSchema), difficulty:z.record(z.string(),scoreGroupSchema), section:z.record(z.string(),scoreGroupSchema), practical:scoreGroupSchema });
export const interviewComputedSchema = z.object({ totals:z.array(z.number()), averages:z.array(z.number()), rawAverage:z.number(), overallAverage:z.number(), percentage:z.number(), rawPercentage:z.number(), band:z.string(), counts:z.record(gradeSchema,z.number()), clusters:z.record(z.string(),z.number().nullable()), disagreements:z.array(z.number()), excluded:z.array(z.number()), criterionAverages:z.record(z.string(),z.number()) });
export const reportSchema = z.object({ language:z.enum(["ar","en"]), narrative:narrativeSchema, decision:decisionSchema, coverage:z.array(coverageSchema), scorecard:z.object({cv:z.number(),exam:z.number(),interview:z.number(),composite:z.number()}), exam:gradedSchema, questions:z.array(questionSchema), interview:interviewComputedSchema, interviewTemplate:z.enum(["PH","LA"]), salary:z.string(), methodology:z.object({model:z.string(),promptVersion:z.string(),inputsHash:z.string(),examId:z.string(),attemptId:z.string(),interviewId:z.string(),settings:workflowSettingsSchema}) });
export type Question = z.infer<typeof questionSchema>;
export type Blueprint = z.infer<typeof blueprintSchema>;
export type GradeInput = z.infer<typeof gradeInputSchema>;
export type InterviewInput = z.infer<typeof interviewInputSchema>;
export type WorkflowSettings = z.infer<typeof workflowSettingsSchema>;
export type FinalReportPayload = z.infer<typeof reportSchema>;
