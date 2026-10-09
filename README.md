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

The checklist above covers localization and office-application checks. Theme verification is described below.


## Light, dark and system themes

`src/app/globals.css` is the single source of color values. `:root` stores reusable light constants; `:root, .print-light` activates them, and `.dark` activates the dark palette. Both active palettes define identical tokens. Tailwind v4 exposes them with `@theme inline` and a class-based `dark` variant. `muted` is a **text** color; use `bg-surface-muted` for quiet backgrounds.

The locale layout is this project's root layout (`src/app/[locale]/layout.tsx`). Its client `ThemeProvider` uses `next-themes` with class attributes, system default, live system preference updates, transition suppression, and the existing `cv-screener-theme` localStorage key. The blocking inline script precedes page content in the initial HTML; selecting a palette never reads request cookies or makes the static shell user-specific. `<html suppressHydrationWarning>` handles the initial class/style difference. The accessible three-button header group renders after mount, has localized English/Arabic labels, and keeps icons unmirrored.

### Token reference

| Token | Light | Dark |
| --- | --- | --- |
| `background` | `#F7F8FA` | `#0B1220` |
| `surface` | `#FFFFFF` | `#111A2B` |
| `surface-muted` | `#F1F3F6` | `#172236` |
| `border` | `#7B889B` | `#61728E` |
| `border-strong` | `#69788E` | `#7C8CA6` |
| `foreground` | `#0F172A` | `#E6EBF2` |
| `muted` | `#526077` | `#9AA8BD` |
| `accent` | `#0F766E` | `#2DD4BF` |
| `accent-hover` | `#115E59` | `#5EEAD4` |
| `accent-foreground` | `#FFFFFF` | `#04211D` |
| `ring` | `#0F766E` | `#5EEAD4` |
| `success` | `#15803D` | `#4ADE80` |
| `success-bg` | `#DCFCE7` | `#0F2A1B` |
| `warning` | `#A34A08` | `#FBBF24` |
| `warning-bg` | `#FEF3C7` | `#2B2108` |
| `danger` | `#B91C1C` | `#F87171` |
| `danger-bg` | `#FEE2E2` | `#2E1114` |
| `info` | `#1D4ED8` | `#60A5FA` |
| `info-bg` | `#DBEAFE` | `#0E1E3A` |
| `overlay` | `rgb(15 23 42 / 55%)` | `rgb(11 18 32 / 75%)` |
| `shadow` | `0 2px 8px rgb(15 23 42 / 6%)` | `0 0 0 0 transparent` |
| `selection` | `#0F766E` | `#2DD4BF` |
| `selection-foreground` | `#FFFFFF` | `#04211D` |
| `focus-ring` | `#0F766E` | `#5EEAD4` |
| `skeleton` | `#CBD2DC` | `#34445F` |
| `table-row-hover` | `#F1F3F6` | `#172236` |
| `table-header` | `#F1F3F6` | `#172236` |
| `disabled` | `#F1F3F6` | `#172236` |
| `disabled-foreground` | `#526077` | `#9AA8BD` |

Compatibility aliases (`card`, `popover`, `primary`, `secondary`, `input`, `destructive`, `muted-foreground`, `sidebar-*`, `chart-*`) reference these semantic tokens. Card/popover map to surface; primary maps to accent; secondary maps to surface-muted; input maps to border-strong; destructive maps to danger. Chart colors reference success, info, warning, danger and muted. Small through extra-large shadows share the shadow token; dark elevation relies on borders.

The requested light ring, warning foreground and both border palettes were adjusted where contrast failed. Text, status foregrounds, disabled labels and selection text meet 4.5:1; borders and focus indicators meet 3:1 against background, surface and surface-muted. `scripts/check-contrast.ts` reads the CSS declarations and aliases directly, checks 126 pairs without rounding before comparison, and fails `npm test` on a violation. These token checks do not replace keyboard, screen-reader or rendered-state reviews.

### Adding colors and components

1. Add a light constant (`--light-example`) in the constants block, activate `--example: var(--light-example)` in `:root, .print-light`, and define `--example` in `.dark`. Use meaning-based names.
2. Expose `--color-example: var(--example)` in `@theme inline`. Add its light reference to the print override and its intended foreground/background pairs to `scripts/check-contrast.ts`.
3. Use utilities such as `bg-surface text-foreground border-border`, `text-muted`, and `bg-accent text-accent-foreground hover:bg-accent-hover`. Use `currentColor` or CSS variables for SVG/chart styling. Avoid opacity on text and focus rings because it reduces contrast. Disabled controls retain readable labels; transitions respect reduced motion.
4. Recommendation presentation belongs in `src/lib/ui/tiers.ts`: Strong → success, Good → info, Average → warning, Not suitable → danger. Reuse `recommendationClass` or `tierClasses` in badges, cards, tables, charts and drawers. Ranking thresholds remain in the ranking code.
5. Keep all user-facing strings in the next-intl catalogs. Run `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npm run build`.

### Fixed-color allowlist and print rule

The guard test scans **all** TypeScript/JavaScript/CSS files in `src/components` and `src/app`, including border sides, gradients, SVG colors and arbitrary color utilities. The exact-path allowlist is in `src/lib/ui/color-guard.ts`:

- `src/app/globals.css`: intentional palette definitions and native-element styling, the only fixed-color exception inside the guarded UI directories.
- `transparent`, `currentColor`, `none`, CSS inheritance/reset keywords, and references to CSS variables are color-independent primitives, permitted by the guard.
- Existing `src/lib/export/excel.ts`, `src/lib/export/word.ts` and `src/lib/export/interview.ts` are outside the web UI scan. Their fixed document palettes are intentional, independent of localStorage/system appearance, and remain unchanged. CSV contains no presentation styling.

Wrap any future HTML report or exam sheet in `.print-light` and avoid adding a `.dark` class within it. The wrapper reactivates the same light constants on screen. `@media print` forces all active tokens to their light sources with `!important`, uses white paper with dark text, and removes header UI and shadows even when the page is dark. Do not import browser theme state into PDF, DOCX or Excel generators. No PDF generator or rendered exam/report page is currently present; this rule supports their future implementation.

### Theme manual verification checklist

- Visit home, new-job wizard, existing-job results/monitor, upload and clone pages in **light, dark and system** modes, under both `/en` and `/ar`.
- Hard-reload each mode with stored preferences and a fresh system preference. Confirm the first visible shell has the correct palette before hydration; test with Cache Components enabled and disabled.
- Toggle mid-flow and retain entered form values. Change the OS preference while using system mode; confirm explicit light/dark choices do not follow it. Check keyboard focus and pressed states on all three controls.
- Inspect recommendation badges, the candidate drawer, sticky table headers/row hover, filters, progress bars, forms, validation/action errors, empty states and skeletons. Exercise upload idle, hover, drag, uploading, disabled and error states using representative files.
- Check narrow viewports, RTL drawer position, unmirrored theme icons, long Arabic text, native inputs, autofill, selection, scrollbars and reduced motion.
- Open print preview while dark mode is active and check any report/exam content remains light. Open generated Excel and DOCX files in their target applications; verify document styling is independent of the web theme.
