
import type { DB } from "@/lib/types";

// Each account gets its own local archive cache.
const KEY_PREFIX = "timecapsule.archive.v1:";
const CORRUPT_KEY = "timecapsule.archive.corrupt-backup";

let activeUserId: string | null = null;

function getKey(): string {
  if (!activeUserId) {
    throw new Error("No active user is set for archive storage.");
  }

  return `${KEY_PREFIX}${activeUserId}`;
}

export interface ReadResult {
  db: unknown | null;
  error?: string;
}

export const archiveStorage = {
  setUser(userId: string | null) {
    activeUserId = userId;
  },
  getUserId(): string | null {
  return activeUserId;
},
  available(): boolean {
    try {
      return typeof window !== "undefined" && !!window.localStorage;
    } catch {
      return false;
    }
  },

  read(): ReadResult {
    if (!this.available() || !activeUserId) {
      return { db: null };
    }

    const raw = window.localStorage.getItem(getKey());
    if (!raw) return { db: null };

    try {
      return { db: JSON.parse(raw) };
    } catch {
      try {
        window.localStorage.setItem(CORRUPT_KEY, raw);
      } catch {
        // Ignore backup errors.
      }

      return {
        db: null,
        error: "Saved data could not be read. A fresh archive was started.",
      };
    }
  },

  write(db: DB) {
    if (!this.available()) {
      throw new Error("Browser storage is unavailable.");
    }

    window.localStorage.setItem(getKey(), JSON.stringify(db));
  },

  clear() {
    if (this.available() && activeUserId) {
      window.localStorage.removeItem(getKey());
    }
  },
};

/** Small key/value store for non-sensitive UI state (drafts, theme). */
export const kv = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },

  set(key: string, value: unknown) {
    window.localStorage.setItem(key, JSON.stringify(value));
  },

  remove(key: string) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore removal errors.
    }
  },

  keys(prefix: string): string[] {
    try {
      return Object.keys(window.localStorage).filter((key) =>
        key.startsWith(prefix),
      );
    } catch {
      return [];
    }
  },
};
