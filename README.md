# CV Screener

Local AI CV screening for HR. Upload PDF, DOCX, or ZIP CVs, answer a short clarifying wizard, then rank candidates against a rubric. Extraction and scoring run through Ollama on your machine. Totals and ranking are computed in code, not by the model.

Nothing is sent to a cloud LLM. Files and SQLite stay under `data/`.

## Requirements

- Node.js 20+
- [Ollama](https://ollama.com) running locally
- The models named in `.env` pulled into Ollama

## Setup

```bash
cp .env.example .env
npm install
npx prisma migrate dev
```

`.env` must include:

```
DATABASE_URL="file:./data/cv-screener.db"
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_EXTRACT_MODEL=qwen3:8b
OLLAMA_SCORE_MODEL=qwen3.8:27b
SCREENING_CONCURRENCY=2
```

Model names are not hardcoded. Change `OLLAMA_EXTRACT_MODEL` and `OLLAMA_SCORE_MODEL` to whatever you have pulled.

## Run

Use two terminals:

```bash
npm run dev
npm run worker
```

Open [http://localhost:3000](http://localhost:3000).

1. Create a screening job and review the generated rubric.
2. Upload CVs as PDF, DOCX, or ZIP (up to 700, 15 MB each). You can add more files in later batches before you start screening.
3. Start screening. The job is queued until the worker picks it up.
4. Watch progress, then review the top 15, the full table, and export CSV or Excel.
5. Re-rank by editing weights. That only recomputes totals from stored scores; Excel and Word exports use the new totals.
6. Clone a job for another role to reuse parsed CVs and Stage 1 extraction, then queue scoring only.
7. On the homepage, select several jobs and export a unified Word summary.

Cancel stops further extraction and scoring. Already scored CVs stay available.

## Two-pass scoring

Optional. The extract model scores every parsed CV first, then the score model re-scores the top 40. Ranking still happens in code.

## Tests

```bash
npm test
```

Ranking, anonymization, truncation, progress stages, and CSV escaping are covered without calling Ollama.

## Layout

- `src/actions/` — Server Actions (API routes only for file, CSV, Excel, and Word download)
- `src/lib/llm/` — Ollama client, structured JSON, extract/score prompts
- `src/lib/parsing/` — ZIP unpack, PDF/DOCX extract, page markers, and PII anonymization
- `src/lib/ranking/` — weighted totals, recommendation tiers, and salary bands
- `src/lib/export/` — Excel workbook and unified Word summary
- `worker/screening-worker.ts` — resumable background pipeline
- `data/` — SQLite and uploaded files (gitignored)
