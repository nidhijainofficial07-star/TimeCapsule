
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/tc/AppShell";
import { QuickCaptureProvider } from "@/components/tc/QuickCapture";
import { Logo } from "@/components/tc/common";
import { useAuthReady, useSession } from "@/services/auth";

export const Route = createFileRoute("/_workspace")({
  component: WorkspaceLayout,
});

function WorkspaceLayout() {
  const session = useSession();
  const authReady = useAuthReady();
  const navigate = useNavigate();

  useEffect(() => {
    if (authReady && !session) {
      navigate({ to: "/login", replace: true });
    }
  }, [authReady, session, navigate]);

  if (!authReady || !session) {
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

  return (
    <QuickCaptureProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </QuickCaptureProvider>
  );
}
