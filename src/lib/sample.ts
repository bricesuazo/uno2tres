// Single source of truth for the downloadable upload template, offered in the
// admin UI so people format their files correctly. Mirrors sample-grades.csv.

const HEADER = ["student number", "grade"] as const;

const ROWS: Array<[string, number]> = [
  ["202012341", 1.0],
  ["202012342", 1.25],
  ["202012343", 1.5],
  ["202012344", 1.75],
  ["202012345", 2.0],
  ["202012346", 2.25],
  ["202012347", 2.5],
  ["202012348", 2.75],
  ["202012349", 3.0],
  ["202012340", 4.0],
  ["202012341", 5.0],
];

const FILENAME = "uno2tres-sample-grades";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadSampleCsv() {
  const lines = [
    HEADER.join(","),
    ...ROWS.map(([sn, grade]) => `${sn},${grade.toFixed(2)}`),
  ];
  const blob = new Blob([lines.join("\n") + "\n"], {
    type: "text/csv;charset=utf-8",
  });
  triggerDownload(blob, `${FILENAME}.csv`);
}

export async function downloadSampleXlsx() {
  // SheetJS is heavy and lazy-loaded — only pulled when someone asks for it.
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([
    [...HEADER],
    ...ROWS.map(([sn, grade]) => [sn, grade]),
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Grades");
  XLSX.writeFile(wb, `${FILENAME}.xlsx`);
}
