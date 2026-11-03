import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Camera, GitCompare } from "lucide-react";
import type { Snapshot, SnapshotSection } from "@/lib/types";
import { SNAPSHOT_SECTIONS } from "@/lib/types";
import { useDB } from "@/services/db";
import { buildSnapshotState, createSnapshot } from "@/services/archive";
import { projectStatusLabel } from "@/lib/constants";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect } from "@/components/tc/fields";
import { EmptyState, Markdown, NotRecorded, SampleBadge, StatusPill, attempt } from "@/components/tc/common";
import { fmtDate, fmtDateTime, todayDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CreateSnapshotDialog({ projectId, open, onOpenChange }: { projectId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const db = useDB();
  const p = db.projects.find((x) => x.id === projectId);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(todayDate());
  const [reason, setReason] = useState("");
  const [milestone, setMilestone] = useState("");
  const [reflection, setReflection] = useState("");
  const [sections, setSections] = useState<SnapshotSection[]>(SNAPSHOT_SECTIONS.map((s) => s.key));
  const [step, setStep] = useState<"form" | "preview">("form");
  const [err, setErr] = useState("");

  const preview = useMemo(() => (p ? buildSnapshotState(db, projectId, sections) : null), [db, projectId, sections, p]);
  if (!p) return null;

  const reset = () => { setTitle(""); setReason(""); setMilestone(""); setReflection(""); setStep("form"); setErr(""); setDate(todayDate()); };
  const save = () => {
    const s = attempt(() => createSnapshot({ projectId, title: title.trim(), reason, milestone, snapshotDate: date, reflection, sections }), "Time Capsule Snapshot saved");
    if (s) { onOpenChange(false); reset(); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Camera className="size-5 text-primary" /> Create Time Capsule Snapshot</DialogTitle>
          <DialogDescription>Preserves the recorded context of {p.name} as it is right now. Later edits won't change it. It is not a backup of source code.</DialogDescription>
        </DialogHeader>
        {step === "form" ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="sn-title">Snapshot title *</Label>
                <div className="flex gap-2">
                  <Input id="sn-title" value={title} onChange={(e) => { setTitle(e.target.value); setErr(""); }} />
                  <Button type="button" variant="outline" onClick={() => setTitle(`${p.name} — ${fmtDate(date)}`)}>Suggest</Button>
                </div>
                {err && <p className="text-xs text-destructive">{err}</p>}
              </div>
              <div className="space-y-1.5"><Label htmlFor="sn-date">Snapshot date</Label><Input id="sn-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="sn-ms">Milestone label (optional)</Label><Input id="sn-ms" value={milestone} onChange={(e) => setMilestone(e.target.value)} placeholder="Before pausing, Submission…" /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="sn-reason">Reason for saving</Label><Textarea id="sn-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="sn-ref">Personal reflection (optional)</Label><Textarea id="sn-ref" rows={3} value={reflection} onChange={(e) => setReflection(e.target.value)} /></div>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Sections to include</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {SNAPSHOT_SECTIONS.map((s) => (
                  <label key={s.key} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={sections.includes(s.key)} onCheckedChange={(c) => setSections((prev) => (c ? [...prev, s.key] : prev.filter((x) => x !== s.key)))} />
                    {s.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button disabled={!sections.length} onClick={() => (title.trim() ? setStep("preview") : setErr("Give the snapshot a title."))}>Preview snapshot</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">This is exactly what will be preserved:</p>
            {preview && <SnapshotBody state={preview.state} included={sections} unavailable={preview.unavailable} />}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep("form")}>Back</Button>
              <Button onClick={save}>Save snapshot</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SnapshotBody({ state, included, unavailable }: { state: Snapshot["recordedState"]; included: SnapshotSection[]; unavailable: SnapshotSection[] }) {
  const label = (k: SnapshotSection) => SNAPSHOT_SECTIONS.find((s) => s.key === k)!.label;
  const block = (k: SnapshotSection, body: React.ReactNode) =>
    included.includes(k) ? (
      <div key={k} className="rounded-lg border p-3">
        <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{label(k)}</h4>
        {unavailable.includes(k) ? <NotRecorded>Nothing recorded at snapshot time</NotRecorded> : body}
      </div>
    ) : null;
  const list = (items: { id: string; title: string; badge?: string }[] | undefined) => (
    <ul className="space-y-1 text-sm">{items?.map((i) => <li key={i.id} className="flex items-center justify-between gap-2"><span>{i.title}</span>{i.badge && <StatusPill value={i.badge} />}</li>)}</ul>
  );
  return (
    <div className="grid gap-3">
      {block("description", <div className="space-y-1 text-sm"><p>{state.project?.shortDescription}</p>{state.project?.goals && <Markdown text={state.project.goals} />}</div>)}
      {block("status", <StatusPill value={state.status ? projectStatusLabel(state.status) : ""} />)}
      {block("features", list(state.features?.map((f) => ({ id: f.id, title: f.title, badge: f.implementationStatus }))))}
      {block("bugs", list(state.bugs?.map((f) => ({ id: f.id, title: f.title, badge: f.status }))))}
      {block("improvements", list(state.improvements?.map((f) => ({ id: f.id, title: f.title, badge: f.status }))))}
      {block("ideas", list(state.ideas?.map((f) => ({ id: f.id, title: f.title, badge: f.status }))))}
      {block("version", <p className="text-sm">{state.version ? `${state.version.label} ${state.version.name} (${fmtDate(state.version.releaseDate, "no date")})` : ""}</p>)}
      {block("resources", list(state.resources?.map((f) => ({ id: f.id, title: `${f.name} · ${f.type}` }))))}
      {block("sessions", list(state.sessions?.map((f) => ({ id: f.id, title: `${fmtDate(f.date)} — ${f.title}` }))))}
      {block("nextStep", <div className="space-y-1 text-sm"><p><strong>Stopping point:</strong> {state.stoppingPoint || "—"}</p><p><strong>Next step:</strong> {state.nextStep || "—"}</p></div>)}
      {block("notes", list(state.notes?.map((f) => ({ id: f.id, title: `${f.title} (${f.kind})` }))))}
    </div>
  );
}

export function SnapshotSheet({ snap, onOpenChange }: { snap?: Snapshot; onOpenChange: (o: boolean) => void }) {
  const db = useDB();
  const p = snap && db.projects.find((x) => x.id === snap.projectId);
  return (
    <Sheet open={!!snap} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {snap && (
          <div className="space-y-4">
            <SheetHeader className="p-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Time Capsule Snapshot <SampleBadge show={snap.isSample} /></div>
              <SheetTitle className="font-display text-xl">{snap.title}</SheetTitle>
              <SheetDescription>
                {p && <Link to="/projects/$projectId" params={{ projectId: p.id }} className="hover:underline">{p.icon} {p.name}</Link>} · Snapshot date {fmtDate(snap.snapshotDate)} · Created {fmtDateTime(snap.createdAt)}
              </SheetDescription>
            </SheetHeader>
            <p className="rounded-lg tone-info px-3 py-2 text-xs">A read-only historical record. It reflects what was recorded on {fmtDate(snap.createdAt)}, not the project's current state.</p>
            {snap.milestone && <p className="text-sm"><strong>Milestone:</strong> {snap.milestone}</p>}
            {snap.reason && <p className="text-sm"><strong>Reason:</strong> {snap.reason}</p>}
            {snap.reflection && <div><strong className="text-sm">Reflection</strong><Markdown text={snap.reflection} /></div>}
            <SnapshotBody state={snap.recordedState} included={snap.includedSections} unavailable={snap.unavailableSections} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

type Item = { id: string; title: string; status?: string };
function diffItems(a: Item[] | undefined, b: Item[] | undefined) {
  if (!a || !b) return null;
  const ma = new Map(a.map((x) => [x.id, x]));
  const mb = new Map(b.map((x) => [x.id, x]));
  return {
    added: b.filter((x) => !ma.has(x.id)),
    removed: a.filter((x) => !mb.has(x.id)),
    changed: b.filter((x) => ma.has(x.id) && ma.get(x.id)!.status !== x.status).map((x) => ({ ...x, from: ma.get(x.id)!.status })),
    same: b.filter((x) => ma.has(x.id) && ma.get(x.id)!.status === x.status).length,
  };
}

export function DiffBlock({ title, diff }: { title: string; diff: ReturnType<typeof diffItems> }) {
  return (
    <div className="rounded-lg border p-3">
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {!diff ? <NotRecorded>Not recorded in one or both snapshots — no comparison possible</NotRecorded> : !diff.added.length && !diff.removed.length && !diff.changed.length ? (
        <p className="text-sm text-muted-foreground">No recorded differences ({diff.same} unchanged).</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {diff.added.map((x) => <li key={"a" + x.id} className="text-success">+ {x.title}{x.status && ` (${x.status})`}</li>)}
          {diff.removed.map((x) => <li key={"r" + x.id} className="text-danger line-through">− {x.title}</li>)}
          {diff.changed.map((x) => <li key={"c" + x.id} className="text-warning">~ {x.title}: {x.from} → {x.status}</li>)}
          {diff.same > 0 && <li className="text-xs text-muted-foreground">{diff.same} unchanged</li>}
        </ul>
      )}
    </div>
  );
}

function ValueDiff({ title, a, b }: { title: string; a?: string; b?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h4>
      {a === undefined || b === undefined ? <NotRecorded>Not recorded in one or both snapshots</NotRecorded> : a === b ? (
        <p className="text-sm text-muted-foreground">Unchanged: {a || "—"}</p>
      ) : (
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p className="rounded bg-danger/10 p-2"><span className="block text-xs text-muted-foreground">Earlier</span>{a || "—"}</p>
          <p className="rounded bg-success/10 p-2"><span className="block text-xs text-muted-foreground">Later</span>{b || "—"}</p>
        </div>
      )}
    </div>
  );
}

export function SnapshotCompare({ projectId }: { projectId: string }) {
  const db = useDB();
  const snaps = db.snapshots.filter((s) => s.projectId === projectId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const [aId, setA] = useState(snaps[snaps.length - 2]?.id ?? "");
  const [bId, setB] = useState(snaps[snaps.length - 1]?.id ?? "");
  if (snaps.length < 2) return <p className="text-sm text-muted-foreground">Create at least two snapshots of this project to compare them.</p>;
  let a = snaps.find((s) => s.id === aId);
  let b = snaps.find((s) => s.id === bId);
  if (a && b && a.createdAt > b.createdAt) [a, b] = [b, a];
  const A = a?.recordedState;
  const B = b?.recordedState;
  const st = (x?: Snapshot) => (x && x.includedSections.includes("status") && x.recordedState.status ? projectStatusLabel(x.recordedState.status) : undefined);
  const ns = (x?: Snapshot) => (x && x.includedSections.includes("nextStep") ? x.recordedState.nextStep ?? "" : undefined);
  const v = (x?: Snapshot) => (x && x.includedSections.includes("version") ? (x.recordedState.version ? `${x.recordedState.version.label} ${x.recordedState.version.name}` : "") : undefined);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <GitCompare className="size-4 text-primary" />
        <NativeSelect aria-label="Earlier snapshot" value={aId} onChange={(e) => setA(e.target.value)} className="w-auto">{snaps.map((s) => <option key={s.id} value={s.id}>{s.title} · {fmtDate(s.snapshotDate)}</option>)}</NativeSelect>
        <span className="text-sm">vs</span>
        <NativeSelect aria-label="Later snapshot" value={bId} onChange={(e) => setB(e.target.value)} className="w-auto">{snaps.map((s) => <option key={s.id} value={s.id}>{s.title} · {fmtDate(s.snapshotDate)}</option>)}</NativeSelect>
      </div>
      {a && b && a.id !== b.id ? (
        <div className="grid gap-3 md:grid-cols-2">
          <ValueDiff title="Lifecycle status" a={st(a)} b={st(b)} />
          <ValueDiff title="Recorded next step" a={ns(a)} b={ns(b)} />
          <ValueDiff title="Version" a={v(a)} b={v(b)} />
          <DiffBlock title="Feature states" diff={diffItems(A?.features?.map((f) => ({ id: f.id, title: f.title, status: f.implementationStatus })), B?.features?.map((f) => ({ id: f.id, title: f.title, status: f.implementationStatus })))} />
          <DiffBlock title="Issues" diff={diffItems(A?.bugs, B?.bugs)} />
          <DiffBlock title="Ideas" diff={diffItems(A?.ideas, B?.ideas)} />
          <DiffBlock title="Notes" diff={diffItems(A?.notes, B?.notes)} />
        </div>
      ) : <p className="text-sm text-muted-foreground">Pick two different snapshots.</p>}
    </div>
  );
}

export function SnapshotList({ projectId, onCreate }: { projectId?: string; onCreate?: () => void }) {
  const db = useDB();
  const [q, setQ] = useState("");
  const [proj, setProj] = useState("");
  const [sort, setSort] = useState("new");
  const [view, setView] = useState<Snapshot | undefined>();
  const list = db.snapshots
    .filter((s) => (projectId ? s.projectId === projectId : !proj || s.projectId === proj))
    .filter((s) => !q || [s.title, s.reason, s.milestone].join(" ").toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (sort === "old" ? a.snapshotDate.localeCompare(b.snapshotDate) : b.snapshotDate.localeCompare(a.snapshotDate)));
  const total = db.snapshots.filter((s) => !projectId || s.projectId === projectId).length;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search snapshots…" className="max-w-xs" aria-label="Search snapshots" />
        {!projectId && (
          <NativeSelect aria-label="Project" value={proj} onChange={(e) => setProj(e.target.value)} className="w-auto">
            <option value="">All projects</option>
            {db.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </NativeSelect>
        )}
        <NativeSelect aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className="w-auto">
          <option value="new">Newest first</option><option value="old">Oldest first</option>
        </NativeSelect>
        {onCreate && <Button onClick={onCreate} className="ml-auto"><Camera /> Create snapshot</Button>}
      </div>
      {total === 0 ? (
        <EmptyState icon={<Camera />} title="No snapshots created" body="A Time Capsule Snapshot freezes a project's recorded context — features, bugs, ideas, next step — so you can see how it evolved." action={onCreate && <Button onClick={onCreate}><Camera /> Create snapshot</Button>} />
      ) : list.length === 0 ? (
        <EmptyState title="No snapshots match" />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => {
            const p = db.projects.find((x) => x.id === s.projectId);
            const ver = db.versions.find((v) => v.id === s.relatedVersionId);
            return (
              <li key={s.id}>
                <button onClick={() => setView(s)} className={cn("surface-card w-full p-4 text-left transition hover:shadow-lift")}>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Camera className="size-3.5 text-primary" /> {fmtDate(s.snapshotDate)}</div>
                  <p className="mt-1 font-semibold">{s.title}</p>
                  {!projectId && p && <p className="text-xs text-muted-foreground">{p.icon} {p.name}</p>}
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.milestone || s.reason || "No reason recorded"}</p>
                  {ver && <p className="mt-2 text-xs">Version: {ver.label}</p>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <SnapshotSheet snap={view} onOpenChange={(o) => !o && setView(undefined)} />
    </div>
  );
}
