// Tailwind class lookups keyed by the color token in grading.ts.
// Kept here (not in grading.ts) so the grading logic stays framework-free.

export const GRADE_CHIP: Record<string, string> = {
  "grade-great": "bg-grade-great/15 text-grade-great border-grade-great/30",
  "grade-good": "bg-grade-good/15 text-grade-good border-grade-good/30",
  "grade-ok": "bg-grade-ok/15 text-grade-ok border-grade-ok/30",
  "grade-warn": "bg-grade-warn/15 text-grade-warn border-grade-warn/30",
  "grade-bad": "bg-grade-bad/15 text-grade-bad border-grade-bad/30",
};

export const GRADE_TEXT: Record<string, string> = {
  "grade-great": "text-grade-great",
  "grade-good": "text-grade-good",
  "grade-ok": "text-grade-ok",
  "grade-warn": "text-grade-warn",
  "grade-bad": "text-grade-bad",
};

export const GRADE_GLOW: Record<string, string> = {
  "grade-great": "bg-grade-great/20",
  "grade-good": "bg-grade-good/20",
  "grade-ok": "bg-grade-ok/20",
  "grade-warn": "bg-grade-warn/20",
  "grade-bad": "bg-grade-bad/20",
};
