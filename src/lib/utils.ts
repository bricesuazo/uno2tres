import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ConvexError } from "convex/values";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Pull a friendly message out of a Convex error (or fall back). */
export function errMsg(e: unknown, fallback = "Something went wrong. Try again."): string {
  if (e instanceof ConvexError) return String(e.data);
  return fallback;
}
