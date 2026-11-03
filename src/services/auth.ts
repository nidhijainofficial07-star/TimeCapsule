
import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";

export interface MockSession {
  email: string;
  displayName: string;
  signedInAt: string;
}

type Listener = () => void;

const listeners = new Set<Listener>();

let cache: MockSession | null = null;
let ready = false;

function notify() {
  listeners.forEach((listener) => listener());
}

function toSession(user: {
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
  user_metadata?: Record<string, unknown>;
} | null): MockSession | null {
  if (!user?.email) return null;

  const displayName =
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : user.email.split("@")[0];

  return {
    email: user.email,
    displayName,
    signedInAt: user.last_sign_in_at ?? user.created_at ?? new Date().toISOString(),
  };
}

// Restore the Supabase session and listen for login/logout changes.
if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((_event, session) => {
    cache = toSession(session?.user ?? null);
    ready = true;
    notify();
  });

  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error("Session restoration failed:", error);
    }

    cache = toSession(data.session?.user ?? null);
    ready = true;
    notify();
  });
}
export const auth = {
  get: () => cache,

  async signIn(
    email: string,
    password: string,
    _remember: boolean,
  ): Promise<MockSession> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) throw error;

    const session = toSession(data.user);
    if (!session) throw new Error("Could not load your account.");

    cache = session;
    ready = true;
    notify();

    return session;
  },

  async signUp(
    email: string,
    password: string,
    displayName: string,
  ) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: displayName.trim(),
        },
      },
    });

    if (error) throw error;

    if (data.session) {
      cache = toSession(data.user);
      ready = true;
      notify();
    }

    return {
      needsEmailConfirmation: !data.session,
    };
  },

  async resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim(),
    {
      redirectTo: `${window.location.origin}/reset-password`,
    },
  );

  if (error) throw error;
},

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    cache = null;
    notify();
  },

  async updateName(displayName: string) {
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: displayName.trim() },
    });

    if (error) throw error;

    cache = toSession(data.user);
    notify();
  },
};

export function useSession() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => cache,
    () => null,
  );
}

export function useAuthReady() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => ready,
    () => false,
  );
}