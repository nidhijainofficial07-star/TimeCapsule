// In-memory archive store backed by the storage adapter.
import { useSyncExternalStore } from "react";
import type { DB } from "@/lib/types";
import { DEFAULT_PREFERENCES } from "@/lib/constants";
import { archiveStorage } from "./storage";
import { stripSample } from "@/data/sample";
import { queueCloudSave } from "./cloudSyncQueue";

const COLLECTIONS = [
  "projects", "features", "bugs", "improvements", "ideas", "resources", "versions",
  "sessions", "notes", "inbox", "snapshots", "activity",
] as const;

export function emptyDB(): DB {
  return {
    version: 1,
    projects: [], features: [], bugs: [], improvements: [], ideas: [], resources: [],
    versions: [], sessions: [], notes: [], inbox: [], snapshots: [], activity: [],
    preferences: structuredClone(DEFAULT_PREFERENCES),
  };
}

/** Fill missing collections/preferences so older or partial data never crashes the UI. */
export function normalizeDB(input: unknown): DB {
  const base = emptyDB();
  if (!input || typeof input !== "object") return base;
  const src = input as Record<string, unknown>;
  for (const c of COLLECTIONS) {
    if (Array.isArray(src[c])) (base as unknown as Record<string, unknown>)[c] = src[c];
  }
  const prefs = (src.preferences ?? {}) as Record<string, unknown>;
  base.preferences = { ...base.preferences, ...prefs } as DB["preferences"];
  const widgets = Array.isArray(base.preferences.widgets)
  ? base.preferences.widgets
  : structuredClone(DEFAULT_PREFERENCES.widgets);

const ids = new Set(widgets.map((w) => w.id));

for (const w of DEFAULT_PREFERENCES.widgets) {
  if (!ids.has(w.id)) {
    widgets.push({ ...w });
  }
}

base.preferences.widgets = widgets;
  return base;
}

let state: DB | null = null;
let loadIssue: string | null = null;
const EMPTY = emptyDB();
const listeners = new Set<() => void>();

export function getDB(): DB {
  if (state) return state;
  if (typeof window === "undefined") return EMPTY;

  const { db, error } = archiveStorage.read();
  loadIssue = error ?? null;

  if (db) {
    const normalized = normalizeDB(db);
    state = stripSample(normalized);

    // Save the cleaned archive without demo records.
    if (JSON.stringify(state) !== JSON.stringify(normalized)) {
      try {
        archiveStorage.write(state);
      } catch {
        loadIssue = "Could not save the cleaned archive.";
      }
    }
  } else {
    // Start with a clean, empty personal archive.
    state = emptyDB();

    try {
      archiveStorage.write(state);
    } catch {
    }
  }

  return state;
}

export function getLoadIssue() {
  getDB();
  return loadIssue;
}

/** Apply a change. Persists first; if saving fails the change is discarded and an error is thrown. */
/** Apply a change and save it locally and to the cloud. */
export function mutate(fn: (draft: DB) => void): DB {
  const next = structuredClone(getDB());

  fn(next);

  // Save locally first.
  archiveStorage.write(next);

  // Update in-memory state.
  state = next;
  listeners.forEach((l) => l());

  // Queue cloud synchronization.
  queueCloudSave(next);

  return next;
}


/** Permanently delete a project and all records belonging to it. */
export function deleteProject(projectId: string): boolean {
  if (!getDB().projects.some((p) => p.id === projectId)) {
    return false;
  }

  mutate((draft) => {
    draft.projects = draft.projects.filter((p) => p.id !== projectId);

    draft.features = draft.features.filter((r) => r.projectId !== projectId);
    draft.bugs = draft.bugs.filter((r) => r.projectId !== projectId);
    draft.improvements = draft.improvements.filter((r) => r.projectId !== projectId);
    draft.ideas = draft.ideas.filter((r) => r.projectId !== projectId);
    draft.resources = draft.resources.filter((r) => r.projectId !== projectId);
    draft.versions = draft.versions.filter((r) => r.projectId !== projectId);
    draft.sessions = draft.sessions.filter((r) => r.projectId !== projectId);
    draft.notes = draft.notes.filter((r) => r.projectId !== projectId);
    draft.snapshots = draft.snapshots.filter((r) => r.projectId !== projectId);

    // Remove only activity belonging to this project.
    draft.activity = draft.activity.filter(
      (r) => r.projectId !== projectId
    );
  });

  return true;
}


export function replaceDB(
  next: DB,
  options?: { persist?: boolean },
) {
  if (options?.persist !== false) {
    archiveStorage.write(next);
  }

  state = next;
  listeners.forEach((l) => l());

  if (options?.persist !== false) {
    queueCloudSave(next);
  }
}

export function resetDB() {
  state = emptyDB();
  listeners.forEach((l) => l());
}

/** Test helper: reset in-memory state. */
export function __setDBForTests(db: DB | null) {
  state = db;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useDB(): DB {
  return useSyncExternalStore(subscribe, getDB, () => EMPTY);
}
