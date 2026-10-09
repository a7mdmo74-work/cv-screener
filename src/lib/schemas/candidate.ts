import { z } from "zod";

export const identityExtractSchema = z.object({
  fullName: z.string().nullable(),
  nationality: z.string().nullable(),
  currentLocation: z.string().nullable(),
  currentTitle: z.string().nullable(),
  lastEmployer: z.string().nullable(),
  specialization: z.string().nullable(),
  education: z.string().nullable(),
  totalExperienceText: z.string().nullable(),
  totalYearsExperience: z.number().nullable(),
  availabilityNotice: z.string().nullable(),
  expectedSalary: z.string().nullable(),
  dataQualityNote: z.string().nullable(),
  evidencePages: z.string().nullable(),
});

export const experienceExtractSchema = z.object({
  relevantExperienceText: z.string().nullable(),
  leadershipExperienceText: z.string().nullable(),
  uaeExperienceText: z.string().nullable(),
  softwareSystems: z.array(z.string()),
  technicalSkills: z.array(z.string()),
  certifications: z.array(z.string()),
  courses: z.array(z.string()),
  languages: z.array(z.string()),
  keyAchievements: z.array(z.string()),
  gaps: z.array(z.string()),
  inconsistencies: z.array(z.string()),
});

export const candidateSchema = identityExtractSchema.extend({
  phone: z.string().nullable(),
  email: z.string().nullable(),
  linkedin: z.string().nullable(),
  relevantExperienceText: experienceExtractSchema.shape.relevantExperienceText,
  leadershipExperienceText: experienceExtractSchema.shape.leadershipExperienceText,
  uaeExperienceText: experienceExtractSchema.shape.uaeExperienceText,
  softwareSystems: experienceExtractSchema.shape.softwareSystems,
  technicalSkills: experienceExtractSchema.shape.technicalSkills,
  certifications: experienceExtractSchema.shape.certifications,
  courses: experienceExtractSchema.shape.courses,
  languages: experienceExtractSchema.shape.languages,
  keyAchievements: experienceExtractSchema.shape.keyAchievements,
  gaps: experienceExtractSchema.shape.gaps,
  inconsistencies: experienceExtractSchema.shape.inconsistencies,
});

export const scoringProfileSchema = candidateSchema.omit({
  fullName: true,
  phone: true,
  email: true,
  linkedin: true,
  nationality: true,
  dataQualityNote: true,
});

export const FORBIDDEN_SCORING_FIELDS = [
  "fullName",
  "name",
  "phone",
  "email",
  "linkedin",
  "nationality",
  "age",
  "dateOfBirth",
  "gender",
  "maritalStatus",
  "photo",
] as const;

export type IdentityExtract = z.infer<typeof identityExtractSchema>;
export type ExperienceExtract = z.infer<typeof experienceExtractSchema>;
export type Candidate = z.infer<typeof candidateSchema>;
export type ScoringProfile = z.infer<typeof scoringProfileSchema>;
