
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/tc/AppShell";
import { QuickCaptureProvider } from "@/components/tc/QuickCapture";
import { Logo } from "@/components/tc/common";
import { useAuthReady, useSession } from "@/services/auth";
import {
  initializeArchiveForCurrentUser,
  resetArchiveSync,
} from "@/services/archiveSync";

export const Route = createFileRoute("/_workspace")({
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const session = useSession();
  const authReady = useAuthReady();
  const navigate = useNavigate();

  const [archiveReady, setArchiveReady] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!authReady) return;

    if (!session) {
      resetArchiveSync();
      setArchiveReady(false);
      navigate({ to: "/login", replace: true });
      return;
    }

    setArchiveReady(false);
    setArchiveError(null);

    initializeArchiveForCurrentUser()
      .then(() => {
        if (!cancelled) setArchiveReady(true);
      })
      .catch((error: unknown) => {
        console.error("Archive initialization failed:", error);

        if (!cancelled) {
          setArchiveError(
            error instanceof Error
              ? error.message
              : "Could not load your cloud archive.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, session, navigate, retryCount]);

  if (!authReady || !session || (!archiveReady && !archiveError)) {
    return (
      <div
        className="grid min-h-screen place-items-center bg-background"
        aria-busy="true"
      >
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Logo size={44} className="animate-pulse" />
          <span className="text-sm">Opening your archive…</span>
        </div>
      </div>
    );
  }

  if (archiveError) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <Logo size={44} />
          <h2 className="text-lg font-semibold">
            Couldn't open your archive
          </h2>
          <p className="text-sm text-muted-foreground">
            {archiveError}
          </p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="rounded-md bg-primary px-5 py-2 text-primary-foreground"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <QuickCaptureProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </QuickCaptureProvider>
  );
}
