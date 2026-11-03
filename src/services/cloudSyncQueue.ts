
import { useSyncExternalStore } from "react";
import type { DB } from "@/lib/types";
import { archiveStorage } from "./storage";
import { cloudArchive } from "./cloudArchive";

export type CloudSyncStatus =
  | "idle"
  | "syncing"
  | "saved"
  | "failed";

interface SyncState {
  status: CloudSyncStatus;
  error: string | null;
  lastSyncedAt: string | null;
}

interface PendingSave {
  snapshot: DB;
  userId: string;
}

const initialState: SyncState = {
  status: "idle",
  error: null,
  lastSyncedAt: null,
};

let syncState: SyncState = initialState;
let pendingSave: PendingSave | null = null;
let workerRunning = false;

const listeners = new Set<() => void>();

function updateStatus(next: SyncState) {
  syncState = next;
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function saveWithRetry(
  snapshot: DB,
  userId: string,
): Promise<void> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await cloudArchive.save(snapshot, userId);
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      console.warn(
        `Cloud save attempt ${attempt} failed. Retrying...`,
        error,
      );

      await wait(attempt * 1000);
    }
  }
}

async function processSaveQueue() {
  if (workerRunning) return;

  workerRunning = true;

  try {
    while (pendingSave) {
      const current = pendingSave;
      pendingSave = null;

      try {
        await saveWithRetry(
          current.snapshot,
          current.userId,
        );

        if (!pendingSave) {
          updateStatus({
            status: "saved",
            error: null,
            lastSyncedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        // If a newer archive is waiting, upload that instead.
        if (pendingSave) {
          continue;
        }

        updateStatus({
          status: "failed",
          error:
            error instanceof Error
              ? error.message
              : "Cloud synchronization failed.",
          lastSyncedAt: syncState.lastSyncedAt,
        });
      }
    }
  } finally {
    workerRunning = false;

    // Handle a save that arrived just as the worker finished.
    if (pendingSave) {
      void processSaveQueue();
    }
  }
}

export function getCloudSyncStatus() {
  return syncState;
}

export function useCloudSyncStatus() {
  return useSyncExternalStore(
    subscribe,
    getCloudSyncStatus,
    () => initialState,
  );
}

export function queueCloudSave(archive: DB) {
  const userId = archiveStorage.getUserId();

  if (!userId) return;

  // Replace the waiting snapshot with the latest archive.
  pendingSave = {
    snapshot: structuredClone(archive),
    userId,
  };

  updateStatus({
    ...syncState,
    status: "syncing",
    error: null,
  });

  void processSaveQueue();
}
