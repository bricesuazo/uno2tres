import { v, ConvexError } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { slugify } from "./lib/slug";
import { hashPassword, verifyPassword } from "./lib/password";

/** Public room info — never exposes salt/hash. */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_slug", (q) => q.eq("slug", slug.toLowerCase()))
      .unique();
    if (!room) return null;
    const count = (
      await ctx.db
        .query("grades")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect()
    ).length;
    return {
      name: room.name,
      slug: room.slug,
      gradeCount: count,
      createdAt: room._creationTime,
      messages: room.messages ?? null,
    };
  },
});

/** Internal: full room doc including credentials, for server-side checks. */
export const _bySlug = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("rooms")
      .withIndex("by_slug", (q) => q.eq("slug", slug.toLowerCase()))
      .unique();
  },
});

/** Internal: insert with atomic slug-uniqueness resolution. */
export const _insert = internalMutation({
  args: {
    name: v.string(),
    baseSlug: v.string(),
    salt: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, { name, baseSlug, salt, passwordHash }) => {
    let slug = baseSlug;
    let n = 2;
    // Resolve collisions deterministically inside the transaction.
    while (
      await ctx.db
        .query("rooms")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique()
    ) {
      slug = `${baseSlug}-${n++}`;
    }
    await ctx.db.insert("rooms", { name, slug, salt, passwordHash });
    return slug;
  },
});

/** Create a room. Returns the final (possibly de-duplicated) slug. */
export const create = action({
  args: {
    name: v.string(),
    slug: v.optional(v.string()),
    password: v.string(),
  },
  handler: async (ctx, { name, slug, password }): Promise<{ slug: string }> => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      throw new ConvexError("Give your room a name (at least 2 characters).");
    }
    if (password.length < 4) {
      throw new ConvexError("Password must be at least 4 characters.");
    }

    const baseSlug = slugify(slug && slug.trim() ? slug : trimmedName);
    if (!baseSlug) {
      throw new ConvexError(
        "Couldn't build a link from that name — try a custom slug with letters or numbers.",
      );
    }

    const { salt, passwordHash } = await hashPassword(password);
    const finalSlug: string = await ctx.runMutation(internal.rooms._insert, {
      name: trimmedName,
      baseSlug,
      salt,
      passwordHash,
    });
    return { slug: finalSlug };
  },
});

/** Check a room password (used to gate the admin page). */
export const verify = action({
  args: { slug: v.string(), password: v.string() },
  handler: async (ctx, { slug, password }): Promise<boolean> => {
    const room = await ctx.runQuery(internal.rooms._bySlug, { slug });
    if (!room) return false;
    return await verifyPassword(password, room.salt, room.passwordHash);
  },
});

export const _rename = internalMutation({
  args: { roomId: v.id("rooms"), name: v.string() },
  handler: async (ctx, { roomId, name }) => {
    await ctx.db.patch(roomId, { name });
  },
});

/** Admin: rename a room (the slug is permanent and never changes). */
export const rename = action({
  args: { slug: v.string(), password: v.string(), name: v.string() },
  handler: async (ctx, { slug, password, name }): Promise<void> => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      throw new ConvexError("Room name must be at least 2 characters.");
    }
    const room = await ctx.runQuery(internal.rooms._bySlug, { slug });
    if (!room) throw new ConvexError("Room not found.");
    const ok = await verifyPassword(password, room.salt, room.passwordHash);
    if (!ok) throw new ConvexError("Wrong password.");
    await ctx.runMutation(internal.rooms._rename, { roomId: room._id, name: trimmed });
  },
});

const VALID_GRADE_LABELS = new Set(
  [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 4.0, 5.0].map((g) =>
    g.toFixed(2),
  ),
);

const messagesValidator = v.record(
  v.string(),
  v.object({ message: v.string(), emoji: v.string() }),
);

export const _setMessages = internalMutation({
  args: { roomId: v.id("rooms"), messages: messagesValidator },
  handler: async (ctx, { roomId, messages }) => {
    await ctx.db.patch(roomId, { messages });
  },
});

/** Admin: save per-grade reveal messages/emojis (password-gated). */
export const setMessages = action({
  args: {
    slug: v.string(),
    password: v.string(),
    messages: messagesValidator,
  },
  handler: async (ctx, { slug, password, messages }): Promise<void> => {
    const room = await ctx.runQuery(internal.rooms._bySlug, { slug });
    if (!room) throw new ConvexError("Room not found.");
    const ok = await verifyPassword(password, room.salt, room.passwordHash);
    if (!ok) throw new ConvexError("Wrong password.");

    const cleaned: Record<string, { message: string; emoji: string }> = {};
    for (const [label, value] of Object.entries(messages)) {
      if (!VALID_GRADE_LABELS.has(label)) {
        throw new ConvexError(`Unexpected grade "${label}".`);
      }
      cleaned[label] = {
        message: value.message.trim(),
        emoji: value.emoji.trim(),
      };
    }

    await ctx.runMutation(internal.rooms._setMessages, {
      roomId: room._id,
      messages: cleaned,
    });
  },
});
