
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

  // Serialize initialization so two accounts cannot initialize concurrently.
  if (initializationPromise) {
    try {
      await initializationPromise;
    } catch {
      // A previous initialization may have failed or become stale.
    }

    return initializeArchiveForCurrentUser();
  }

  const task = (async () => {
    archiveStorage.setUser(user.id);

    // Load only the archive belonging to this authenticated user.
    const cloudData = await cloudArchive.load(user.id);

    // Verify that the account has not changed during the request.
    const { data: latest, error: latestError } =
      await supabase.auth.getUser();

    if (latestError) throw latestError;

    if (latest.user?.id !== user.id) {
      throw new Error("Account changed during archive initialization.");
    }

    const archive = cloudData
      ? normalizeDB(cloudData)
      : emptyDB();

    replaceDB(archive, { persist: false });

    archiveStorage.write(archive);

    if (!cloudData) {
      await cloudArchive.save(archive, user.id);
    }

    // Verify again before marking initialization complete.
    const { data: finalAuth, error: finalError } =
      await supabase.auth.getUser();

    if (finalError) throw finalError;

    if (finalAuth.user?.id !== user.id) {
      throw new Error("Account changed during archive initialization.");
    }

    initializedUserId = user.id;
  })();

  initializationPromise = task;

  try {
    await task;
  } finally {
    if (initializationPromise === task) {
      initializationPromise = null;
    }
  }
}

export function resetArchiveSync() {
  initializedUserId = null;
  initializationPromise = null;
  archiveStorage.setUser(null);
  resetDB();
}
