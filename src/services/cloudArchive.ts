
import type { DB } from "@/lib/types";
import { supabase } from "@/lib/supabase";

export const cloudArchive = {
  // Load the logged-in user's archive from Supabase.
  async load(): Promise<DB | null> {
    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError) throw userError;

    const user = userData.user;

    if (!user) {
      throw new Error("You must be logged in to load your archive.");
    }

    const { data, error } = await supabase
      .from("user_archives")
      .select("data")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    return data ? (data.data as DB) : null;
  },

  // Save or update the logged-in user's complete archive.
  async save(archive: DB, expectedUserId?: string): Promise<void> {
    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError) throw userError;

    const user = userData.user;
    if (expectedUserId && user?.id !== expectedUserId) {
  throw new Error("Account changed. Archive was not uploaded.");
}

    if (!user) {
      throw new Error("You must be logged in to save your archive.");
    }

    const { error } = await supabase
      .from("user_archives")
      .upsert(
        {
          user_id: user.id,
          data: archive,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      );

    if (error) throw error;
  },
};
