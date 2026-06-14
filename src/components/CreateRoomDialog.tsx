import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAction } from "convex/react";
import { Loader2, PartyPopper } from "lucide-react";
import { api } from "@convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/slug";
import { errMsg } from "@/lib/utils";
import { markJustCreated, rememberRoomPassword } from "@/lib/session";

export function CreateRoomDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const createRoom = useAction(api.rooms.create);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = slugify(slug || name) || "your-room";

  async function handleSubmit() {
    setError(null);
    if (name.trim().length < 2) return setError("Your room needs a name.");
    if (password.length < 4)
      return setError("Password must be at least 4 characters.");

    setSubmitting(true);
    try {
      const { slug: finalSlug } = await createRoom({
        name: name.trim(),
        slug: slug.trim() || undefined,
        password,
      });
      rememberRoomPassword(finalSlug, password);
      markJustCreated(finalSlug);
      onOpenChange(false);
      navigate({ to: "/$slug/admin", params: { slug: finalSlug } });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="size-5 text-primary" />
            Spin up a reveal room
          </DialogTitle>
          <DialogDescription>
            Name it, lock it, then drop the grades. Students get the suspense —
            you get the receipts.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          className="grid gap-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="room-name">
              Room name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="room-name"
              autoFocus
              placeholder="CS 101 — Finals of Doom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="room-slug">Custom link (optional)</Label>
            <Input
              id="room-slug"
              placeholder="cs101-finals"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              maxLength={48}
            />
            <p className="truncate text-xs text-muted-foreground">
              Your link:{" "}
              <span className="font-medium text-foreground">/{preview}</span>
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="room-password">
              Admin password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="room-password"
              type="password"
              placeholder="something only you know"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              You'll need this to upload &amp; edit grades. No recovery — don't
              forget it!
            </p>
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? "Creating…" : "Create room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
