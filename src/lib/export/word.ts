import { exportTranslator, salaryText } from "@/i18n/export";
import type { Locale } from "@/i18n/routing";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import type { Rubric } from "@/lib/schemas/rubric";
import type { RankedCandidate } from "@/lib/schemas/screening";
import { HEADER_FILL, displayValue } from "@/lib/export/format";

const COLS = [
  "Rank",
  "Candidate",
  "Score",
  "Current title",
  "Experience",
  "Suggested salary",
] as const;

function cell(text: string, header = false, locale: Locale = "en"): TableCell {
  return new TableCell({
    width: { size: 16, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.TOP,
    shading: header
      ? { type: ShadingType.CLEAR, fill: HEADER_FILL }
      : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: locale === "ar" ? AlignmentType.RIGHT : AlignmentType.LEFT,
        bidirectional: locale === "ar",
        children: [
          new TextRun({
            text,
            font: "Arial",
            size: header ? 20 : 18,
            bold: header,
            color: header ? "FFFFFF" : "1F1F1F",
          }),
        ],
      }),
    ],
  });
}

function headerRow(locale: Locale): TableRow {
  const {label} = exportTranslator(locale);
  return new TableRow({
    tableHeader: true,
    children: COLS.map((text) => cell(label(text), true, locale)),
  });
}

function uniqueJoin(values: string[]): string {
  return [...new Set(values.filter((item) => item.trim().length > 0))].join(" / ");
}

export async function buildUnifiedSummaryDocx(input: {
  locale?: Locale;
  jobs: Array<{
    title: string;
    rubric: Rubric;
    top15: RankedCandidate[];
    scoredCount: number;
  }>;
}): Promise<Buffer> {
  const locale = input.locale ?? "en";
  const {t,label} = exportTranslator(locale);
  const scopes = uniqueJoin(input.jobs.map((job) => job.rubric.geographicScope));
  const types = uniqueJoin(input.jobs.map((job) => job.rubric.employmentType));
  const levels = uniqueJoin(input.jobs.map((job) => job.rubric.seniorityLevel));

  const children: Array<Paragraph | Table> = [
    new Paragraph({
      bidirectional: locale === "ar",
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      children: [
        new TextRun({
          text: label("Unified screening summary — United Arab Emirates"),
          font: "Arial",
          bold: true,
          size: 36,
        }),
      ],
    }),
    new Paragraph({
      alignment: locale === "ar" ? AlignmentType.RIGHT : AlignmentType.LEFT,
      bidirectional: locale === "ar",
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: t("export.metadata", {location:scopes||label("Not stated"),employment:types||label("Not stated"),seniority:levels||label("Not stated")}),
          font: "Arial",
          size: 22,
        }),
      ],
    }),
  ];

  for (const job of input.jobs) {
    children.push(
      new Paragraph({
        alignment: locale === "ar" ? AlignmentType.RIGHT : AlignmentType.LEFT,
      bidirectional: locale === "ar",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: t("export.job_title_count", {title:job.title,count:job.scoredCount}),
            font: "Arial",
            bold: true,
            size: 28,
          }),
        ],
      }),
    );

    children.push(
      new Table({
        visuallyRightToLeft: locale === "ar",
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          headerRow(locale),
          ...job.top15.map(
            (row, index) =>
              new TableRow({
                children: [
                  cell(String(index + 1), false, locale),
                  cell(displayValue(row.name), false, locale),
                  cell(row.totalScore === null ? label("Not stated") : String(row.totalScore), false, locale),
                  cell(displayValue(row.currentTitle), false, locale),
                  cell(displayValue(row.totalExperienceText), false, locale),
                  cell(salaryText(row.suggestedSalary, locale), false, locale),
                ],
              }),
          ),
        ],
      }),
    );
  }

  children.push(
    new Paragraph({
      alignment: locale === "ar" ? AlignmentType.RIGHT : AlignmentType.LEFT,
      bidirectional: locale === "ar",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360 },
      children: [
        new TextRun({
          text: label("Notice"),
          font: "Arial",
          bold: true,
          size: 28,
        }),
      ],
    }),
    new Paragraph({
      alignment: locale === "ar" ? AlignmentType.RIGHT : AlignmentType.LEFT,
      bidirectional: locale === "ar",
      children: [
        new TextRun({
          text: label("These are initial ranking results from CVs only. Open each job’s Excel file for contact details, gaps, evidence, and interview questions."),
          font: "Arial",
          size: 22,
        }),
      ],
    }),
  );

  const document = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial" },
          paragraph: { alignment: AlignmentType.LEFT },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
              width: 16838,
              height: 11906,
            },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(document);
  return Buffer.from(buffer);
}
