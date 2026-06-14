// Philippine college grading system (1.00 best → 5.00 fail).
// Valid grades: 1.00–3.00 in 0.25 steps, plus 4.00 (conditional) and 5.00 (failed).

export type GradeTier =
  | "great"
  | "good"
  | "pass"
  | "conditional"
  | "failed"
  | "unknown";

/** Per-grade override an admin can set for a room. Empty string = show nothing. */
export type GradeOverride = { message: string; emoji: string };

export type GradeInfo = {
  grade: number;
  /** e.g. "1.00" */
  label: string;
  /** official-ish remark */
  remark: string;
  /** funny one-liner shown on reveal */
  message: string;
  tier: GradeTier;
  passed: boolean;
  emoji: string;
  /** tailwind color token (see index.css) */
  color: string;
};

export const VALID_GRADES = [
  1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 4.0, 5.0,
] as const;

const VALID_SET = new Set<number>(VALID_GRADES);

export function formatGrade(grade: number): string {
  return grade.toFixed(2);
}

export function roundToQuarter(n: number): number {
  return Math.round(n * 100) / 100;
}

export function isValidGrade(grade: number): boolean {
  return VALID_SET.has(roundToQuarter(grade));
}

const TABLE: Record<string, Omit<GradeInfo, "grade" | "label">> = {
  "1.00": {
    remark: "Excellent",
    message: "A perfect 1.00. Save some genius for the rest of us. 🐐",
    tier: "great",
    passed: true,
    emoji: "🏆",
    color: "grade-great",
  },
  "1.25": {
    remark: "Excellent",
    message: "So close to a 1.00 it's basically a rounding error. 🔥",
    tier: "great",
    passed: true,
    emoji: "✨",
    color: "grade-great",
  },
  "1.50": {
    remark: "Very Good",
    message: "Dean's lister energy. Certified academic weapon. 📚",
    tier: "great",
    passed: true,
    emoji: "🎯",
    color: "grade-great",
  },
  "1.75": {
    remark: "Very Good",
    message: "You ate and left absolutely zero crumbs. 😎",
    tier: "great",
    passed: true,
    emoji: "💫",
    color: "grade-good",
  },
  "2.00": {
    remark: "Good",
    message: "Solid work. Your parents are telling the neighbors. 🙌",
    tier: "good",
    passed: true,
    emoji: "👏",
    color: "grade-good",
  },
  "2.25": {
    remark: "Good",
    message: "Respectable. We move with our heads held high. 👍",
    tier: "good",
    passed: true,
    emoji: "🙂",
    color: "grade-good",
  },
  "2.50": {
    remark: "Satisfactory",
    message: "The 'I survived' grade. Take the W and run. 😅",
    tier: "good",
    passed: true,
    emoji: "😮‍💨",
    color: "grade-ok",
  },
  "2.75": {
    remark: "Passing",
    message: "We don't ask how. We simply celebrate. 🎉",
    tier: "pass",
    passed: true,
    emoji: "🥳",
    color: "grade-ok",
  },
  "3.00": {
    remark: "Lowest passing",
    message: "PASSED IS PASSED. Do not perceive the decimals. 😤",
    tier: "pass",
    passed: true,
    emoji: "😤",
    color: "grade-ok",
  },
  "4.00": {
    remark: "Conditional",
    message:
      "Conditional — your redemption arc starts now. Ace that removal exam. 😬",
    tier: "conditional",
    passed: false,
    emoji: "🫣",
    color: "grade-warn",
  },
  "5.00": {
    remark: "Failed / Retake",
    message: "5.00. Enroll again — next time we lock in fr. 💀 (it's okay!)",
    tier: "failed",
    passed: false,
    emoji: "💀",
    color: "grade-bad",
  },
};

// Unrecognized grade → show just the number, no message/emoji/remark/confetti.
const UNKNOWN: Omit<GradeInfo, "grade" | "label"> = {
  remark: "",
  message: "",
  tier: "unknown",
  passed: false,
  emoji: "",
  color: "grade-neutral",
};

/**
 * Resolve the display info for a grade. Pass a room `override` to replace the
 * default message/emoji — an override field of `""` deliberately shows nothing.
 */
export function gradeInfo(grade: number, override?: GradeOverride): GradeInfo {
  const rounded = roundToQuarter(grade);
  const label = formatGrade(rounded);
  const base = TABLE[label];
  if (!base) return { grade: rounded, label, ...UNKNOWN };

  const info: GradeInfo = { grade: rounded, label, ...base };
  if (override) {
    info.message = override.message;
    info.emoji = override.emoji;
  }
  return info;
}

/** Default message/emoji for a grade (used to seed the admin editor). */
export function defaultGradeOverride(grade: number): GradeOverride {
  const base = TABLE[formatGrade(roundToQuarter(grade))];
  return { message: base?.message ?? "", emoji: base?.emoji ?? "" };
}
