import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Brand({
  className,
  as = "span",
}: {
  className?: string;
  as?: "span" | "link";
}) {
  const content = (
    <span className={cn("font-extrabold tracking-tight", className)}>
      <span className="text-primary">uno</span>
      <span className="text-foreground">2</span>
      <span className="text-grade-great">tres</span>
    </span>
  );
  if (as === "link")
    return (
      <Link to="/" className="inline-flex transition-opacity hover:opacity-80">
        {content}
      </Link>
    );
  return content;
}
