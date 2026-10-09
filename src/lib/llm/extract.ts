import { generateStructured } from "@/lib/llm/generate";
import {
  extractExperiencePrompt,
  extractIdentityPrompt,
} from "@/lib/llm/prompts";
import { EXTRACT_NUM_CTX, EXTRACT_TEXT_LIMIT, truncateText } from "@/lib/llm/truncate";
import { anonymizeCvText } from "@/lib/parsing/anonymize";
import { extractContactFields } from "@/lib/parsing/contact";
import { evidencePagesLabel, formatPagedText, parsePagesJson } from "@/lib/parsing/pages";
import {
  candidateSchema,
  experienceExtractSchema,
  identityExtractSchema,
  type Candidate,
} from "@/lib/schemas/candidate";

export async function extractCandidate(
  model: string,
  input: {
    rawText: string;
    anonymizedText: string;
    pagesJson: string;
  },
): Promise<Candidate> {
  const pages = parsePagesJson(input.pagesJson).map((page) => anonymizeCvText(page));
  const paged = truncateText(
    formatPagedText(pages, input.anonymizedText),
    EXTRACT_TEXT_LIMIT,
  );
  const contacts = extractContactFields(input.rawText);
  const identityPrompt = extractIdentityPrompt(paged);
  const experiencePrompt = extractExperiencePrompt(paged);

  const [identity, experience] = await Promise.all([
    generateStructured(identityExtractSchema, {
      model,
      system: identityPrompt.system,
      user: identityPrompt.user,
      numCtx: EXTRACT_NUM_CTX,
    }),
    generateStructured(experienceExtractSchema, {
      model,
      system: experiencePrompt.system,
      user: experiencePrompt.user,
      numCtx: EXTRACT_NUM_CTX,
    }),
  ]);

  return candidateSchema.parse({
    ...identity,
    ...experience,
    fullName: contacts.fullName ?? identity.fullName,
    phone: contacts.phone,
    email: contacts.email,
    linkedin: contacts.linkedin,
    evidencePages: identity.evidencePages ?? (evidencePagesLabel(pages) || null),
  });
}
