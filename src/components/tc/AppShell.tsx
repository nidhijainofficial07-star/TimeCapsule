import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Archive, Boxes, Camera, ChevronsLeft, ChevronsRight, FolderKanban, HelpCircle, LayoutDashboard, Lightbulb,
  LogOut, Menu, Monitor, Moon, Plus, Search, Settings, Sun, History, Bell,
} from "lucide-react";
import { resetArchiveSync } from "@/services/archiveSync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Brand } from "./common";
import { useQuickCapture } from "./QuickCapture";
import { useDB, getLoadIssue } from "@/services/db";
import { updatePreferences } from "@/services/preferences";
import { auth, useSession } from "@/services/auth";
import { reviewReminders } from "@/services/selectors";
import { cn } from "@/lib/utils";
import { useCloudSyncStatus } from "@/services/cloudSyncQueue";


export const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "All Projects", icon: FolderKanban },
  { to: "/ideas", label: "Ideas & Notes", icon: Lightbulb },
  { to: "/timeline", label: "Development Timeline", icon: History },
  { to: "/snapshots", label: "Time Capsule Snapshots", icon: Camera },
  { to: "/resources", label: "Resources", icon: Boxes },
  { to: "/archived", label: "Archived Projects", icon: Archive },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export const SHORTCUTS = [
  { keys: "/", label: "Focus global search" },
  { keys: "N", label: "New Quick Capture (outside text fields)" },
  { keys: "?", label: "Show this shortcuts panel" },
  { keys: "Esc", label: "Close dialogs, panels and menus" },
];

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const db = useDB();
  const inboxCount = db.inbox.length;
  return (
    <nav aria-label="Primary" className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
              collapsed && "justify-center px-2",
            )}
          >
            <Icon className={cn("size-4 shrink-0", active && "text-sidebar-primary")} />
            {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
            {!collapsed && item.to === "/ideas" && inboxCount > 0 && (
              <span className="rounded-full bg-sidebar-primary px-1.5 text-[10px] font-bold text-sidebar-primary-foreground" aria-label={`${inboxCount} in inbox`}>{inboxCount}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const db = useDB();
  const session = useSession();
  const sync = useCloudSyncStatus();
  const collapsed = db.preferences.sidebarCollapsed;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const qc = useQuickCapture();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const title = NAV.find((n) => (n.to === "/" ? path === "/" : path.startsWith(n.to)))?.label ?? (path.startsWith("/resume") ? "Resume Project" : path.startsWith("/search") ? "Search" : "Workspace");
  const reminders = reviewReminders(db);
  const issue = getLoadIssue();
  const sampleCount = db.projects.filter((p) => p.isSample).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName);
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector("[role=dialog]")) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        qc.open();
      } else if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [qc]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/search", search: { q } });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">Skip to content</a>
      <aside className={cn("sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar p-3 transition-[width] md:flex", collapsed ? "w-16" : "w-64")}>
        <div className={cn("mb-5 flex items-center px-1 pt-1", collapsed ? "justify-center" : "justify-between")}>
          <Link to="/" aria-label="Project TimeCapsule home"><Brand compact={collapsed} /></Link>
        </div>
        <NavList collapsed={collapsed} />
        <div className="mt-auto space-y-2">
          {!collapsed && (
            <p className="rounded-lg border border-dashed px-3 py-2 text-[11px] leading-snug text-muted-foreground">
              Your private archive is synced to your Supabase account. Export regularly from Settings as a backup.
            </p>
          )}
          <Button variant="ghost" size="sm" className="w-full" onClick={() => updatePreferences({ sidebarCollapsed: !collapsed })} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <ChevronsRight /> : <><ChevronsLeft /> Collapse</>}
          </Button>
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="mb-5"><Brand /></div>
          <NavList onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur sm:px-5">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu /></Button>
          <h2 className="hidden truncate text-sm font-semibold lg:block lg:w-48">{title}</h2>
          <form onSubmit={submitSearch} className="relative flex-1 max-w-xl" role="search">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the whole archive…" className="h-9 pl-8 pr-8" aria-label="Global search" />
            <kbd className="pointer-events-none absolute right-2 top-2 hidden rounded border px-1.5 text-[10px] text-muted-foreground sm:block">/</kbd>
          </form>
          <div className="ml-auto flex items-center gap-2">
  <div
    className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"
    title={
      sync.status === "failed"
        ? sync.error ?? "Cloud synchronization failed"
        : sync.status === "saved" && sync.lastSyncedAt
          ? `Last synced: ${new Date(sync.lastSyncedAt).toLocaleTimeString()}`
          : undefined
    }
    role="status"
    aria-live="polite"
  >
    <span
      className={cn(
        "size-2 rounded-full",
        sync.status === "saved" && "bg-green-500",
        sync.status === "syncing" && "animate-pulse bg-yellow-500",
        sync.status === "failed" && "bg-destructive",
        sync.status === "idle" && "bg-muted-foreground",
      )}
    />

    <span>
      {sync.status === "saved"
        ? "Cloud saved"
        : sync.status === "syncing"
          ? "Syncing…"
          : sync.status === "failed"
            ? "Sync failed"
            : "Cloud ready"}
    </span>
  </div>

  <Button onClick={() => qc.open()} size="sm" className="gap-1.5">
    <Plus /> <span className="hidden sm:inline">Quick Capture</span></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Review reminders${reminders.length ? ` (${reminders.length})` : ""}`} className="relative">
                  <Bell />
                  {reminders.length > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Review reminders</DropdownMenuLabel>
                {!db.preferences.reviewReminders ? (
                  <p className="px-2 py-1.5 text-sm text-muted-foreground">Reminders are turned off in Settings.</p>
                ) : reminders.length === 0 ? (
                  <p className="px-2 py-1.5 text-sm text-muted-foreground">Nothing due. Every active project was reviewed within {db.preferences.reviewAfterDays} days.</p>
                ) : (
                  reminders.slice(0, 6).map(({ p, days }) => (
                    <DropdownMenuItem key={p.id} onSelect={() => navigate({ to: "/resume/$projectId", params: { projectId: p.id } })}>
                      <span className="truncate">{p.icon} {p.name}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{days === null ? "never reviewed" : `${days}d`}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Theme">
                  {db.preferences.theme === "dark" ? <Moon /> : db.preferences.theme === "light" ? <Sun /> : <Monitor />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={db.preferences.theme} onValueChange={(v) => updatePreferences({ theme: v as "light" })}>
                  <DropdownMenuRadioItem value="light"><Sun className="size-4" /> Light</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark"><Moon className="size-4" /> Dark</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system"><Monitor className="size-4" /> System</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account menu" className="rounded-full">
                  <span className="grid size-8 place-items-center rounded-full bg-gradient-brand text-xs font-bold text-primary-foreground">
                    {(session?.displayName ?? "?").charAt(0).toUpperCase()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="font-semibold">{session?.displayName}</div>
                  <div className="truncate text-xs text-muted-foreground">{session?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}><Settings /> Settings</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setHelpOpen(true)}><HelpCircle /> Keyboard shortcuts</DropdownMenuItem>
                <DropdownMenuSeparator />
<DropdownMenuItem
  onSelect={async () => {
    try {
      await auth.signOut();
      resetArchiveSync();
      navigate({ to: "/login", replace: true });
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  }}
>
  <LogOut /> Sign out
</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {issue && <div className="tone-danger px-5 py-2 text-sm" role="alert">{issue}</div>}
        {sampleCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-accent/40 px-5 py-1.5 text-xs text-accent-foreground">
            <span>Showing {sampleCount} sample projects so you can explore. They're labelled “Sample” and aren't your records.</span>
            <Link to="/settings" hash="data" className="font-semibold underline underline-offset-2">Clear sample data</Link>
          </div>
        )}

        <main id="main" className={cn("mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6", db.preferences.density === "compact" && "py-4")}>
          {children}
        </main>
      </div>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>Shortcuts work when you're not typing in a field.</DialogDescription>
          </DialogHeader>
          <ShortcutList />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ShortcutList() {
  return (
    <ul className="divide-y rounded-lg border">
      {SHORTCUTS.map((s) => (
        <li key={s.keys} className="flex items-center justify-between px-3 py-2 text-sm">
          <span>{s.label}</span>
          <kbd className="rounded border bg-muted px-2 py-0.5 font-mono text-xs">{s.keys}</kbd>
        </li>
      ))}
    </ul>
  );
}
