import Papa from "papaparse";
import { roundToQuarter } from "./grading";

export type ParsedEntry = { studentNumber: string; grade: number };

export type InvalidRow = {
  row: number;
  studentNumber: string;
  rawGrade: string;
  reason: string;
};

export type ParseResult = {
  entries: ParsedEntry[];
  invalid: InvalidRow[];
  /** total non-empty data rows considered */
  total: number;
};

const STUDENT_HEADER = /student|^sr.?code$|^id(\s*(no|number))?$|^no\.?$|number/i;
const GRADE_HEADER = /grade|remark|final|score|rating/i;

async function fileToRows(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  const isCsv =
    name.endsWith(".csv") ||
    file.type === "text/csv" ||
    file.type === "application/csv";

  if (isCsv) {
    const text = await file.text();
    const res = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
    return (res.data as unknown as string[][]).map((r) =>
      r.map((c) => (c == null ? "" : String(c))),
    );
  }

  // SheetJS is heavy and only needed for Excel — load it on demand.
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: false,
    defval: "",
    blankrows: false,
  });
  return rows.map((r) => r.map((c) => (c == null ? "" : String(c))));
}

function detectColumns(
  header: string[],
): { sn: number; grade: number; hasHeader: boolean } {
  let sn = -1;
  let grade = -1;
  header.forEach((cell, i) => {
    const k = cell.trim();
    if (sn < 0 && STUDENT_HEADER.test(k)) sn = i;
    if (grade < 0 && GRADE_HEADER.test(k)) grade = i;
  });
  if (sn >= 0 && grade >= 0) return { sn, grade, hasHeader: true };
  // No recognizable header → assume column 0 = student number, column 1 = grade.
  return { sn: 0, grade: 1, hasHeader: false };
}

export async function parseGradeFile(file: File): Promise<ParseResult> {
  const rows = (await fileToRows(file)).filter((r) =>
    r.some((c) => c.trim() !== ""),
  );

  if (rows.length === 0) {
    return { entries: [], invalid: [], total: 0 };
  }

  const { sn, grade, hasHeader } = detectColumns(rows[0]);
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const entries: ParsedEntry[] = [];
  const invalid: InvalidRow[] = [];
  const seen = new Set<string>();

  dataRows.forEach((cells, idx) => {
    const rowNum = idx + 1 + (hasHeader ? 1 : 0);
    const studentNumber = (cells[sn] ?? "").trim().replace(/\s+/g, "");
    const rawGrade = (cells[grade] ?? "").trim();

    if (!studentNumber && !rawGrade) return; // skip blank

    if (!studentNumber) {
      invalid.push({
        row: rowNum,
        studentNumber,
        rawGrade,
        reason: "Missing student number",
      });
      return;
    }

    const parsed = Number(rawGrade.replace(",", "."));
    if (rawGrade === "" || Number.isNaN(parsed)) {
      invalid.push({
        row: rowNum,
        studentNumber,
        rawGrade,
        reason: "Grade is not a number",
      });
      return;
    }

    // grades are free numeric — any finite number is accepted
    const g = roundToQuarter(parsed);

    if (seen.has(studentNumber)) {
      // last one wins — replace the earlier entry
      const existing = entries.find((e) => e.studentNumber === studentNumber);
      if (existing) existing.grade = g;
      return;
    }
    seen.add(studentNumber);
    entries.push({ studentNumber, grade: g });
  });

  return { entries, invalid, total: dataRows.length };
}
