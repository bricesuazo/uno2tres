import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    name: v.string(),
    slug: v.string(),
    // salted SHA-256 of the room password — never sent to the client
    salt: v.string(),
    passwordHash: v.string(),
    // per-grade reveal customization, keyed by grade label ("1.00", "5.00", …).
    // An empty message/emoji string means "show nothing" for that grade.
    messages: v.optional(
      v.record(
        v.string(),
        v.object({ message: v.string(), emoji: v.string() }),
      ),
    ),
  }).index("by_slug", ["slug"]),

  grades: defineTable({
    roomId: v.id("rooms"),
    studentNumber: v.string(),
    grade: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_room_student", ["roomId", "studentNumber"]),
});
