// Autosaving local drafts for long forms. Drafts live only in this browser.
import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { kv } from "@/services/storage";

const PREFIX = "timecapsule.draft.";

export interface DraftState<T> {
  values: T;
  setValues: (updater: T | ((prev: T) => T)) => void;
  dirty: boolean;
  savedAt: string | null;
  saveError: string | null;
  recovered: { values: T; savedAt: string } | null;
  restore: () => void;
  discard: () => void;
  clear: () => void;
  markClean: () => void;
}

/**
 * @param key unique key, e.g. "bugs:new:<projectId>" or "bugs:<id>"
 * @param initial starting values
 * @param enabled set false to disable (e.g. dialog closed)
 */
export function useDraft<T>(key: string, initial: T, enabled = true): DraftState<T> {
  const storageKey = PREFIX + key;
  const [values, setValuesRaw] = useState<T>(initial);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [recovered, setRecovered] = useState<{ values: T; savedAt: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    setValuesRaw(initial);
    setDirty(false);
    setSavedAt(null);
    const found = kv.get<{ values: T; savedAt: string } | null>(storageKey, null);
    setRecovered(found && found.values ? found : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, enabled]);

  const setValues = useCallback((u: T | ((prev: T) => T)) => {
    setValuesRaw((prev) => (typeof u === "function" ? (u as (p: T) => T)(prev) : u));
    setDirty(true);
  }, []);

  useEffect(() => {
    if (!enabled || !dirty) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        const at = new Date().toISOString();
        kv.set(storageKey, { values, savedAt: at });
        setSavedAt(at);
        setSaveError(null);
      } catch {
        setSaveError("Draft could not be saved in this browser.");
      }
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [values, dirty, enabled, storageKey]);

  return {
    values, setValues, dirty, savedAt, saveError, recovered,
    restore: () => {
      if (recovered) {
        setValuesRaw(recovered.values);
        setDirty(true);
        setRecovered(null);
      }
    },
    discard: () => {
      kv.remove(storageKey);
      setRecovered(null);
    },
    clear: () => {
      kv.remove(storageKey);
      setDirty(false);
      setSavedAt(null);
      setRecovered(null);
    },
    markClean: () => setDirty(false),
  };
}

export function listDrafts() {
  return kv.keys(PREFIX).map((k) => ({ key: k.slice(PREFIX.length), ...kv.get<{ savedAt: string }>(k, { savedAt: "" }) }));
}
export function discardAllDrafts() {
  kv.keys(PREFIX).forEach((k) => kv.remove(k));
}

/** Warn before leaving (tab close and in-app navigation) when there are unsaved changes. */
export function useUnsavedGuard(dirty: boolean) {
  useBlocker({
    shouldBlockFn: () => {
      if (!dirty) return false;
      return !window.confirm("You have unsaved changes. Your draft is kept in this browser, but the record isn't saved yet. Leave anyway?");
    },
    enableBeforeUnload: dirty,
  });
}
