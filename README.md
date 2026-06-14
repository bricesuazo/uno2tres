# uno2tres 🎓

A dramatic **grade revealer** for college classes. Upload a roster, share a
link, and let students reveal their grades one suspenseful drumroll at a time.
Grades are plain numbers — if a number matches a Philippine grade you've given a
message to, that message shows on reveal; otherwise it's just the number.

## How it works

| Route                | Who      | What                                                                                                             |
| -------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `/`                  | Anyone   | Witty landing page. Create a room (name, optional slug, password).                                               |
| `/<room_slug>`       | Students | Enter your student number → drumroll → grade reveal (message only if the grade has one).                         |
| `/<room_slug>/admin` | Owner    | Password-gated. Upload a CSV/Excel, edit grades inline, customize the per-grade reveal message + emoji, publish. |

- The **admin password** you set when creating a room gates the admin page and
  every grade-editing action. It's stored salted + SHA‑256 hashed in Convex and
  never sent back to the browser.
- Files are **parsed in the browser** (CSV via PapaParse, Excel via SheetJS),
  shown for review, then saved to Convex when you hit **Save**.
- Students can only ever look up **their own** number — the full roster is never
  exposed to the public reveal page.
- The **reveal message + emoji** for each grade can be customized per room (admin
  page → "Reveal messages"). Leave a field blank to show nothing for that grade.
  An **unrecognized grade** just shows the number — no message, emoji, or remark.

## Tech stack

- **Vite + React 19 + TypeScript**
- **TanStack Router** — type-safe, code-based route tree ([`src/router.tsx`](src/router.tsx))
- **Convex** — database + serverless functions (queries / mutations / actions)
- **Tailwind CSS v4** + shadcn-style components built on **Base UI** (not Radix)
- **sonner** (toasts), **lucide-react** (icons)

## Getting started

```bash
pnpm install

# Terminal 1 — Convex backend (watches convex/ and regenerates types)
pnpm dev:backend     # = npx convex dev

# Terminal 2 — Vite frontend
pnpm dev
```

`npx convex dev` writes `VITE_CONVEX_URL` into `.env.local`, which the frontend
reads on boot. If that variable is missing you'll see a "Backend not connected"
screen telling you to run it.

> This repo is already linked to a Convex dev deployment (see `.env.local`).
> A demo room **`smoke-test`** (password `secret123`) is seeded — visit
> `/smoke-test` and reveal `202012345` for a `1.00`. 🎉

### Build

```bash
pnpm build      # tsc -b && vite build
pnpm preview    # serve the production build
```

## File format

Two columns: a **student number** and a **grade**. Headers are auto-detected
(anything containing "student"/"number"/"id" and "grade"); if there's no
recognizable header, the first column is treated as the number and the second as
the grade. See [`sample-grades.csv`](./sample-grades.csv) — or download a
**sample CSV / Excel template** straight from the admin upload screen.

```csv
student number,grade
202012341,1.00
202012342,3.00
202012343,5.00
```

Rows with invalid grades or missing numbers are flagged in the admin UI and
skipped on save.

## Grades

Grades are **free numeric** — type any number (uploaded or entered manually).
The reveal shows the number as-is. If the number matches a Philippine grade with
a configured message (`1.00`–`3.00` in `0.25` steps, `4.00`, `5.00`), that
message + emoji + remark show too; any other number just shows the number.

## Project layout

```
convex/
  schema.ts          rooms + grades tables
  rooms.ts           create / getBySlug / verify  (password hashing in actions)
  grades.ts          reveal (public) / listForAdmin / save  (password-gated)
  lib/               slug + password helpers
src/
  router.tsx         TanStack Router route tree (/, /$slug, /$slug/admin)
  routes/            Landing.tsx · Room.tsx · Admin.tsx
  components/         Brand, CreateRoomDialog, GradeScale, ui/*
  lib/               grading.ts · parse.ts · title.ts · session.ts
```
