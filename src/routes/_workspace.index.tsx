import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Archive, ArrowDown, ArrowUp, Bug, Camera, CheckCircle2, FolderKanban, Lightbulb, PauseCircle, PlayCircle,
  Plus, RotateCcw, SlidersHorizontal, Zap, History,
} from "lucide-react";
import { useDB } from "@/services/db";
import { useSession } from "@/services/auth";
import { dashboardStats, resumeCandidates, reviewReminders } from "@/services/selectors";
import { resetDashboardLayout, updatePreferences } from "@/services/preferences";
import { useQuickCapture } from "@/components/tc/QuickCapture";
import { EmptyState, Section, Stat, StatusPill, SampleBadge } from "@/components/tc/common";
import { ProjectCard } from "@/features/projects/ProjectCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/tc/fields";
import { WIDGET_LABELS } from "@/lib/constants";
import { fmtDate, fmtDateTime } from "@/lib/format";
import type { WidgetId } from "@/lib/types";
import { SORT_OPTIONS } from "@/services/selectors";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_workspace/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Project TimeCapsule" },
      { name: "description", content: "Pick up where you left off across every project in your private archive." },
      { property: "og:title", content: "Dashboard — Project TimeCapsule" },
      { property: "og:description", content: "Your projects, ideas, and progress — preserved in one place." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const db = useDB();
  const session = useSession();
  const qc = useQuickCapture();
  const [customize, setCustomize] = useState(false);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const widgets: Record<WidgetId, React.ReactNode> = {
    stats: <StatsWidget />,
    pickup: <PickupWidget />,
    reminders: <RemindersWidget />,
    activity: <ActivityWidget />,
    ideas: <IdeasWidget />,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greet}{session?.displayName ? `, ${session.displayName}` : ""}</p>
          <h1 className="font-display text-3xl font-semibold">Welcome back to your workspace.</h1>
          <p className="mt-1 text-muted-foreground">Your projects, ideas, and progress — preserved in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link to="/projects/new"><Plus /> Add Project</Link></Button>
          <Button variant="outline" onClick={() => qc.open()}><Zap /> Quick Capture</Button>
          <Button variant="ghost" onClick={() => setCustomize(true)} aria-label="Customise dashboard"><SlidersHorizontal /></Button>
        </div>
      </div>

      {db.preferences.widgets.filter((w) => w.visible).map((w) => <div key={w.id}>{widgets[w.id]}</div>)}
      {db.preferences.widgets.every((w) => !w.visible) && (
        <EmptyState title="All dashboard sections are hidden" action={<Button onClick={() => setCustomize(true)}>Customise dashboard</Button>} />
      )}

      <CustomizeDialog open={customize} onOpenChange={setCustomize} />
    </div>
  );
}

function StatsWidget() {
  const db = useDB();
  const s = dashboardStats(db);
  const navigate = useNavigate();
  const go = (status?: string, extra?: Record<string, string>) => navigate({ to: "/projects", search: { status, ...extra } });
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Total projects" value={s.total} icon={<FolderKanban />} onClick={() => go()} />
      <Stat label="In progress" value={s.inProgress} icon={<PlayCircle />} tone="info" onClick={() => go("in_progress")} />
      <Stat label="Paused" value={s.paused} icon={<PauseCircle />} tone="warning" onClick={() => go("paused")} />
      <Stat label="Completed for now" value={s.completed} icon={<CheckCircle2 />} tone="success" onClick={() => go("completed_for_now")} />
      <Stat label="Archived" value={s.archived} icon={<Archive />} tone="neutral" onClick={() => navigate({ to: "/archived" })} />
      <Stat label="Open bugs" value={s.openBugs} icon={<Bug />} tone="danger" onClick={() => go(undefined, { has: "bugs" })} />
      <Stat label="Unreviewed ideas" value={s.unreviewedIdeas} icon={<Lightbulb />} tone="primary" onClick={() => navigate({ to: "/ideas" })} />
      <Stat label="Snapshots" value={s.snapshots} icon={<Camera />} tone="primary" onClick={() => navigate({ to: "/snapshots" })} />
    </div>
  );
}

function PickupWidget() {
  const db = useDB();
  const list = resumeCandidates(db);
  return (
    <Section title="Pick up where you left off" action={<Link to="/projects" className="text-xs font-semibold text-primary hover:underline">All projects</Link>}>
      {list.length === 0 ? (
        <EmptyState icon={<FolderKanban />} title="No active projects yet" body="Add a project and record a development session — it'll show up here so you can resume it later." action={<Button asChild><Link to="/projects/new"><Plus /> Add Project</Link></Button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">{list.map(({ p }) => <ProjectCard key={p.id} p={p} variant="resume" />)}</div>
      )}
    </Section>
  );
}

function RemindersWidget() {
  const db = useDB();
  if (!db.preferences.reviewReminders) return null;
  const list = reviewReminders(db).slice(0, 5);
  return (
    <Section title="Review reminders">
      <p className="mb-3 text-xs text-muted-foreground">Projects you haven't marked as reviewed in {db.preferences.reviewAfterDays}+ days. This says nothing about whether they still work.</p>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">All caught up.</p>
      ) : (
        <ul className="divide-y">
          {list.map(({ p, days }) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="truncate">{p.icon} {p.name} <SampleBadge show={p.isSample} /></span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{days === null ? "Never reviewed" : `Last reviewed ${days} days ago`}</span>
                <Button asChild size="sm" variant="outline"><Link to="/resume/$projectId" params={{ projectId: p.id }}>Review</Link></Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function ActivityWidget() {
  const db = useDB();
  const items = [...db.activity].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt)).slice(0, 8);
  return (
    <Section title="Recent activity" action={<Link to="/timeline" className="text-xs font-semibold text-primary hover:underline">Full timeline</Link>}>
      {items.length === 0 ? (
        <EmptyState icon={<History />} title="No activity yet" body="Every change you make is recorded here with its real timestamp." />
      ) : (
        <ol className="space-y-2.5">
          {items.map((a) => {
            const p = a.projectId ? db.projects.find((x) => x.id === a.projectId) : undefined;
            return (
              <li key={a.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate">{a.description} <SampleBadge show={a.isSample} /></p>
                  <p className="text-xs text-muted-foreground">{fmtDateTime(a.occurredAt)}{p ? ` · ${p.name}` : ""}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}

function IdeasWidget() {
  const db = useDB();
  const qc = useQuickCapture();
  const ideas = [...db.ideas].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  return (
    <Section title="Recent ideas" action={<Link to="/ideas" className="text-xs font-semibold text-primary hover:underline">Ideas & Notes</Link>}>
      {ideas.length === 0 ? (
        <EmptyState icon={<Lightbulb />} title="No ideas captured" action={<Button variant="outline" onClick={() => qc.open({ type: "idea" })}>Capture an idea</Button>} />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ideas.map((i) => {
            const p = db.projects.find((x) => x.id === i.projectId);
            return (
              <li key={i.id} className="rounded-lg border p-3">
                <Link to="/ideas" search={{ record: i.id }} className="line-clamp-1 text-sm font-semibold hover:underline">{i.title}</Link>
                <p className="mt-0.5 text-xs text-muted-foreground">{p ? `${p.icon} ${p.name}` : "Unassigned"} · {i.category} · {fmtDate(i.createdAt)}</p>
                <div className="mt-2"><StatusPill value={i.status} /></div>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function CustomizeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const db = useDB();
  const prefs = db.preferences;
  const move = (i: number, d: number) => {
    const w = [...prefs.widgets];
    const j = i + d;
    if (j < 0 || j >= w.length) return;
    [w[i], w[j]] = [w[j], w[i]];
    updatePreferences({ widgets: w });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customise dashboard</DialogTitle>
          <DialogDescription>Choose which sections appear and in what order. Saved in this browser.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y rounded-lg border">
          {prefs.widgets.map((w, i) => (
            <li key={w.id} className="flex items-center gap-2 px-3 py-2">
              <Switch id={`w-${w.id}`} checked={w.visible} onCheckedChange={(c) => updatePreferences({ widgets: prefs.widgets.map((x) => (x.id === w.id ? { ...x, visible: c } : x)) })} />
              <label htmlFor={`w-${w.id}`} className={cn("flex-1 text-sm", !w.visible && "text-muted-foreground")}>{WIDGET_LABELS[w.id]}</label>
              <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${WIDGET_LABELS[w.id]} up`}><ArrowUp /></Button>
              <Button size="icon" variant="ghost" disabled={i === prefs.widgets.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${WIDGET_LABELS[w.id]} down`}><ArrowDown /></Button>
            </li>
          ))}
        </ul>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Card density</span>
            <NativeSelect value={prefs.density} onChange={(e) => updatePreferences({ density: e.target.value as "compact" })}>
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </NativeSelect>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Default project view</span>
            <NativeSelect value={prefs.defaultView} onChange={(e) => updatePreferences({ defaultView: e.target.value as "grid" })}>
              <option value="grid">Grid</option>
              <option value="list">List</option>
            </NativeSelect>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Default sorting</span>
            <NativeSelect value={prefs.defaultSort} onChange={(e) => updatePreferences({ defaultSort: e.target.value as "updated" })}>
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </NativeSelect>
          </label>
        </div>
        <Button variant="outline" onClick={resetDashboardLayout}><RotateCcw /> Reset dashboard layout</Button>
      </DialogContent>
    </Dialog>
  );
}
