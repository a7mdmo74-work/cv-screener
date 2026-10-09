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

function cell(text: string, header = false): TableCell {
  return new TableCell({
    width: { size: 16, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.TOP,
    shading: header
      ? { type: ShadingType.CLEAR, fill: HEADER_FILL }
      : undefined,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
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

function headerRow(): TableRow {
  return new TableRow({
    tableHeader: true,
    children: COLS.map((label) => cell(label, true)),
  });
}

function uniqueJoin(values: string[]): string {
  return [...new Set(values.filter((item) => item.trim().length > 0))].join(" / ");
}

export async function buildUnifiedSummaryDocx(input: {
  jobs: Array<{
    title: string;
    rubric: Rubric;
    top15: RankedCandidate[];
    scoredCount: number;
  }>;
}): Promise<Buffer> {
  const first = input.jobs[0];
  const scopes = uniqueJoin(input.jobs.map((job) => job.rubric.geographicScope));
  const types = uniqueJoin(input.jobs.map((job) => job.rubric.employmentType));
  const levels = uniqueJoin(input.jobs.map((job) => job.rubric.seniorityLevel));

  const children: Array<Paragraph | Table> = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      children: [
        new TextRun({
          text: "Unified screening summary — United Arab Emirates",
          font: "Arial",
          bold: true,
          size: 36,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `Location: ${scopes || displayValue(first?.rubric.geographicScope)} | Employment: ${types || displayValue(first?.rubric.employmentType)} | Seniority: ${levels || displayValue(first?.rubric.seniorityLevel)}`,
          font: "Arial",
          size: 22,
        }),
      ],
    }),
  ];

  for (const job of input.jobs) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: `${job.title} (${job.scoredCount} candidates)`,
            font: "Arial",
            bold: true,
            size: 28,
          }),
        ],
      }),
    );

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          headerRow(),
          ...job.top15.map(
            (row, index) =>
              new TableRow({
                children: [
                  cell(String(index + 1)),
                  cell(displayValue(row.name)),
                  cell(row.totalScore === null ? displayValue(null) : String(row.totalScore)),
                  cell(displayValue(row.currentTitle)),
                  cell(displayValue(row.totalExperienceText)),
                  cell(displayValue(row.suggestedSalary)),
                ],
              }),
          ),
        ],
      }),
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360 },
      children: [
        new TextRun({
          text: "Notice",
          font: "Arial",
          bold: true,
          size: 28,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: "These are initial ranking results from CVs only. Open each job’s Excel file for contact details, gaps, evidence, and interview questions.",
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
