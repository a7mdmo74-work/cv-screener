export function stripJsonFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function quoteUnquotedKeys(source: string): string {
  return source.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');
}

function dropDanglingProperty(source: string): string {
  return source
    .replace(/,\s*"[^"]*$/g, "")
    .replace(/,\s*"[^"]*"\s*:?\s*$/g, "")
    .replace(/([{,]\s*)"[^"]*"\s*:\s*$/g, "$1");
}

function fillEmptyValues(source: string): string {
  return source
    .replace(/:\s*,/g, ":null,")
    .replace(/:\s*}/g, ":null}")
    .replace(/:\s*]/g, ":null]")
    .replace(/,\s*([}\]])/g, "$1");
}

function closeTruncatedObject(source: string): string {
  let inString = false;
  let escape = false;
  const stack: string[] = [];

  for (const char of source) {
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") {
      stack.push("}");
    } else if (char === "[") {
      stack.push("]");
    } else if (char === "}" || char === "]") {
      stack.pop();
    }
  }

  let next = source;
  if (inString) {
    next += '"';
  }
  while (stack.length > 0) {
    next += stack.pop();
  }
  return next;
}

function firstJsonObject(source: string): string {
  const start = source.indexOf("{");
  if (start < 0) {
    return source;
  }
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }
  return source.slice(start);
}

function parseOrRepair(source: string): string {
  try {
    JSON.parse(source);
    return source;
  } catch {
    const closed = fillEmptyValues(closeTruncatedObject(source));
    try {
      JSON.parse(closed);
      return closed;
    } catch {
      const first = firstJsonObject(closed);
      JSON.parse(first);
      return first;
    }
  }
}

export function repairJsonText(text: string): string {
  let source = stripJsonFences(text);
  const start = source.indexOf("{");
  if (start > 0) {
    source = source.slice(start);
  }

  source = quoteUnquotedKeys(source);
  source = dropDanglingProperty(source);
  source = fillEmptyValues(source);
  return parseOrRepair(source);
}

export function parseJsonLoose(text: string): unknown {
  return JSON.parse(repairJsonText(text));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .slice(0, max);
}

function asScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.min(10, Math.max(0, Math.round(n)));
}

const TURBO_FLAGS = [
  "date_gap",
  "overlap",
  "summary_mismatch",
  "future_date",
  "missing_dates",
] as const;

export function hydrateTurboPayload(value: unknown): unknown {
  const root = isRecord(value) ? value : {};
  const profile = isRecord(root.profile) ? root.profile : {};
  const scores = isRecord(root.scores) ? root.scores : {};
  return {
    profile: {
      currentTitle: typeof profile.currentTitle === "string" ? profile.currentTitle : null,
      lastEmployer: typeof profile.lastEmployer === "string" ? profile.lastEmployer : null,
      specialization:
        typeof profile.specialization === "string" ? profile.specialization : null,
      education: typeof profile.education === "string" ? profile.education : null,
      totalYears: typeof profile.totalYears === "number" ? profile.totalYears : null,
      relevantYears:
        typeof profile.relevantYears === "number" ? profile.relevantYears : null,
      uaeYears: typeof profile.uaeYears === "number" ? profile.uaeYears : null,
      location: typeof profile.location === "string" ? profile.location : null,
      leadership: typeof profile.leadership === "string" ? profile.leadership : null,
      software: asStringArray(profile.software, 6),
      certifications: asStringArray(profile.certifications, 5),
      languages: asStringArray(profile.languages, 4),
    },
    scores: {
      relevantExperience: asScore(scores.relevantExperience),
      leadership: asScore(scores.leadership),
      technicalSkills: asScore(scores.technicalSkills),
      softwareSystems: asScore(scores.softwareSystems),
      achievements: asScore(scores.achievements),
      uaeExperience: asScore(scores.uaeExperience),
      jobFit: asScore(scores.jobFit),
    },
    dealBreaker: Boolean(root.dealBreaker),
    strengths: typeof root.strengths === "string" ? root.strengths.slice(0, 120) : "",
    gaps: typeof root.gaps === "string" ? root.gaps.slice(0, 120) : "",
    flags: Array.isArray(root.flags)
      ? root.flags
          .filter(
            (item): item is (typeof TURBO_FLAGS)[number] =>
              typeof item === "string" &&
              (TURBO_FLAGS as readonly string[]).includes(item),
          )
          .slice(0, 3)
      : [],
  };
}
