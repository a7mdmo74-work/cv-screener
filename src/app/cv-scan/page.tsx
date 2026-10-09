import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CvScanForm } from "@/components/cv-scan-form";

export default function CvScanPage() {
  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-8 px-4 py-8 sm:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] sm:gap-10 sm:px-6 sm:py-12 lg:gap-16">
      <aside className="space-y-6 sm:sticky sm:top-8 sm:self-start">
        <div className="space-y-4">
          <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200">
            <span className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            HR workspace
          </Badge>
          <div>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              A clearer view of every candidate.
            </h1>
            <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400 sm:text-base">
              Compare a CV with the role, surface relevant evidence, and decide
              where a human follow-up will help.
            </p>
          </div>
        </div>

        <Card className="overflow-hidden border-indigo-100 bg-gradient-to-br from-white to-indigo-50/70 dark:border-indigo-950 dark:from-zinc-950 dark:to-indigo-950/30">
          <CardContent className="space-y-5 pt-5 sm:pt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700 dark:text-indigo-300">
              Your review at a glance
            </p>
            <div className="space-y-4">
              <ReviewBenefit
                number="01"
                title="Role-specific"
                description="Compare against the job description you provide."
              />
              <ReviewBenefit
                number="02"
                title="Evidence-led"
                description="See skills, gaps, and follow-ups together."
              />
              <ReviewBenefit
                number="03"
                title="Human decision"
                description="Use scores as guidance, not an automated verdict."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">PDF · DOCX · TXT</Badge>
          <Badge variant="outline">Local Ollama analysis</Badge>
          <Badge variant="outline">Fairness-aware</Badge>
        </div>
      </aside>

      <section aria-labelledby="new-review-title" className="min-w-0 space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Candidate assessment
            </p>
            <h2
              id="new-review-title"
              className="mt-1 text-xl font-semibold tracking-tight"
            >
              Start a new review
            </h2>
          </div>
          <Badge variant="secondary">2 steps</Badge>
        </div>
        <CvScanForm />
      </section>
    </main>
  );
}

function ReviewBenefit({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
        {number}
      </span>
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="mt-0.5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      </div>
    </div>
  );
}
