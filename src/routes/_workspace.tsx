
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/tc/AppShell";
import { QuickCaptureProvider } from "@/components/tc/QuickCapture";
import { Logo } from "@/components/tc/common";
import { useAuthReady, useSession } from "@/services/auth";
import { initializeArchiveForCurrentUser } from "@/services/archiveSync";

export const Route = createFileRoute("/_workspace")({
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const session = useSession();
  const authReady = useAuthReady();
  const navigate = useNavigate();

  const [archiveReady, setArchiveReady] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!authReady || !session) {
      setArchiveReady(false);
      setArchiveError(null);
      return;
    }

    setArchiveReady(false);
    setArchiveError(null);

    initializeArchiveForCurrentUser()
      .then(() => {
        if (!cancelled) setArchiveReady(true);
      })
      .catch((error) => {
        if (!cancelled) {
          setArchiveError(
            error instanceof Error
              ? error.message
              : "Could not initialize your archive.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authReady, session, navigate]);

  useEffect(() => {
    if (authReady && !session) {
      navigate({ to: "/login", replace: true });
    }
  }, [authReady, session, navigate]);

  if (!authReady || !session || !archiveReady) {
    return (
      <div
        className="grid min-h-screen place-items-center bg-background"
        aria-busy="true"
      >
        <div className="flex max-w-md flex-col items-center gap-3 px-5 text-center text-muted-foreground">
          <Logo size={44} className="animate-pulse" />

          <span className="text-sm">
            {!authReady || !session
              ? "Opening your archive…"
              : archiveError
                ? "Archive initialization failed."
                : "Loading your cloud archive…"}
          </span>

          {archiveError && (
            <>
              <p className="text-sm text-destructive">{archiveError}</p>
              <button
                className="text-sm font-medium underline"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </>
          )}
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
