import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, ExternalLink, Pencil, PlayCircle, Plus, RotateCcw, Replace } from "lucide-react";
import { useDB } from "@/services/db";
import { projectSummary, isOpenBug } from "@/services/selectors";
import { resetChecklist, setNextStep, toggleChecklist } from "@/services/archive";
import { projectStatusLabel } from "@/lib/constants";
import { RecordFormDialog } from "@/features/records/RecordForm";
import { ProjectIcon } from "@/features/projects/ProjectCard";
import { ReviewDialog } from "@/features/projects/lifecycle";
import { EmptyState, Markdown, NotRecorded, SampleBadge, Section, StatusPill, attempt } from "@/components/tc/common";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { fmtDate } from "@/lib/format";

const CHECKLIST = [
  "Review the project summary", "Open the repository or project files", "Check the development environment",
  "Review dependencies and configuration", "Check the current deployment", "Review known bugs",
  "Run the project or tests", "Verify previously working features", "Review my recorded next step", "Start a new development session",
];

export const Route = createFileRoute("/_workspace/resume/$projectId")({
  head: () => ({
    meta: [
      { title: "Resume Project — Project TimeCapsule" },
      { name: "description", content: "Welcome back: see where you left off, your next step, and known issues." },
      { property: "og:title", content: "Resume Project — Project TimeCapsule" },
      { property: "og:description", content: "Pick up exactly where you stopped." },
    ],
  }),
  component: Resume,
});

function Resume() {
  const { projectId } = Route.useParams();
  const db = useDB();
  const p = db.projects.find((x) => x.id === projectId);
  const [editing, setEditing] = useState<null | "edit" | "replace">(null);
  const [text, setText] = useState("");
  const [sessionOpen, setSessionOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  if (!p) return <EmptyState title="Project not found" action={<Button asChild><Link to="/projects">All projects</Link></Button>} />;

  const s = projectSummary(db, p);
  const bugs = db.bugs.filter((b) => b.projectId === p.id && isOpenBug(b.status));
  const resources = db.resources.filter((r) => r.projectId === p.id).sort((a, b) => Number(b.pinned === "yes") - Number(a.pinned === "yes"));
  const decisions = db.notes.filter((n) => n.projectId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const ideas = db.ideas.filter((n) => n.projectId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const versions = db.versions.filter((v) => v.projectId === p.id).sort((a, b) => (b.releaseDate || b.createdAt).localeCompare(a.releaseDate || a.createdAt)).slice(0, 3);
  const done = CHECKLIST.filter((c) => p.checklist[c]).length;

  const saveStep = () => {
    if (attempt(() => { setNextStep(p.id, text.trim(), editing === "replace" ? "replaced" : undefined); return true; }, "Next step saved")) setEditing(null);
  };

  return (
    <div className="space-y-5">
      <div className="surface-card overflow-hidden">
        <div className="bg-gradient-brand px-5 py-6 text-primary-foreground sm:px-6">
          <p className="text-sm opacity-85">Welcome back to</p>
          <div className="mt-1 flex items-center gap-3">
            <ProjectIcon p={p} size="lg" />
            <div>
              <h1 className="font-display text-3xl font-semibold">{p.name} <SampleBadge show={p.isSample} /></h1>
              <p className="opacity-85">Recorded status: {projectStatusLabel(p.status)} · Last reviewed {fmtDate(p.lastReviewedAt, "never")} · Last tested {fmtDate(p.lastTestedAt, "not recorded")}</p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div><p className="text-xs font-bold uppercase text-muted-foreground">Original purpose</p><Markdown text={p.purpose} /></div>
          <div><p className="text-xs font-bold uppercase text-muted-foreground">Problem it solves</p><Markdown text={p.problemStatement} /></div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Where I left off">
          {s.lastSession ? (
            <div className="space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">Session “{s.lastSession.title}” · {fmtDate(s.lastSession.date)}</p>
              <div><strong>Stopping point:</strong> {s.lastSession.stoppingPoint || <NotRecorded />}</div>
              {s.lastSession.wasDoing && <div><strong>Was doing:</strong> {s.lastSession.wasDoing}</div>}
              {s.lastSession.unfinished && <div><strong>Unfinished:</strong> {s.lastSession.unfinished}</div>}
              {s.lastSession.inspectFirst && <div><strong>Inspect first:</strong> <Markdown text={s.lastSession.inspectFirst} className="inline" /></div>}
              {s.lastSession.nextStep && <div><strong>Session's next step:</strong> {s.lastSession.nextStep}</div>}
            </div>
          ) : <NotRecorded>No development session recorded yet.</NotRecorded>}
        </Section>

        <Section title="My next step">
          {editing ? (
            <div className="space-y-2">
              <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} aria-label="Next step" autoFocus />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                <Button size="sm" onClick={saveStep} disabled={!text.trim()}>Save</Button>
              </div>
            </div>
          ) : p.nextStep ? (
            <>
              <p className="text-base">{p.nextStep}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => { setText(p.nextStep); setEditing("edit"); }}><Pencil /> Edit</Button>
                <Button size="sm" variant="outline" onClick={() => attempt(() => setNextStep(p.id, "", "completed"), "Marked completed")}><CheckCircle2 /> Mark completed</Button>
                <Button size="sm" variant="outline" onClick={() => { setText(""); setEditing("replace"); }}><Replace /> Replace</Button>
              </div>
            </>
          ) : (
            <div>
              <NotRecorded>No next step recorded yet.</NotRecorded>
              <div className="mt-2"><Button size="sm" onClick={() => { setText(""); setEditing("edit"); }}><Plus /> Add next step</Button></div>
            </div>
          )}
        </Section>
      </div>

      <Section title="Last known feature state">
        <p className="mb-3 text-xs text-muted-foreground">Historical records — these may not reflect how the project behaves today.</p>
        {s.features.length === 0 ? <NotRecorded>No features recorded.</NotRecorded> : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {s.features.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                <span className="truncate">{f.title}</span>
                <span className="flex items-center gap-1.5"><StatusPill value={f.implementationStatus} /><span className="text-xs text-muted-foreground">tested {fmtDate(f.lastTestedAt, "—")}</span></span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Section title={`Known issues (${bugs.length})`}>
          {bugs.length === 0 ? <NotRecorded>No open bugs recorded.</NotRecorded> : <ul className="space-y-1.5 text-sm">{bugs.map((b) => <li key={b.id} className="flex justify-between gap-2"><Link to="/projects/$projectId" params={{ projectId }} search={{ tab: "bugs", record: b.id }} className="truncate hover:underline">{b.title}</Link><StatusPill value={b.status} /></li>)}</ul>}
        </Section>
        <Section title="Useful resources">
          {resources.length === 0 && !p.repositoryUrl && !p.deploymentUrl ? <NotRecorded>No resources linked.</NotRecorded> : (
            <ul className="space-y-1.5 text-sm">
              {p.repositoryUrl && <li><a href={p.repositoryUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="size-3.5" /> Repository</a></li>}
              {p.deploymentUrl && <li><a href={p.deploymentUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="size-3.5" /> Deployment</a></li>}
              {resources.map((r) => <li key={r.id}>{r.url ? <a href={r.url} target="_blank" rel="noreferrer noopener" className="text-primary hover:underline">{r.name}</a> : <span>{r.name} <span className="text-xs text-muted-foreground">(file reference)</span></span>}</li>)}
            </ul>
          )}
        </Section>
        <Section title="Versions & snapshot">
          {versions.length === 0 ? <NotRecorded>No versions.</NotRecorded> : <ul className="space-y-1 text-sm">{versions.map((v) => <li key={v.id}><strong>{v.label}</strong> {v.name} <span className="text-xs text-muted-foreground">{fmtDate(v.releaseDate, "")}</span></li>)}</ul>}
          <div className="mt-3 text-sm">
            {s.latestSnapshot ? <Link to="/projects/$projectId" params={{ projectId }} search={{ tab: "snapshots" }} className="text-primary hover:underline">Latest snapshot: {s.latestSnapshot.title}</Link> : <NotRecorded>No snapshot yet.</NotRecorded>}
          </div>
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Recent decisions & notes">
          {decisions.length === 0 ? <NotRecorded>No decisions or notes recorded.</NotRecorded> : <ul className="space-y-1.5 text-sm">{decisions.map((n) => <li key={n.id}><StatusPill value={n.kind} /> {n.title}</li>)}</ul>}
        </Section>
        <Section title="Recent ideas">
          {ideas.length === 0 ? <NotRecorded>No ideas recorded.</NotRecorded> : <ul className="space-y-1.5 text-sm">{ideas.map((n) => <li key={n.id} className="flex justify-between gap-2"><span className="truncate">{n.title}</span><StatusPill value={n.status} /></li>)}</ul>}
        </Section>
      </div>

      <Section title={`Before continuing (${done}/${CHECKLIST.length})`} action={done > 0 && <Button size="sm" variant="ghost" onClick={() => attempt(() => resetChecklist(p.id))}><RotateCcw /> Reset</Button>}>
        <p className="mb-3 text-xs text-muted-foreground">Optional guidance. Ticking items is your own record — nothing is checked automatically.</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {CHECKLIST.map((c) => (
            <li key={c}>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={!!p.checklist[c]} onCheckedChange={(v) => attempt(() => toggleChecklist(p.id, c, !!v))} />
                <span className={p.checklist[c] ? "text-muted-foreground line-through" : ""}>{c}</span>
              </label>
            </li>
          ))}
        </ul>
      </Section>

      <div className="flex flex-wrap gap-2">
        <Button size="lg" onClick={() => setSessionOpen(true)}><PlayCircle /> Start Development Session</Button>
        <Button size="lg" variant="outline" onClick={() => setReviewOpen(true)}><CheckCircle2 /> Mark project as reviewed</Button>
        <Button size="lg" variant="ghost" asChild><Link to="/projects/$projectId" params={{ projectId }}>Open workspace</Link></Button>
      </div>

      <RecordFormDialog kind="sessions" projectId={projectId} open={sessionOpen} onOpenChange={setSessionOpen} prefill={{ relatedVersionId: versions[0]?.id ?? "" }} />
      <ReviewDialog p={p} open={reviewOpen} onOpenChange={setReviewOpen} />
    </div>
  );
}
