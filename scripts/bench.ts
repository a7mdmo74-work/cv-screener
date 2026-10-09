import { AUTO_CONCURRENCY_CANDIDATES, llmConfig } from "@/lib/llm/config";
import { turboScreenCv } from "@/lib/llm/turbo";
import { DEFAULT_RUBRIC_WEIGHTS, type Rubric } from "@/lib/schemas/rubric";
import { cvsPerMinute, pickBestConcurrency } from "@/lib/screening/scheduler";

const SAMPLE =
  "Summary\nAccountant with ERP data entry in Abu Dhabi.\nExperience\n3 years general ledger, AP, and Excel at a contracting firm.\nEducation\nBachelor of Accounting.\nSkills\nExcel, ERP.";

function parseArgs(argv: string[]) {
  const compareIndex = argv.indexOf("--compare");
  const models =
    compareIndex >= 0 && argv[compareIndex + 1]
      ? argv[compareIndex + 1].split(",").map((item) => item.trim())
      : [llmConfig.bulkModel];
  return { models };
}

const rubric: Rubric = {
  mustHave: ["Accounting", "ERP"],
  niceToHave: ["Excel"],
  minYearsExperience: 2,
  education: "Bachelor",
  languages: ["English"],
  location: "Abu Dhabi",
  dealBreakers: [],
  weights: { ...DEFAULT_RUBRIC_WEIGHTS },
  geographicScope: "Abu Dhabi",
  employmentType: "Full-time",
  seniorityLevel: "Junior",
  currency: "AED",
  includeNationalityColumn: false,
  salaryBands: [],
};

async function benchModel(model: string) {
  const samples = [];
  for (const concurrency of AUTO_CONCURRENCY_CANDIDATES) {
    const count = 6;
    const started = Date.now();
    let tokens = 0;
    const workers = Array.from({ length: concurrency }, (_, worker) =>
      (async () => {
        for (let i = worker; i < count; i += concurrency) {
          const result = await turboScreenCv({
            model,
            rubric,
            anonymizedText: `${SAMPLE} #${i}`,
            truncateChars: llmConfig.turboTruncateChars,
          });
          tokens += result.promptTokens + result.completionTokens;
        }
      })(),
    );
    await Promise.all(workers);
    const elapsedMs = Date.now() - started;
    const rate = cvsPerMinute(count, elapsedMs);
    samples.push({ concurrency, cvCount: count, elapsedMs, rate, tokens });
    const secPerCv = elapsedMs / 1000 / count;
    const tokensPerSec = tokens / (elapsedMs / 1000);
    console.log(
      `${model} conc=${concurrency}: ${secPerCv.toFixed(2)} sec/CV, ${rate} CVs/min, ${tokensPerSec.toFixed(1)} tok/s`,
    );
  }
  const best = pickBestConcurrency(samples);
  const bestSample = samples.find((item) => item.concurrency === best) ?? samples[0];
  const projectedMin = 700 / Math.max(bestSample.rate, 0.01);
  const fit = Math.floor(bestSample.rate * llmConfig.timeBudgetMin);
  console.log(
    `${model} best concurrency ${best}. Projected 700 CVs: ${projectedMin.toFixed(1)} min. Time budget ${llmConfig.timeBudgetMin} min fits ~${fit} CVs.`,
  );
  return { model, best, projectedMin };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  for (const model of args.models) {
    await benchModel(model);
  }
}

void main();
