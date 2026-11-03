
import { supabase } from "@/lib/supabase";
import { archiveStorage } from "./storage";
import { cloudArchive } from "./cloudArchive";
import { emptyDB, normalizeDB, replaceDB, resetDB } from "./db";

let initializedUserId: string | null = null;
let initializationPromise: Promise<void> | null = null;

export async function initializeArchiveForCurrentUser(): Promise<void> {
  const { data, error } = await supabase.auth.getUser();

  if (error) throw error;

  const user = data.user;

  if (!user) {
    throw new Error("No authenticated user found.");
  }

  if (initializedUserId === user.id) return;

  if (initializationPromise) {
    await initializationPromise;

    if (initializedUserId === user.id) return;
  }

  initializationPromise = (async () => {
    archiveStorage.setUser(user.id);

    // Always load the cloud archive first.
    const cloudData = await cloudArchive.load();

    // Never use another account's local archive as a fallback.
    const archive = cloudData
      ? normalizeDB(cloudData)
      : emptyDB();

    // Update memory without triggering another persistence operation.
    replaceDB(archive, { persist: false });

    // Store a separate local cache for this account.
    archiveStorage.write(archive);

    // Create the first cloud archive for a new account.
    if (!cloudData) {
      await cloudArchive.save(archive);
    }

    initializedUserId = user.id;
  })();

  try {
    await initializationPromise;
  } finally {
    initializationPromise = null;
  }
}

export function resetArchiveSync() {
  initializedUserId = null;
  initializationPromise = null;
  archiveStorage.setUser(null);
  resetDB();
}