import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GRADE_TEXT } from "@/lib/gradeColors";
import {
  VALID_GRADES,
  defaultGradeOverride,
  formatGrade,
  gradeInfo,
  roundToQuarter,
} from "@/lib/grading";
import { parseGradeFile, type InvalidRow } from "@/lib/parse";
import { downloadSampleCsv, downloadSampleXlsx } from "@/lib/sample";
import {
  consumeJustCreated,
  forgetRoomPassword,
  getRememberedPassword,
  rememberRoomPassword,
} from "@/lib/session";
import { useDocumentTitle } from "@/lib/title";
import { cn, errMsg } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useAction, useQuery } from "convex/react";
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Loader2,
  Lock,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// grade is held as a string while editing so free numeric entry works cleanly
type Row = { id: string; studentNumber: string; grade: string };

function newId() {
  return crypto.randomUUID();
}

export default function Admin() {
  const { slug = "" } = useParams({ strict: false });
  const navigate = useNavigate();
  const room = useQuery(api.rooms.getBySlug, { slug });

  useDocumentTitle(
    room === undefined
      ? "Admin"
      : room === null
      ? "Room not found"
      : `Admin · ${room.name}`
  );

  const verify = useAction(api.rooms.verify);

  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);

  // Try to auto-unlock with a password remembered this session.
  const [autoTried, setAutoTried] = useState(false);
  useEffect(() => {
    if (autoTried || unlocked) return;
    const remembered = getRememberedPassword(slug);
    if (!remembered) {
      setAutoTried(true);
      return;
    }
    void (async () => {
      try {
        const ok = await verify({ slug, password: remembered });
        if (ok) {
          setPassword(remembered);
          setUnlocked(true);
        } else {
          forgetRoomPassword(slug);
        }
      } finally {
        setAutoTried(true);
      }
    })();
  }, [slug, verify, autoTried, unlocked]);

  if (room === null)
    return <AdminMissing onHome={() => navigate({ to: "/" })} />;

  return (
    <div className="min-h-dvh bg-dots">
      <header className="border-b bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <Brand className="text-xl" as="link" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
            <Lock className="size-3" /> admin
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        {room === undefined || !autoTried ? (
          <div className="flex justify-center py-24">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : !unlocked ? (
          <PasswordGate
            roomName={room.name}
            value={password}
            onChange={setPassword}
            onUnlock={async (pw) => {
              const ok = await verify({ slug, password: pw });
              if (ok) {
                rememberRoomPassword(slug, pw);
                setPassword(pw);
                setUnlocked(true);
              }
              return ok;
            }}
          />
        ) : (
          <RosterEditor
            slug={slug}
            roomName={room.name}
            password={password}
            messages={room.messages ?? null}
            onLock={() => {
              forgetRoomPassword(slug);
              setUnlocked(false);
              setPassword("");
            }}
          />
        )}
      </main>
    </div>
  );
}

function PasswordGate({
  roomName,
  value,
  onChange,
  onUnlock,
}: {
  roomName: string;
  value: string;
  onChange: (v: string) => void;
  onUnlock: (pw: string) => Promise<boolean>;
}) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!value) return;
    setChecking(true);
    setError(null);
    try {
      const ok = await onUnlock(value);
      if (!ok) setError("Wrong password. Try again.");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border bg-card p-8 shadow-sm">
      <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Lock className="size-6" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">Admin access</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter the password for{" "}
        <span className="font-semibold text-foreground">{roomName}</span> to
        manage its grades.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="mt-6 grid gap-3"
      >
        <div className="grid gap-2">
          <Label htmlFor="pw">Room password</Label>
          <Input
            id="pw"
            type="password"
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        {error && (
          <p className="text-sm font-medium text-destructive">{error}</p>
        )}
        <Button type="submit" disabled={checking || !value}>
          {checking && <Loader2 className="size-4 animate-spin" />}
          {checking ? "Checking…" : "Unlock"}
        </Button>
      </form>
    </div>
  );
}

type GradeMessages = Record<string, { message: string; emoji: string }>;

type MsgRow = {
  grade: number;
  label: string;
  emoji: string;
  message: string;
  remark: string;
};

// Seed editor rows from saved overrides, falling back to code defaults.
// A saved override of "" is preserved (means "show nothing").
function buildMsgRows(messages: GradeMessages | null): MsgRow[] {
  return VALID_GRADES.map((g) => {
    const label = formatGrade(g);
    const def = defaultGradeOverride(g);
    const ov = messages?.[label];
    return {
      grade: g,
      label,
      emoji: ov?.emoji ?? def.emoji,
      message: ov?.message ?? def.message,
      remark: gradeInfo(g).remark,
    };
  });
}

function RosterEditor({
  slug,
  roomName,
  password,
  messages,
  onLock,
}: {
  slug: string;
  roomName: string;
  password: string;
  messages: GradeMessages | null;
  onLock: () => void;
}) {
  const listForAdmin = useAction(api.grades.listForAdmin);
  const save = useAction(api.grades.save);
  const setMessages = useAction(api.rooms.setMessages);
  const rename = useAction(api.rooms.rename);
  const fileInput = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invalid, setInvalid] = useState<InvalidRow[]>([]);
  const [parsing, setParsing] = useState(false);

  // room-name editing (slug is permanent)
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(roomName);
  const [savingName, setSavingName] = useState(false);

  async function handleRename() {
    const next = nameDraft.trim();
    if (next.length < 2) {
      toast.error("Name must be at least 2 characters.");
      return;
    }
    if (next === roomName) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      await rename({ slug, password, name: next });
      setEditingName(false);
      toast.success("Room renamed ✏️");
    } catch (e) {
      toast.error(errMsg(e, "Couldn't rename the room."));
    } finally {
      setSavingName(false);
    }
  }

  // per-grade reveal messages, seeded from saved overrides or defaults
  const [msgRows, setMsgRows] = useState<MsgRow[]>(() =>
    buildMsgRows(messages)
  );
  const [msgDirty, setMsgDirty] = useState(false);
  const [savingMsgs, setSavingMsgs] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

  function updateMsg(label: string, patch: Partial<MsgRow>) {
    setMsgRows((rs) =>
      rs.map((r) => (r.label === label ? { ...r, ...patch } : r))
    );
    setMsgDirty(true);
  }

  function resetMessages() {
    setMsgRows(buildMsgRows(null));
    setMsgDirty(true);
  }

  async function handleSaveMessages() {
    const map: GradeMessages = {};
    for (const r of msgRows) {
      map[r.label] = { message: r.message, emoji: r.emoji };
    }
    setSavingMsgs(true);
    try {
      await setMessages({ slug, password, messages: map });
      setMsgDirty(false);
      toast.success("Reveal messages saved ✨", {
        description: "Empty fields will show nothing for that grade.",
      });
    } catch (e) {
      toast.error(errMsg(e, "Couldn't save messages."));
    } finally {
      setSavingMsgs(false);
    }
  }

  // load existing roster once
  useEffect(() => {
    void (async () => {
      try {
        const existing = (await listForAdmin({ slug, password })) as Array<{
          studentNumber: string;
          grade: number;
        }>;
        setRows(
          existing.map((e) => ({
            id: newId(),
            studentNumber: e.studentNumber,
            grade: formatGrade(e.grade),
          }))
        );
      } catch (e) {
        toast.error(errMsg(e, "Couldn't load the roster."));
      } finally {
        setLoaded(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // welcome the freshly-created room — consumed once so it doesn't replay on refresh
  useEffect(() => {
    if (consumeJustCreated(slug)) {
      toast.success("Room created! 🎉", {
        description: "Upload a file or add students, then share your link.",
      });
    }
  }, [slug]);

  const shareUrl = `${window.location.origin}/${slug}`;

  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    try {
      const result = await parseGradeFile(file);
      setRows(
        result.entries.map((e) => ({
          id: newId(),
          studentNumber: e.studentNumber,
          grade: formatGrade(e.grade),
        }))
      );
      setInvalid(result.invalid);
      setDirty(true);
      if (result.entries.length === 0 && result.invalid.length === 0) {
        toast.error("No rows found in that file.");
      } else {
        toast.success(`Parsed ${result.entries.length} grades`, {
          description:
            result.invalid.length > 0
              ? `${result.invalid.length} row(s) need a look — see below.`
              : "Review, then hit Save to publish.",
        });
      }
    } catch {
      toast.error("Couldn't read that file. Use a .csv or .xlsx.");
    } finally {
      setParsing(false);
    }
  }, []);

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setDirty(true);
  }

  function removeRow(id: string) {
    setRows((rs) => rs.filter((r) => r.id !== id));
    setDirty(true);
  }

  function addRow() {
    setRows((rs) => [...rs, { id: newId(), studentNumber: "", grade: "" }]);
    setDirty(true);
  }

  async function handleSave() {
    const entries: { studentNumber: string; grade: number }[] = [];
    let skipped = 0;
    for (const r of rows) {
      const sn = r.studentNumber.trim().replace(/\s+/g, "");
      if (!sn) continue; // missing number → silently skipped (already flagged)
      const g = roundToQuarter(Number(r.grade));
      if (r.grade.trim() === "" || !Number.isFinite(g)) {
        skipped++;
        continue;
      }
      entries.push({ studentNumber: sn, grade: g });
    }

    const dupes =
      entries.length - new Set(entries.map((e) => e.studentNumber)).size;
    setSaving(true);
    try {
      const count = await save({ slug, password, entries });
      setDirty(false);
      const notes: string[] = [];
      if (dupes > 0) notes.push(`${dupes} duplicate number(s) merged`);
      if (skipped > 0)
        notes.push(`${skipped} row(s) with an invalid grade skipped`);
      toast.success(`Saved ${count} grade${count === 1 ? "" : "s"} ✅`, {
        description: notes.length
          ? notes.join(" · ")
          : "Students can reveal them now.",
      });
    } catch (e) {
      toast.error(errMsg(e, "Save failed."));
    } finally {
      setSaving(false);
    }
  }

  const emptyStudentNumbers = useMemo(
    () => rows.filter((r) => !r.studentNumber.trim()).length,
    [rows]
  );

  const invalidGradeRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.studentNumber.trim() &&
          (r.grade.trim() === "" || !Number.isFinite(Number(r.grade)))
      ).length,
    [rows]
  );

  return (
    <div className="grid gap-6">
      {/* heading + share */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {editingName ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleRename();
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                autoFocus
                maxLength={80}
                className="h-9 text-lg font-bold"
              />
              <Button
                type="submit"
                size="icon"
                className="size-9 shrink-0"
                disabled={savingName}
              >
                {savingName ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-9 shrink-0"
                onClick={() => setEditingName(false)}
              >
                <X className="size-4" />
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-2xl font-extrabold tracking-tight">
                {roomName}
              </h1>
              <Button
                size="icon"
                variant="ghost"
                className="size-8 shrink-0 text-muted-foreground"
                aria-label="Rename room"
                onClick={() => {
                  setNameDraft(roomName);
                  setEditingName(true);
                }}
              >
                <Pencil className="size-4" />
              </Button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {rows.length} student{rows.length === 1 ? "" : "s"} ·{" "}
            <span className="font-mono">/{slug}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(shareUrl, "_blank")}
          >
            <ExternalLink className="size-4" />
            View student page
          </Button>
          <Button variant="ghost" size="sm" onClick={onLock}>
            <LogOut className="size-4" />
            Lock
          </Button>
        </div>
      </div>

      <ShareBar url={shareUrl} />

      {/* upload */}
      <div className="grid gap-2">
        <UploadZone
          parsing={parsing}
          onPick={() => fileInput.current?.click()}
          onFile={handleFile}
        />
        <input
          ref={fileInput}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
        <p className="text-center text-xs text-muted-foreground">
          New here? Grab a template:{" "}
          <button
            type="button"
            onClick={downloadSampleCsv}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            sample CSV
          </button>{" "}
          ·{" "}
          <button
            type="button"
            onClick={() =>
              void downloadSampleXlsx().catch(() =>
                toast.error("Couldn't build the Excel template.")
              )
            }
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Excel template
          </button>
        </p>
      </div>

      {invalid.length > 0 && <InvalidRows rows={invalid} />}

      {/* roster table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">Grades</h2>
          <Button variant="secondary" size="sm" onClick={addRow}>
            <Plus className="size-4" />
            Add student
          </Button>
        </div>

        {!loaded ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-muted-foreground">
            No grades yet. Upload a file or add students manually.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[55%]">Student number</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Input
                      value={row.studentNumber}
                      onChange={(e) =>
                        updateRow(row.id, { studentNumber: e.target.value })
                      }
                      placeholder="202012345"
                      className={cn(
                        "h-9",
                        !row.studentNumber.trim() &&
                          "border-grade-warn/60 bg-grade-warn/5"
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.grade}
                      onChange={(e) =>
                        updateRow(row.id, { grade: e.target.value })
                      }
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v === "") return;
                        const n = Number(v);
                        if (!Number.isFinite(n)) return;
                        const formatted = formatGrade(roundToQuarter(n));
                        if (formatted !== row.grade)
                          updateRow(row.id, { grade: formatted });
                      }}
                      inputMode="decimal"
                      placeholder="e.g. 1.00"
                      aria-label="Grade"
                      className={cn(
                        "h-9 w-28 text-center tabular-nums",
                        row.grade.trim() !== "" &&
                          !Number.isFinite(Number(row.grade)) &&
                          "border-grade-warn/60 bg-grade-warn/5"
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 text-muted-foreground hover:text-destructive"
                      onClick={() => removeRow(row.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* reveal message editor */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <button
          type="button"
          onClick={() => setShowMessages((s) => !s)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40"
        >
          <div>
            <h2 className="font-semibold">Reveal messages</h2>
            <p className="text-xs text-muted-foreground">
              Customize the message &amp; emoji per grade. Leave a field empty
              to show nothing.
            </p>
          </div>
          <ChevronDown
            className={cn(
              "size-5 shrink-0 text-muted-foreground transition-transform",
              showMessages && "rotate-180"
            )}
          />
        </button>

        {showMessages && (
          <div className="border-t">
            <div className="grid gap-2 p-4">
              {msgRows.map((r) => (
                <div
                  key={r.label}
                  className="grid grid-cols-[2.75rem_3rem_1fr] items-center gap-2 sm:grid-cols-[3.5rem_3.5rem_1fr]"
                >
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      GRADE_TEXT[gradeInfo(r.grade).color]
                    )}
                  >
                    {r.label}
                  </span>
                  <Input
                    value={r.emoji}
                    onChange={(e) =>
                      updateMsg(r.label, { emoji: e.target.value })
                    }
                    placeholder="—"
                    maxLength={12}
                    aria-label={`Emoji for ${r.label}`}
                    className="h-9 px-1 text-center text-lg"
                  />
                  <Input
                    value={r.message}
                    onChange={(e) =>
                      updateMsg(r.label, { message: e.target.value })
                    }
                    placeholder={`(no message for ${r.label})`}
                    maxLength={160}
                    aria-label={`Message for ${r.label}`}
                    className="h-9"
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
              <Button variant="ghost" size="sm" onClick={resetMessages}>
                <RotateCcw className="size-4" />
                Reset to defaults
              </Button>
              <Button
                size="sm"
                onClick={handleSaveMessages}
                disabled={savingMsgs || !msgDirty}
              >
                {savingMsgs ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {savingMsgs ? "Saving…" : "Save messages"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* sticky save bar */}
      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-xl border bg-card/90 px-4 py-3 shadow-lg backdrop-blur">
        <p className="text-sm text-muted-foreground">
          {(emptyStudentNumbers > 0 || invalidGradeRows > 0) && (
            <span className="font-medium text-grade-warn">
              {[
                emptyStudentNumbers > 0 &&
                  `${emptyStudentNumbers} missing number`,
                invalidGradeRows > 0 && `${invalidGradeRows} invalid grade`,
              ]
                .filter(Boolean)
                .join(", ")}{" "}
              row(s) will be skipped.{" "}
            </span>
          )}
          {dirty ? "Unsaved changes." : "All changes saved."}
        </p>
        <Button onClick={handleSave} disabled={saving || !dirty}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {saving ? "Saving…" : "Save grades"}
        </Button>
      </div>
    </div>
  );
}

function ShareBar({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy — copy it manually.");
    }
  }
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-primary/5 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Share with students
        </p>
        <p className="truncate font-mono text-sm">{url}</p>
      </div>
      <Button variant="outline" size="sm" onClick={copy}>
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

function UploadZone({
  parsing,
  onPick,
  onFile,
}: {
  parsing: boolean;
  onPick: () => void;
  onFile: (f: File) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <button
      type="button"
      onClick={onPick}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-card px-6 py-10 text-center transition-colors",
        over
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-secondary/40"
      )}
    >
      {parsing ? (
        <Loader2 className="size-7 animate-spin text-primary" />
      ) : (
        <Upload className="size-7 text-primary" />
      )}
      <p className="font-semibold">
        {parsing ? "Reading your file…" : "Upload CSV or Excel"}
      </p>
      <p className="max-w-md text-sm text-muted-foreground">
        Two columns: <span className="font-medium">student number</span> and{" "}
        <span className="font-medium">grade</span>. Drag &amp; drop or click to
        browse. Parsed locally — replaces the list below.
      </p>
    </button>
  );
}

function InvalidRows({ rows }: { rows: InvalidRow[] }) {
  return (
    <div className="rounded-xl border border-grade-warn/40 bg-grade-warn/5 p-4">
      <div className="flex items-center gap-2 font-semibold text-grade-warn">
        <TriangleAlert className="size-4" />
        {rows.length} row(s) couldn't be imported
      </div>
      <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
        {rows.slice(0, 8).map((r, i) => (
          <li key={i}>
            Row {r.row}: {r.studentNumber || "(no number)"} —{" "}
            <span className="font-medium">{r.rawGrade || "(blank)"}</span> ·{" "}
            {r.reason}
          </li>
        ))}
        {rows.length > 8 && <li>…and {rows.length - 8} more.</li>}
      </ul>
    </div>
  );
}

function AdminMissing({ onHome }: { onHome: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-dots px-5 text-center">
      <div className="text-6xl">🕳️</div>
      <h1 className="text-3xl font-extrabold">No such room</h1>
      <p className="max-w-sm text-muted-foreground">
        This admin page points to a room that doesn't exist.
      </p>
      <Button onClick={onHome}>Go home</Button>
    </div>
  );
}
