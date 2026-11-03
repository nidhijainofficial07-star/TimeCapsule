import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Archive, Bug, Camera, CheckCheck, Download, ExternalLink,
  FlaskConical, Lightbulb, MoreHorizontal, Pencil,
  PlayCircle, Plus, RefreshCw, Boxes, Github, Trash2,
} from "lucide-react";
import type { Project, RecordKind } from "@/lib/types";
import { useDB, deleteProject } from "@/services/db";
import { projectSummary } from "@/services/selectors";
import { projectStatusLabel } from "@/lib/constants";
import { buildExport, download, exportFilename, projectMarkdown, toCSV } from "@/services/transfer";
import { RecordManager } from "@/features/records/RecordManager";
import { RecordFormDialog } from "@/features/records/RecordForm";
import { DescriptionTab } from "@/features/projects/DescriptionTab";
import { VersionCompare } from "@/features/projects/VersionCompare";
import { ProjectIcon, ProjectStatusPill } from "@/features/projects/ProjectCard";
import { ReviewDialog, StatusDialog, TestDialog } from "@/features/projects/lifecycle";
import { TimelineList } from "@/features/timeline/TimelineList";
import { CreateSnapshotDialog, SnapshotCompare, SnapshotList } from "@/features/snapshots/snapshots";
import { EmptyState, Markdown, NotRecorded, SampleBadge, Section, StatusPill } from "@/components/tc/common";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { isOpenBug } from "@/services/selectors";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "description", label: "Description & Goals" },
  { id: "features", label: "Features" },
  { id: "bugs", label: "Bugs & Issues" },
  { id: "improvements", label: "Improvements" },
  { id: "ideas", label: "Future Ideas" },
  { id: "resources", label: "Resources & Files" },
  { id: "versions", label: "Versions" },
  { id: "sessions", label: "Development Sessions" },
  { id: "timeline", label: "Timeline" },
  { id: "snapshots", label: "Snapshots" },
  { id: "resume", label: "Resume Project" },
  { id: "settings", label: "Project Settings" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export const Route = createFileRoute("/_workspace/projects/$projectId")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab; record?: string } => ({
    tab: TABS.some((t) => t.id === s.tab) ? (s.tab as Tab) : undefined,
    record: typeof s.record === "string" ? s.record : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Project Workspace — Project TimeCapsule" },
      { name: "description", content: "A project's complete recorded history: features, bugs, ideas, versions, sessions and snapshots." },
      { property: "og:title", content: "Project Workspace — Project TimeCapsule" },
      { property: "og:description", content: "Everything about one project, in one place." },
    ],
  }),
  component: Workspace,
});

function Workspace() {
  const { projectId } = Route.useParams();
  const { tab = "overview", record } = Route.useSearch();
  const navigate = useNavigate({ from: "/projects/$projectId" });
  const db = useDB();
  const p = db.projects.find((x) => x.id === projectId);
  const [dialog, setDialog] = useState<null | "status" | "archive" | "review" | "test" | "snapshot" | RecordKind>(null);

  if (!p) return <EmptyState title="Project not found" body="It may have been removed, or the link is wrong." action={<Button asChild><Link to="/projects">All projects</Link></Button>} />;

  const setTab = (t: Tab) => {
    if (t === "resume") { navigate({ to: "/resume/$projectId", params: { projectId } }); return; }
    navigate({ search: { tab: t }, replace: true });
  };
  const setRecord = (id?: string) => navigate({ search: (prev) => ({ ...prev, record: id }), replace: true });
  const handleDeleteProject = () => {
  const confirmed = window.confirm(
    `Permanently delete "${p.name}" and all its associated records?\n\nThis action cannot be undone.`
  );

  if (!confirmed) return;

  const deleted = deleteProject(projectId);

  if (deleted) {
    toast.success("Project permanently deleted");
    navigate({ to: "/projects" });
  } else {
    toast.error("Could not find this project");
  }
};

  return (
    <div className="space-y-5">
      <header className="surface-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <ProjectIcon p={p} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-semibold sm:text-3xl">{p.name}</h1>
                <ProjectStatusPill status={p.status} />
                <SampleBadge show={p.isSample} />
              </div>
              <p className="mt-1 text-muted-foreground">{p.shortDescription || <span className="italic">No short description recorded</span>}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.technologies.map((t) => <span key={t} className="rounded bg-secondary px-1.5 py-0.5 text-xs">{t}</span>)}
                {p.tags.map((t) => <span key={t} className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground">#{t}</span>)}
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
                <div><dt className="text-muted-foreground">Created</dt><dd>{fmtDate(p.createdAt)}</dd></div>
                <div><dt className="text-muted-foreground">Last updated</dt><dd>{fmtDate(p.updatedAt)}</dd></div>
                <div><dt className="text-muted-foreground">Last reviewed</dt><dd>{fmtDate(p.lastReviewedAt)}</dd></div>
                <div><dt className="text-muted-foreground">Last tested</dt><dd>{fmtDate(p.lastTestedAt)}</dd></div>
              </dl>
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                {p.repositoryUrl && <a href={p.repositoryUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-primary hover:underline"><Github className="size-4" /> Repository</a>}
                {p.deploymentUrl && <a href={p.deploymentUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="size-4" /> Deployment</a>}
              </div>
            </div>
          </div>
          
<div className="flex flex-wrap gap-2 lg:justify-end">
  <Button asChild>
    <Link to="/resume/$projectId" params={{ projectId }}>
      <PlayCircle /> Resume
    </Link>
  </Button>

  <Button variant="outline" onClick={() => setDialog("sessions")}>
    <Plus /> Session
  </Button>

  <Button variant="outline" onClick={() => setDialog("snapshot")}>
    <Camera /> Snapshot
  </Button>

  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" aria-label="More project actions">
        <MoreHorizontal />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuItem onSelect={() => navigate({ to: "/projects/$projectId/edit", params: { projectId } })}>
        <Pencil /> Edit project
      </DropdownMenuItem>

      <DropdownMenuItem onSelect={() => setDialog("ideas")}>
        <Lightbulb /> Add idea
      </DropdownMenuItem>

      <DropdownMenuItem onSelect={() => setDialog("bugs")}>
        <Bug /> Add bug
      </DropdownMenuItem>

      <DropdownMenuItem onSelect={() => setDialog("resources")}>
        <Boxes /> Add resource
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem onSelect={() => setDialog("review")}>
        <CheckCheck /> Mark as reviewed
      </DropdownMenuItem>

      <DropdownMenuItem onSelect={() => setDialog("test")}>
        <FlaskConical /> Record a test
      </DropdownMenuItem>

      <DropdownMenuItem onSelect={() => setDialog("status")}>
        <RefreshCw /> Change status
      </DropdownMenuItem>

      <DropdownMenuSeparator />

      <DropdownMenuItem
        onSelect={handleDeleteProject}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="size-4" />
        Delete project
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
</div>

      </header>

      <nav aria-label="Project sections" className="-mx-1 overflow-x-auto">
        <div role="tablist" className="flex min-w-max gap-1 border-b px-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn("whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition", tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <div role="tabpanel">
        {tab === "overview" && <Overview p={p} go={setTab} />}
        {tab === "description" && <DescriptionTab p={p} />}
        {(["features", "bugs", "improvements", "ideas", "resources", "sessions"] as const).includes(tab as never) && (
          <>
            {tab === "ideas" && p.status === "completed_for_now" && <p className="mb-3 rounded-lg tone-success px-3 py-2 text-sm">This project is Completed for Now — you can still collect ideas for future versions.</p>}
            {tab === "resources" && <p className="mb-3 text-xs text-muted-foreground">Files are saved as references (name/location). Uploading files needs cloud storage, which is planned for the backend phase.</p>}
            <RecordManager key={tab} kind={tab as RecordKind} projectId={projectId} openId={record} onOpenIdChange={setRecord} />
          </>
        )}
        {tab === "versions" && (
          <div className="space-y-6">
            <RecordManager kind="versions" projectId={projectId} openId={record} onOpenIdChange={setRecord} />
            <Section title="Compare versions"><VersionCompare projectId={projectId} /></Section>
          </div>
        )}
        {tab === "timeline" && <TimelineList projectId={projectId} />}
        {tab === "snapshots" && (
          <div className="space-y-6">
            <SnapshotList projectId={projectId} onCreate={() => setDialog("snapshot")} />
            <Section title="Compare snapshots"><SnapshotCompare projectId={projectId} /></Section>
          </div>
        )}
        {tab === "settings" && <ProjectSettings p={p} open={(d) => setDialog(d)} />}
      </div>

      <StatusDialog p={p} open={dialog === "status" || dialog === "archive"} initial={dialog === "archive" ? "archived" : undefined} onOpenChange={(o) => !o && setDialog(null)} />
      <ReviewDialog p={p} open={dialog === "review"} onOpenChange={(o) => !o && setDialog(null)} />
      <TestDialog p={p} open={dialog === "test"} onOpenChange={(o) => !o && setDialog(null)} />
      <CreateSnapshotDialog projectId={projectId} open={dialog === "snapshot"} onOpenChange={(o) => !o && setDialog(null)} />
      {(["sessions", "ideas", "bugs", "resources"] as const).map((k) => (
        <RecordFormDialog key={k} kind={k} projectId={projectId} open={dialog === k} onOpenChange={(o) => !o && setDialog(null)} onSaved={() => setTab(k)} />
      ))}
    </div>
  );
}



function Overview({ p, go }: { p: Project; go: (t: Tab) => void }) {
  const db = useDB();
  const s = projectSummary(db, p);
  const openBugs = db.bugs.filter((b) => b.projectId === p.id && isOpenBug(b.status));
  const improvements = db.improvements.filter((b) => b.projectId === p.id).slice(0, 4);
  const ideas = db.ideas.filter((b) => b.projectId === p.id).slice(0, 4);
  const resources = db.resources.filter((b) => b.projectId === p.id).sort((a, b) => Number(b.pinned === "yes") - Number(a.pinned === "yes")).slice(0, 5);
  const byStatus = s.features.reduce<Record<string, number>>((acc, f) => ({ ...acc, [f.implementationStatus]: (acc[f.implementationStatus] ?? 0) + 1 }), {});
  const more = (t: Tab, label = "View all") => <button onClick={() => go(t)} className="text-xs font-semibold text-primary hover:underline">{label}</button>;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Section title="Where I left off" action={more("sessions", "Sessions")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-surface p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Last stopping point {s.lastSession && `· ${fmtDate(s.lastSession.date)}`}</p>
              <p className="mt-1 text-sm">{s.lastSession?.stoppingPoint || <NotRecorded>{s.lastSession ? "No stopping point recorded in the latest session" : "No development session recorded."}</NotRecorded>}</p>
            </div>
            <div className="rounded-lg bg-surface p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">My next step</p>
              <p className="mt-1 text-sm">{p.nextStep || <NotRecorded>No next step recorded.</NotRecorded>}</p>
            </div>
          </div>
        </Section>
        <Section title="Purpose & problem" action={more("description", "Edit")}>
          <div className="space-y-3">
            <div><p className="text-xs font-semibold text-muted-foreground">Purpose</p><Markdown text={p.purpose} /></div>
            <div><p className="text-xs font-semibold text-muted-foreground">Problem statement</p><Markdown text={p.problemStatement} /></div>
            <div><p className="text-xs font-semibold text-muted-foreground">Main goals</p><Markdown text={p.goals} /></div>
          </div>
        </Section>
        <div className="grid gap-4 sm:grid-cols-2">
          <Section title="Recorded feature progress" action={more("features")}>
            {s.featureCount === 0 ? <NotRecorded>No features recorded.</NotRecorded> : (
              <>
                <div className="mb-2 flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <div className="bg-success" style={{ width: `${(s.workingFeatures / s.featureCount) * 100}%` }} />
                </div>
                <ul className="space-y-1 text-sm">{Object.entries(byStatus).map(([k, n]) => <li key={k} className="flex justify-between"><StatusPill value={k} /><span className="tabular-nums">{n}</span></li>)}</ul>
                <p className="mt-2 text-xs text-muted-foreground">Based on recorded statuses — not a measure of completeness.</p>
              </>
            )}
          </Section>
          <Section title={`Open bugs (${openBugs.length})`} action={more("bugs")}>
            {openBugs.length === 0 ? <NotRecorded>No open bugs recorded.</NotRecorded> : (
              <ul className="space-y-1.5 text-sm">{openBugs.slice(0, 5).map((b) => <li key={b.id} className="flex items-center justify-between gap-2"><span className="truncate">{b.title}</span><StatusPill value={b.severity} /></li>)}</ul>
            )}
          </Section>
          <Section title="Recent improvements" action={more("improvements")}>
            {improvements.length === 0 ? <NotRecorded>No improvements recorded.</NotRecorded> : <ul className="space-y-1.5 text-sm">{improvements.map((b) => <li key={b.id} className="flex justify-between gap-2"><span className="truncate">{b.title}</span><StatusPill value={b.status} /></li>)}</ul>}
          </Section>
          <Section title="Future ideas" action={more("ideas")}>
            {ideas.length === 0 ? <NotRecorded>No ideas recorded.</NotRecorded> : <ul className="space-y-1.5 text-sm">{ideas.map((b) => <li key={b.id} className="flex justify-between gap-2"><span className="truncate">{b.title}</span><StatusPill value={b.status} /></li>)}</ul>}
          </Section>
        </div>
      </div>
      <div className="space-y-4">
        <Section title="Lifecycle">
          <p className="text-sm">Currently <strong>{projectStatusLabel(p.status)}</strong></p>
          <p className="mt-1 text-xs text-muted-foreground">Category: {p.category || "not set"} · Started {fmtDate(p.startDate)}</p>
        </Section>
        <Section title="Latest version" action={more("versions")}>
          {s.latestVersion ? <p className="text-sm"><strong>{s.latestVersion.label}</strong> {s.latestVersion.name} <span className="text-muted-foreground">· {fmtDate(s.latestVersion.releaseDate, "no date")}</span></p> : <NotRecorded>No version history added yet.</NotRecorded>}
        </Section>
        <Section title="Latest session" action={more("sessions")}>
          {s.lastSession ? <p className="text-sm"><strong>{s.lastSession.title}</strong> <span className="text-muted-foreground">· {fmtDate(s.lastSession.date)}</span></p> : <NotRecorded>No development session recorded.</NotRecorded>}
        </Section>
        <Section title="Latest snapshot" action={more("snapshots")}>
          {s.latestSnapshot ? <p className="text-sm"><strong>{s.latestSnapshot.title}</strong> <span className="text-muted-foreground">· {fmtDate(s.latestSnapshot.snapshotDate)}</span></p> : <NotRecorded>No snapshots created.</NotRecorded>}
        </Section>
        <Section title="Important resources" action={more("resources")}>
          {resources.length === 0 ? <NotRecorded>No resources linked.</NotRecorded> : (
            <ul className="space-y-1.5 text-sm">{resources.map((r) => <li key={r.id} className="truncate">{r.url ? <a href={r.url} target="_blank" rel="noreferrer noopener" className="text-primary hover:underline">{r.name}</a> : <span>{r.name} <span className="text-xs text-muted-foreground">(reference)</span></span>}</li>)}</ul>
          )}
        </Section>
        <Section title="Technologies">
          {p.technologies.length ? <div className="flex flex-wrap gap-1">{p.technologies.map((t) => <span key={t} className="rounded bg-secondary px-1.5 py-0.5 text-xs">{t}</span>)}</div> : <NotRecorded />}
        </Section>
      </div>
    </div>
  );
}

function ProjectSettings({ p, open }: { p: Project; open: (d: "status" | "archive" | "review" | "test") => void }) {
  const db = useDB();
  const exp = (fmt: "json" | "md" | "features" | "bugs" | "sessions") => {
    try {
      if (fmt === "json") download(exportFilename(p.name, "json"), JSON.stringify(buildExport({ projectId: p.id }), null, 2), "application/json");
      else if (fmt === "md") download(exportFilename(p.name, "md"), projectMarkdown(db, p), "text/markdown");
      else {
        const cols: Record<string, string[]> = {
          features: ["title", "implementationStatus", "verificationStatus", "priority", "category", "lastTestedAt", "createdAt", "updatedAt"],
          bugs: ["title", "status", "severity", "priority", "verificationStatus", "reportedAt", "resolvedAt", "environment"],
          sessions: ["date", "title", "objective", "completedWork", "stoppingPoint", "nextStep"],
        };
        const rows = (db[fmt] as unknown as Record<string, unknown>[]).filter((r) => r.projectId === p.id);
        download(exportFilename(`${p.name}-${fmt}`, "csv"), toCSV(rows, cols[fmt]), "text/csv");
      }
      toast.success("Export downloaded");
    } catch {
      toast.error("Export failed");
    }
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Lifecycle">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => open("status")}><RefreshCw /> Change status</Button>
          {p.status === "archived" ? <Button onClick={() => open("status")}><Archive /> Restore project</Button> : <Button variant="outline" onClick={() => open("archive")}><Archive /> Archive project</Button>}
        </div>
        <ol className="mt-4 space-y-2 text-sm">
          {[...p.lifecycleHistory].reverse().map((h, i) => (
            <li key={i} className="flex justify-between gap-2 border-b pb-1.5 last:border-0">
              <span>{h.from ? `${projectStatusLabel(h.from)} → ` : "Created as "}<strong>{projectStatusLabel(h.to)}</strong>{h.reason && <span className="text-muted-foreground"> — {h.reason}</span>}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{fmtDate(h.at)}</span>
            </li>
          ))}
        </ol>
<p className="mt-3 text-xs text-muted-foreground">
  Use the project menu to permanently delete this project and its associated records.
</p>
      </Section>
      <Section title="Review & testing">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => open("review")}><CheckCheck /> Mark as reviewed</Button>
          <Button variant="outline" onClick={() => open("test")}><FlaskConical /> Record a test</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Opening a project never changes these dates — only your explicit records do.</p>
        <h4 className="mt-4 text-xs font-bold uppercase text-muted-foreground">Test records</h4>
        {p.testRecords.length === 0 ? <NotRecorded>Last tested date not recorded.</NotRecorded> : (
          <ul className="mt-1 space-y-2 text-sm">{p.testRecords.map((t) => (
            <li key={t.id} className="rounded-lg bg-surface p-2">
              <p><strong>{fmtDate(t.at)}</strong> — {t.whatTested}</p>
              {t.environment && <p className="text-xs text-muted-foreground">Environment: {t.environment}</p>}
              {t.result && <p className="text-xs">Result: {t.result}</p>}
              {t.limitations && <p className="text-xs">Limitations: {t.limitations}</p>}
              {t.issues && <p className="text-xs">Issues: {t.issues}</p>}
            </li>
          ))}</ul>
        )}
        <h4 className="mt-4 text-xs font-bold uppercase text-muted-foreground">Reviews</h4>
        {p.reviewHistory.length === 0 ? <NotRecorded>Never reviewed.</NotRecorded> : (
          <ul className="mt-1 space-y-1 text-sm">{p.reviewHistory.map((r, i) => <li key={i}>{fmtDateTime(r.at)}{r.note && ` — ${r.note}`}</li>)}</ul>
        )}
      </Section>
      <Section title="Export this project">
        <p className="mb-3 text-xs text-muted-foreground">Files are exported as references only. No passwords or tokens are included.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exp("json")}><Download /> JSON (full data)</Button>
          <Button variant="outline" onClick={() => exp("md")}><Download /> Markdown summary</Button>
          <Button variant="outline" onClick={() => exp("features")}><Download /> Features CSV</Button>
          <Button variant="outline" onClick={() => exp("bugs")}><Download /> Bugs CSV</Button>
          <Button variant="outline" onClick={() => exp("sessions")}><Download /> Sessions CSV</Button>
        </div>
      </Section>
      <Section title="Next-step history">
        {p.nextStepHistory.length === 0 ? <NotRecorded>No earlier next steps.</NotRecorded> : (
          <ul className="space-y-1 text-sm">{p.nextStepHistory.map((n, i) => <li key={i}><StatusPill value={n.outcome === "completed" ? "Implemented" : "Deferred"} /> {n.text} <span className="text-xs text-muted-foreground">· {fmtDate(n.at)}</span></li>)}</ul>
        )}
      </Section>
    </div>
  );
}
