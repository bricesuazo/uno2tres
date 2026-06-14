import { v, ConvexError } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { verifyPassword } from "./lib/password";

function normalizeStudentNumber(input: string): string {
  return input.trim().replace(/\s+/g, "");
}

/**
 * Public reveal — a student looks up *only their own* grade.
 * Returns the single matching grade, never the whole roster.
 */
export const reveal = query({
  args: { slug: v.string(), studentNumber: v.string() },
  handler: async (ctx, { slug, studentNumber }) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_slug", (q) => q.eq("slug", slug.toLowerCase()))
      .unique();
    if (!room) return { status: "no-room" as const };

    const sn = normalizeStudentNumber(studentNumber);
    if (!sn) return { status: "not-found" as const };

    const entry = await ctx.db
      .query("grades")
      .withIndex("by_room_student", (q) =>
        q.eq("roomId", room._id).eq("studentNumber", sn),
      )
      .first();

    if (!entry) return { status: "not-found" as const };
    return { status: "found" as const, grade: entry.grade };
  },
});

/** Internal: full roster for a room. */
export const _listByRoom = internalQuery({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const rows = await ctx.db
      .query("grades")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    return rows.map((r) => ({
      studentNumber: r.studentNumber,
      grade: r.grade,
    }));
  },
});

/** Internal: replace the entire roster for a room in one transaction. */
export const _replaceAll = internalMutation({
  args: {
    roomId: v.id("rooms"),
    entries: v.array(
      v.object({ studentNumber: v.string(), grade: v.number() }),
    ),
  },
  handler: async (ctx, { roomId, entries }) => {
    const existing = await ctx.db
      .query("grades")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .collect();
    for (const row of existing) await ctx.db.delete(row._id);

    // de-dupe by student number, last write wins
    const seen = new Map<string, number>();
    for (const e of entries) {
      const sn = normalizeStudentNumber(e.studentNumber);
      if (sn) seen.set(sn, e.grade);
    }
    for (const [studentNumber, grade] of seen) {
      await ctx.db.insert("grades", { roomId, studentNumber, grade });
    }
    return seen.size;
  },
});

/** Admin: load the current roster (password-gated). */
export const listForAdmin = action({
  args: { slug: v.string(), password: v.string() },
  handler: async (
    ctx,
    { slug, password },
  ): Promise<Array<{ studentNumber: string; grade: number }>> => {
    const room = await ctx.runQuery(internal.rooms._bySlug, { slug });
    if (!room) throw new ConvexError("Room not found.");
    const ok = await verifyPassword(password, room.salt, room.passwordHash);
    if (!ok) throw new ConvexError("Wrong password.");
    return await ctx.runQuery(internal.grades._listByRoom, {
      roomId: room._id,
    });
  },
});

/** Admin: save the roster (password-gated). */
export const save = action({
  args: {
    slug: v.string(),
    password: v.string(),
    entries: v.array(
      v.object({ studentNumber: v.string(), grade: v.number() }),
    ),
  },
  handler: async (ctx, { slug, password, entries }): Promise<number> => {
    const room = await ctx.runQuery(internal.rooms._bySlug, { slug });
    if (!room) throw new ConvexError("Room not found.");
    const ok = await verifyPassword(password, room.salt, room.passwordHash);
    if (!ok) throw new ConvexError("Wrong password.");

    for (const e of entries) {
      if (!Number.isFinite(e.grade)) {
        throw new ConvexError(`"${e.grade}" isn't a valid number.`);
      }
    }

    return await ctx.runMutation(internal.grades._replaceAll, {
      roomId: room._id,
      entries,
    });
  },
});
