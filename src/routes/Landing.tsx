import { useState } from "react";
import {
  ArrowRight,
  Eye,
  PartyPopper,
  Share2,
  Sparkles,
  Upload,
} from "lucide-react";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { GradeScale } from "@/components/GradeScale";
import { CreateRoomDialog } from "@/components/CreateRoomDialog";
import { useDocumentTitle } from "@/lib/title";

const STEPS = [
  {
    icon: Upload,
    title: "Drop the file",
    body: "Upload a CSV or Excel sheet with student numbers and grades. We parse it right in your browser — nothing leaves until you say so.",
  },
  {
    icon: Share2,
    title: "Share the link",
    body: "Send your room link to the class. One link, infinite anxiety. Beautiful.",
  },
  {
    icon: Eye,
    title: "Let them reveal",
    body: "Students punch in their number and brace themselves. Drumroll, suspense, then the big number drops.",
  },
];

export default function Landing() {
  const [open, setOpen] = useState(false);
  useDocumentTitle("Reveal grades, dramatically");

  return (
    <div className="relative min-h-dvh overflow-hidden bg-dots">
      {/* gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 size-[28rem] rounded-full bg-primary/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-40 size-[24rem] rounded-full bg-accent/40 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-5">
        {/* nav */}
        <header className="flex items-center justify-between py-6">
          <Brand className="text-2xl" as="link" />
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Create a room
          </Button>
        </header>

        {/* hero */}
        <main className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card/70 px-4 py-1.5 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur">
            <Sparkles className="size-4 text-primary" />
            Grade reveals, but make it a moment
          </span>

          <h1 className="max-w-4xl text-balance text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            Reveal grades the
            <span className="relative mx-2 inline-block">
              <span className="relative z-10 text-primary">dramatic</span>
              <span className="absolute inset-x-0 bottom-1.5 -z-0 h-3 -rotate-1 bg-accent/70" />
            </span>
            way.
          </h1>

          <p className="mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
            <Brand className="text-base" /> turns your grade sheet into a
            suspenseful, drumroll-worthy reveal. From a glorious{" "}
            <span className="font-semibold text-grade-great">1.00</span> to a
            character-building{" "}
            <span className="font-semibold text-grade-bad">5.00</span> — every
            student gets their main-character moment.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
            <Button size="lg" className="group" onClick={() => setOpen(true)}>
              <PartyPopper className="size-5" />
              Create a reveal room
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <a
              href="#how"
              className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              or see how it works ↓
            </a>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Free. No sign-up. Just a little bit of cruelty.
          </p>
        </main>

        {/* how it works */}
        <section id="how" className="scroll-mt-8 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight">
            Three steps to glory (or doom)
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="group relative rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 inline-flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="size-5" />
                </div>
                <span className="absolute right-5 top-5 text-4xl font-black text-secondary">
                  {i + 1}
                </span>
                <h3 className="text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* grade scale */}
        <section className="pb-20">
          <div className="rounded-2xl border bg-card/70 p-8 shadow-sm backdrop-blur">
            <h2 className="text-center text-2xl font-bold tracking-tight">
              The 🇵🇭 grading system, decoded
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
              1.00 is the dream, 3.00 still passes, 4.00 means a removal exam,
              and 5.00 means… see you next semester.
            </p>
            <GradeScale className="mt-7" />
          </div>
        </section>

        <footer className="mt-auto border-t py-6 text-center text-sm text-muted-foreground">
          Built with questionable kindness · <Brand className="text-sm" />
        </footer>
      </div>

      <CreateRoomDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
