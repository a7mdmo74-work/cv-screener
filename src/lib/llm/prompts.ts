import type { ScoringProfile } from "@/lib/schemas/candidate";
import {
  CRITERION_LABELS,
  SCORE_CRITERIA,
  type Rubric,
} from "@/lib/schemas/rubric";
import type { JobDescriptionInput, ClarifyingAnswer } from "@/lib/schemas/wizard";

export const SENIOR_HR_MANAGER_ROLE = [
  "You are a senior HR manager screening candidates for roles in the United Arab Emirates.",
  "Think like a hiring manager who must recommend a shortlist of 15 people for interview.",
  "Be rigorous, fair, and practical. Judge competence and role fit only.",
  "Do not use nationality, age, gender, marital status, photos, or other protected attributes as reasons to advance or reject someone.",
].join(" ");

export const LLM_GROUNDING_RULES = [
  "Use only information explicitly present in the provided text.",
  "Never invent requirements, employers, skills, or facts.",
  "Use null when a value is missing or uncertain.",
  "Be consistent and conservative.",
].join(" ");

export function clarifyingQuestionsPrompt(input: JobDescriptionInput): {
  system: string;
  user: string;
} {
  return {
    system: [
      SENIOR_HR_MANAGER_ROLE,
      "Ask the clarifying questions you would need before you would hire for this role.",
      LLM_GROUNDING_RULES,
      "Ask at most 8 questions, and fewer when the description is already specific.",
      "Do not ask anything already answered in the description or the provided job metadata.",
      "Return only JSON that matches the schema.",
    ].join(" "),
    user: [
      `Job title: ${input.title}`,
      `Geographic scope: ${input.geographicScope}`,
      `Employment type: ${input.employmentType}`,
      `Seniority: ${input.seniorityLevel}`,
      "",
      "Job description:",
      input.description,
      "",
      "Generate clarifying questions about must-have skills, experience, education, languages, location, and deal-breakers when those are unclear.",
    ].join("\n"),
  };
}

export function rubricPrompt(input: {
  title: string;
  description: string;
  geographicScope: string;
  employmentType: string;
  seniorityLevel: string;
  answers: ClarifyingAnswer[];
}): { system: string; user: string } {
  const answered = input.answers
    .filter((item) => item.answer.trim().length > 0)
    .map((item) => `Q: ${item.question}\nA: ${item.answer}`)
    .join("\n\n");

  const weightList = SCORE_CRITERIA.map(
    (key) => `${key} (${CRITERION_LABELS[key]})`,
  ).join(", ");

  return {
    system: [
      SENIOR_HR_MANAGER_ROLE,
      "Turn the job description and clarifying answers into the conservative rubric you would use to hire.",
      LLM_GROUNDING_RULES,
      `Weights are integers that sum to 100 across: ${weightList}.`,
      "Do not include dataQuality as a scored weight.",
      "Deal-breakers must be explicit disqualifiers from the source text or answers.",
      "Return only JSON that matches the schema.",
    ].join(" "),
    user: [
      `Job title: ${input.title}`,
      `Geographic scope: ${input.geographicScope}`,
      `Employment type: ${input.employmentType}`,
      `Seniority: ${input.seniorityLevel}`,
      "",
      "Job description:",
      input.description,
      "",
      answered
        ? `Clarifying answers:\n${answered}`
        : "No clarifying answers were provided.",
    ].join("\n"),
  };
}

const EXTRACT_SHARED = [
  SENIOR_HR_MANAGER_ROLE,
  "Extract the structured facts a senior HR manager needs to compare this CV against the role.",
  "The CV text may include [[PAGE n]] markers.",
  LLM_GROUNDING_RULES,
  "Keep names and job titles in the original language of the CV.",
  "Write descriptive fields in English.",
  "Never guess phone, email, or LinkedIn; leave those null.",
  "If a page marker is present, cite pages in evidencePages such as '1-2'. If there are no page markers, set evidencePages to N/A.",
  "Return only JSON that matches the schema.",
].join(" ");

export function extractIdentityPrompt(pagedText: string): {
  system: string;
  user: string;
} {
  return {
    system: EXTRACT_SHARED,
    user: ["Extract identity, education, and availability fields.", "", pagedText].join(
      "\n",
    ),
  };
}

export function extractExperiencePrompt(pagedText: string): {
  system: string;
  user: string;
} {
  return {
    system: [
      EXTRACT_SHARED,
      "Also list date gaps, overlapping jobs, summary-vs-timeline mismatches, and future dates in gaps and inconsistencies.",
    ].join(" "),
    user: [
      "Extract experience, skills, achievements, gaps, and inconsistencies.",
      "",
      pagedText,
    ].join("\n"),
  };
}

export function scoreCandidatePrompt(
  candidate: ScoringProfile,
  rubric: Rubric,
): { system: string; user: string } {
  const criteria = SCORE_CRITERIA.map(
    (key) => `${key} (${CRITERION_LABELS[key]}, weight ${rubric.weights[key]})`,
  ).join("; ");

  return {
    system: [
      SENIOR_HR_MANAGER_ROLE,
      "Score this anonymized profile the way you would before putting someone on a 15-person interview shortlist.",
      LLM_GROUNDING_RULES,
      "Score each criterion from 0 to 10 with short evidence that is explicitly present.",
      `Return a score object for every criterion: ${criteria}.`,
      "dataQuality is informational only and must not affect scores.",
      "Do not use name, phone, email, LinkedIn, nationality, age, gender, marital status, or photos.",
      "Set dealBreakerHit true only when an explicit deal-breaker in the rubric is clearly present.",
      "Write strengths, risksAndGaps, verificationPoints, and recommendationNarrative in English.",
      "verificationPoints must be 3 to 6 candidate-specific questions derived from gaps and inconsistencies.",
      "recommendationNarrative must be 2-3 sentences and end with what to verify before the decision.",
      "Do not compute a total, rank, salary, or recommendation tier.",
      "Return only JSON that matches the schema.",
    ].join(" "),
    user: [
      "Rubric:",
      JSON.stringify({
        mustHave: rubric.mustHave,
        niceToHave: rubric.niceToHave,
        minYearsExperience: rubric.minYearsExperience,
        education: rubric.education,
        languages: rubric.languages,
        location: rubric.location,
        dealBreakers: rubric.dealBreakers,
        weights: rubric.weights,
        geographicScope: rubric.geographicScope,
        employmentType: rubric.employmentType,
        seniorityLevel: rubric.seniorityLevel,
      }),
      "",
      "Anonymized candidate profile:",
      JSON.stringify(candidate),
    ].join("\n"),
  };
}
