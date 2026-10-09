import {
  DEFAULT_RUBRIC_WEIGHTS,
  mergeJobMetadata,
  type Rubric,
} from "@/lib/schemas/rubric";
import type { JobDescriptionInput } from "@/lib/schemas/wizard";

const BUSY_OLLAMA_MESSAGE =
  "Ollama is busy with an active screening job, so the wizard timed out. You can skip AI questions and continue with a basic rubric, then edit it.";

const SKIP_LINE =
  /^(how to apply|email|mobile|phone|tel|positions?:|responsibilit|qualifications?|requirements?|location:)/i;
const COMPANY_BLURB =
  /leading company|looking to hire|based in|landscap|nursery|nurseries/i;
const REQUIREMENT_HINT =
  /bachelor|degree|diploma|master|erp|zoho|sap|oracle|odoo|dynamics|vat|ifrs|excel|account|reconcil|payable|receivable|abu dhabi|uae|year|budget|audit|ledger|payroll/i;

export function busyOllamaMessage(): string {
  return BUSY_OLLAMA_MESSAGE;
}

function isDualRole(title: string, description: string): boolean {
  const blob = `${title}\n${description}`.toLowerCase();
  return /\bsenior\b/.test(blob) && /\bjunior\b/.test(blob);
}

function yearsFromText(text: string, dualRole: boolean): number | null {
  const years = [...text.matchAll(/(\d+)\s*\+?\s*years?/gi)]
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value > 0 && value < 40);
  if (years.length === 0) {
    return null;
  }
  return dualRole ? Math.min(...years) : years[0];
}

function educationFromText(text: string): string | null {
  if (/bachelor/i.test(text)) {
    return "Bachelor's degree";
  }
  if (/diploma/i.test(text)) {
    return "Diploma";
  }
  if (/master/i.test(text)) {
    return "Master's degree";
  }
  return null;
}

function requirementLines(description: string): string[] {
  return description
    .split(/\n+/)
    .map((line) => line.replace(/^[\s•*\-–]+/, "").trim())
    .filter((line) => line.length >= 8 && line.length <= 160)
    .filter((line) => !SKIP_LINE.test(line))
    .filter((line) => !COMPANY_BLURB.test(line))
    .filter((line) => REQUIREMENT_HINT.test(line))
    .slice(0, 8);
}

function synthesizedMustHaves(description: string): string[] {
  const items: string[] = [];
  if (/bachelor|degree/i.test(description)) {
    items.push("Bachelor's degree in Accounting or Finance");
  }
  if (/erp|zoho|sap|oracle|odoo|dynamics/i.test(description)) {
    items.push("ERP (Zoho, SAP, Oracle, Dynamics, or Odoo)");
  }
  if (/vat|uae regulation/i.test(description)) {
    items.push("UAE VAT / FTA compliance");
  }
  if (/payable|receivable|ap\/ar|reconcil/i.test(description)) {
    items.push("AP/AR and reconciliations");
  }
  if (/abu dhabi/i.test(description)) {
    items.push("Based in or willing to work in Abu Dhabi");
  }
  return items;
}

export function fallbackRubricFromJob(details: JobDescriptionInput): Rubric {
  const dualRole = isDualRole(details.title, details.description);
  const fromJd = requirementLines(details.description);
  const synthesized = synthesizedMustHaves(details.description);
  const mustHave = [...synthesized, ...fromJd].filter(
    (item, index, all) =>
      all.findIndex((other) => other.toLowerCase() === item.toLowerCase()) ===
      index,
  );

  return mergeJobMetadata(
    {
      mustHave: mustHave.slice(0, 6),
      niceToHave: dualRole
        ? ["5+ years and senior-track leadership for Senior Accountant"]
        : fromJd.slice(6),
      minYearsExperience: yearsFromText(details.description, dualRole),
      education: educationFromText(details.description),
      languages: [],
      location: /abu dhabi/i.test(details.description)
        ? "Abu Dhabi"
        : details.geographicScope,
      dealBreakers: [],
      weights: { ...DEFAULT_RUBRIC_WEIGHTS },
    },
    {
      geographicScope: details.geographicScope,
      employmentType: details.employmentType,
      seniorityLevel: dualRole ? "Junior to Senior" : details.seniorityLevel,
      currency: "AED",
      includeNationalityColumn: details.includeNationalityColumn,
      salaryBands: [],
    },
  );
}
