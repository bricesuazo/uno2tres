import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { celebrate } from "@/lib/confetti";
import { GRADE_GLOW, GRADE_TEXT } from "@/lib/gradeColors";
import {
  formatGrade,
  gradeInfo,
  roundToQuarter,
  type GradeInfo,
} from "@/lib/grading";
import { useDocumentTitle } from "@/lib/title";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useConvex, useQuery } from "convex/react";
import { Loader2, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "suspense" | "revealed" | "notfound";

const SUSPENSE_LINES = [
  "Consulting the registrar gods…",
  "Doing the math (again)…",
  "Building suspense…",
  "Manifesting a 1.00…",
  "Loading your fate…",
];

const NOT_FOUND_LINES = [
  "That number isn't on the list. Typo, or are you not enrolled? 👀",
  "Hmm, no grade found for that one. Double-check your student number.",
  "We searched everywhere. Nada. Try again? 🔍",
];

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function Room() {
  const { slug = "" } = useParams({ strict: false });
  const convex = useConvex();
  const room = useQuery(api.rooms.getBySlug, { slug });

  useDocumentTitle(
    room === undefined ? "" : room === null ? "Room not found" : room.name
  );

  const [studentNumber, setStudentNumber] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<GradeInfo | null>(null);
  const [suspenseLine, setSuspenseLine] = useState(SUSPENSE_LINES[0]);
  const notFoundLine = useRef(NOT_FOUND_LINES[0]);

  // rotate the suspense messages for flavor
  useEffect(() => {
    if (phase !== "suspense") return;
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % SUSPENSE_LINES.length;
      setSuspenseLine(SUSPENSE_LINES[i]);
    }, 550);
    return () => clearInterval(id);
  }, [phase]);

  async function reveal() {
    const sn = studentNumber.trim();
    if (!sn || phase === "suspense") return;
    setPhase("suspense");
    setSuspenseLine(SUSPENSE_LINES[0]);
    try {
      const [res] = await Promise.all([
        convex.query(api.grades.reveal, { slug, studentNumber: sn }),
        delay(1900),
      ]);
      if (res.status === "found" && res.grade !== undefined) {
        const label = formatGrade(roundToQuarter(res.grade));
        const override = room?.messages?.[label] ?? undefined;
        const info = gradeInfo(res.grade, override);
        setResult(info);
        setPhase("revealed");
        if (info.tier !== "unknown") celebrate(info.tier);
      } else {
        notFoundLine.current =
          NOT_FOUND_LINES[Math.floor(Math.random() * NOT_FOUND_LINES.length)];
        setPhase("notfound");
      }
    } catch {
      notFoundLine.current = "Something glitched. Try again in a sec.";
      setPhase("notfound");
    }
  }

  function reset() {
    setResult(null);
    setPhase("idle");
    setStudentNumber("");
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-dots">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 size-[34rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-6">
        <Brand className="text-xl" as="link" />
        <span className="text-sm text-muted-foreground">grade reveal</span>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-5 pb-16">
        {room === undefined ? (
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        ) : room === null ? (
          <RoomNotFound />
        ) : (
          <div className="w-full text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              You're entering
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
              {room.name}
            </h1>

            <div className="mt-10">
              {phase === "idle" && (
                <IdleForm
                  studentNumber={studentNumber}
                  setStudentNumber={setStudentNumber}
                  onReveal={reveal}
                />
              )}
              {phase === "suspense" && <Suspense line={suspenseLine} />}
              {phase === "revealed" && result && (
                <Revealed info={result} onReset={reset} />
              )}
              {phase === "notfound" && (
                <NotFound line={notFoundLine.current} onRetry={reset} />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function IdleForm({
  studentNumber,
  setStudentNumber,
  onReveal,
}: {
  studentNumber: string;
  setStudentNumber: (v: string) => void;
  onReveal: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onReveal();
      }}
      className="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm"
    >
      <div className="text-left">
        <label htmlFor="sn" className="text-sm font-medium text-foreground/90">
          Enter your student number
        </label>
        <Input
          id="sn"
          autoFocus
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 202012345"
          value={studentNumber}
          onChange={(e) => setStudentNumber(e.target.value)}
          className="mt-2 h-12 text-center text-lg tracking-wider"
        />
      </div>
      <Button type="submit" size="lg" disabled={!studentNumber.trim()}>
        <Sparkles className="size-5" />
        Reveal my grade
      </Button>
      <p className="text-xs text-muted-foreground">
        Deep breaths. You've got this. Probably.
      </p>
    </form>
  );
}

function Suspense({ line }: { line: string }) {
  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <div className="relative flex size-28 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <span className="absolute inset-0 rounded-full bg-primary/10" />
        <span className="animate-float text-5xl">🥁</span>
      </div>
      <p className="text-lg font-semibold text-foreground/90">{line}</p>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2.5 animate-bounce rounded-full bg-primary"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

function Revealed({ info, onReset }: { info: GradeInfo; onReset: () => void }) {
  return (
    <div className="animate-pop flex flex-col items-center gap-5">
      {info.emoji && <div className="text-6xl">{info.emoji}</div>}

      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Your grade is
      </p>

      <div className="relative">
        <span
          className={cn(
            "absolute inset-0 -z-10 scale-150 rounded-full blur-2xl",
            GRADE_GLOW[info.color]
          )}
        />
        <div
          className={cn(
            "text-8xl font-black tabular-nums tracking-tighter sm:text-9xl",
            GRADE_TEXT[info.color] ?? "text-foreground"
          )}
        >
          {info.label}
        </div>
      </div>

      {info.remark && (
        <div
          className={cn(
            "rounded-full border px-4 py-1 text-sm font-bold uppercase tracking-wide",
            GRADE_TEXT[info.color]
          )}
        >
          {info.remark}
        </div>
      )}

      {info.message && (
        <p className="max-w-sm text-pretty text-lg font-medium text-foreground/90">
          {info.message}
        </p>
      )}

      <Button variant="outline" onClick={onReset} className="mt-2">
        <RotateCcw className="size-4" />
        Reveal another
      </Button>
    </div>
  );
}

function NotFound({ line, onRetry }: { line: string; onRetry: () => void }) {
  return (
    <div className="animate-pop flex flex-col items-center gap-5">
      <div className="animate-wiggle text-6xl">🫥</div>
      <h2 className="text-2xl font-bold">Not on the list</h2>
      <p className="max-w-sm text-pretty text-muted-foreground">{line}</p>
      <Button variant="outline" onClick={onRetry}>
        <RotateCcw className="size-4" />
        Try again
      </Button>
    </div>
  );
}

function RoomNotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="text-6xl">🚪</div>
      <h1 className="text-3xl font-extrabold">This room doesn't exist</h1>
      <p className="max-w-sm text-muted-foreground">
        The link might be wrong, or the room was never created. Want to start
        your own?
      </p>
      <Button onClick={() => navigate({ to: "/" })}>Go home</Button>
    </div>
  );
}
