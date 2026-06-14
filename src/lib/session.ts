// Remembers a verified room password for the current tab so admins don't
// have to re-type it after creating a room or refreshing the admin page.
const key = (slug: string) => `uno2tres:pw:${slug.toLowerCase()}`;

export function rememberRoomPassword(slug: string, password: string) {
  try {
    sessionStorage.setItem(key(slug), password);
  } catch {
    /* sessionStorage unavailable — no-op */
  }
}

export function getRememberedPassword(slug: string): string | null {
  try {
    return sessionStorage.getItem(key(slug));
  } catch {
    return null;
  }
}

export function forgetRoomPassword(slug: string) {
  try {
    sessionStorage.removeItem(key(slug));
  } catch {
    /* no-op */
  }
}

// One-shot "you just created this room" flag, consumed on first read so it
// doesn't replay when the admin refreshes the page.
const createdKey = (slug: string) => `uno2tres:justcreated:${slug.toLowerCase()}`;

export function markJustCreated(slug: string) {
  try {
    sessionStorage.setItem(createdKey(slug), "1");
  } catch {
    /* no-op */
  }
}

export function consumeJustCreated(slug: string): boolean {
  try {
    if (sessionStorage.getItem(createdKey(slug))) {
      sessionStorage.removeItem(createdKey(slug));
      return true;
    }
  } catch {
    /* no-op */
  }
  return false;
}
