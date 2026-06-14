import { VALID_GRADES, gradeInfo } from "@/lib/grading";
import { GRADE_CHIP } from "@/lib/gradeColors";
import { cn } from "@/lib/utils";

export function GradeScale({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap justify-center gap-2", className)}>
      {VALID_GRADES.map((g) => {
        const info = gradeInfo(g);
        return (
          <div
            key={g}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold shadow-sm",
              GRADE_CHIP[info.color],
            )}
            title={info.remark}
          >
            <span className="tabular-nums">{info.label}</span>
            <span className="text-xs font-medium opacity-80">
              {info.remark}
            </span>
          </div>
        );
      })}
    </div>
  );
}
