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

## Arabic and English

Pages live under `src/app/[locale]`: `/en` (LTR) and `/ar` (RTL). English is the fallback. On first visit, the proxy negotiates `Accept-Language`; subsequent visits use the `NEXT_LOCALE` cookie. The header has a single click toggle: **ع** in English, **EN** in Arabic. It retains the current path and query string. Fonts are bundled at build time with `next/font` (Geist and Noto Sans Arabic). Numbers use Western digits and Gregorian dates in both languages.

Download route handlers remain outside `[locale]`: `/jobs/:id/export`, `/jobs/:id/export/xlsx`, `/jobs/:id/files/:cvId`, and `/export/summary/docx`. Export links carry `?locale=en|ar`; handlers also accept the locale cookie. Excel uses RTL worksheet views for Arabic. Word uses bidirectional paragraphs and tables with Arial as an Arabic-capable font fallback. CSV has a UTF-8 BOM; English screening CSV retains its machine column identifiers for compatibility, while Arabic headers are localized. User data (names, CV text, job descriptions, rubric requirements and previously stored LLM output) is never translated when the UI language changes.

The wizard's **Generated content language** selector controls future questions, rubric generation and scoring narrative language; it is stored as `outputLanguage` in rubric JSON, not as a translated enum. Existing rubric JSON defaults to English when the option is absent. Scoring rules and stored numeric criterion keys remain unchanged. Existing turbo template prose retains its original stored language. Exam/report UI and exports belong to the separately paused hiring-workflow work.

Messages are in `messages/en.json` and `messages/ar.json`, namespaced by feature. Use complete ICU messages for sentences with variables; Arabic plurals include zero/one/two/few/many/other. Use the `numbering-system/latn` ICU skeleton for counts and `useUiFormatter` for numbers/dates. Global next-intl types reject unknown message keys. Enum-to-message mappings live in `src/i18n/labels.ts`; action errors use stable codes with optional params and compatibility mapping for older error strings. Raw parser/model diagnostics are not presented as localized UI messages. Validation messages are mapped at render time.

To add a language, extend `src/i18n/routing.ts`, add a catalog with exactly the same keys/placeholders, and update the language toggle, fonts, direction and tests. Keep user-entered values separate from translated option labels.

Run `npm test -- src/i18n/i18n.test.ts` for message parity, placeholder validation, raw JSX/accessibility-string checks, enum coverage, Western digits, routing and error compatibility. Run `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build` for full verification. Arabic Excel/DOCX structure is covered by export smoke tests.

### Manual verification checklist

- Visit `/en` and `/ar`: home, new-job wizard, an existing job's upload page, results board and screening monitor, clone page, and candidate drawer.
- Click **ع** / **EN** on each route, including one with a query string. Confirm the path/query survives, the cookie persists, and `<html lang>` / `dir` change correctly.
- Check Arabic text for clipping, logical table alignment, directional arrows, and the drawer opening from the left in RTL. Check names, file names, email, phone, score punctuation and Western digits.
- Enter Arabic and English in free-text fields; confirm automatic text direction, localized validation and action errors, and unchanged existing candidate/job data.
- Export Arabic and English CSV, Excel and Word; open them in the target office application. Confirm Arabic headers, RTL worksheet/table direction and intact candidate data.

Production build and automated checks passed. Browser verification could not run because access to the local app was declined; the checklist above remains a manual check.
