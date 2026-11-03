import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { RecordKind, Idea, Resource } from "@/lib/types";
import { RECORD_CONFIG } from "./config";
import { RecordFormDialog } from "./RecordForm";
import { useDB } from "@/services/db";
import { convertIdea, deleteRecord, updateRecord } from "@/services/archive";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NativeSelect } from "@/components/tc/fields";
import { EmptyState, Markdown, NotRecorded, SampleBadge, StatusPill, attempt, useConfirm } from "@/components/tc/common";
import { fmtDate, fmtDateTime, isLikelyUrl } from "@/lib/format";
import { ExternalLink, FileWarning, Lightbulb, Pencil, Pin, Plus, Search, Trash2, Wand2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Rec = Record<string, unknown> & { id: string; createdAt: string; updatedAt: string; isSample?: boolean };

export function RecordManager({
  kind, projectId, openId, onOpenIdChange, toolbarExtra, filterFn, hideHeaderAdd,
}: {
  kind: RecordKind;
  projectId?: string;
  openId?: string;
  onOpenIdChange?: (id: string | undefined) => void;
  toolbarExtra?: ReactNode;
  filterFn?: (r: Rec) => boolean;
  hideHeaderAdd?: boolean;
}) {
  const db = useDB();
  const cfg = RECORD_CONFIG[kind];
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState("updated");
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [viewId, setViewIdState] = useState<string | undefined>(openId);
  const { ask, dialog } = useConfirm();

  useEffect(() => setViewIdState(openId), [openId]);
  const setViewId = (id: string | undefined) => {
    setViewIdState(id);
    onOpenIdChange?.(id);
  };

  const all = useMemo(() => {
    let list = db[kind] as unknown as Rec[];
    if (projectId) list = list.filter((r) => r.projectId === projectId);
    if (filterFn) list = list.filter(filterFn);
    return list;
  }, [db, kind, projectId, filterFn]);

  const nameOf = (key: string, val: string) => {
    if (!val) return "";
    if (key === "projectId") return db.projects.find((p) => p.id === val)?.name ?? "Unknown project";
    if (key.toLowerCase().includes("version")) return db.versions.find((x) => x.id === val)?.label ?? "Unknown version";
    if (key.toLowerCase().includes("feature")) return db.features.find((x) => x.id === val)?.title ?? "Unknown feature";
    return val;
  };

  const filterOptions = (key: string) => {
    const fd = cfg.fields.find((f) => f.key === key);
    if (fd?.options) return fd.options.map((o) => ({ value: o, label: o }));
    const vals = Array.from(new Set(all.map((r) => String(r[key] ?? "")).filter(Boolean)));
    return vals.map((v) => ({ value: v, label: nameOf(key, v) }));
  };
  const activeFilters = cfg.filters.filter((f) => !(projectId && f === "projectId"));

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = all.filter((r) => {
      for (const [k, v] of Object.entries(filters)) {
        if (!v) continue;
        if (v === "__none" ? r[k] : String(r[k] ?? "") !== v) return false;
      }
      if (!needle) return true;
      return Object.values(r).some((v) => (Array.isArray(v) ? v.join(" ") : String(v ?? "")).toLowerCase().includes(needle));
    });
    const title = (r: Rec) => String(r[cfg.titleKey] ?? "");
    list = [...list].sort((a, b) => {
      if (kind === "resources" || kind === "notes") {
        const pin = Number(b.pinned === "yes") - Number(a.pinned === "yes");
        if (pin) return pin;
      }
      if (sort === "alpha") return title(a).localeCompare(title(b));
      if (sort === "created") return b.createdAt.localeCompare(a.createdAt);
      if (sort === "oldest") return a.createdAt.localeCompare(b.createdAt);
      if (sort === "date" && cfg.dateKey) return String(b[cfg.dateKey] ?? "").localeCompare(String(a[cfg.dateKey] ?? ""));
      if (sort === "priority") {
        const order = ["Critical", "High", "Medium", "Low"];
        return order.indexOf(String(a.priority)) - order.indexOf(String(b.priority));
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    return list;
  }, [all, q, filters, sort, cfg, kind]);

  const viewing = all.find((r) => r.id === viewId) ?? (viewId ? (db[kind] as unknown as Rec[]).find((r) => r.id === viewId) : undefined);
  const hasFilters = q || Object.values(filters).some(Boolean);

  const openNew = () => {
    setEditId(undefined);
    setFormOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${cfg.plural.toLowerCase()}…`} className="pl-8" aria-label={`Search ${cfg.plural}`} />
        </div>
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((f) => {
            const label = cfg.fields.find((x) => x.key === f)?.label ?? (f === "projectId" ? "Project" : f);
            const opts = filterOptions(f);
            return (
              <NativeSelect key={f} aria-label={`Filter by ${label}`} value={filters[f] ?? ""} onChange={(e) => setFilters((p) => ({ ...p, [f]: e.target.value }))} className="w-auto min-w-32">
                <option value="">{label}: all</option>
                {f === "projectId" && <option value="__none">Unassigned</option>}
                {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </NativeSelect>
            );
          })}
          <NativeSelect aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className="w-auto">
            <option value="updated">Recently updated</option>
            <option value="created">Recently created</option>
            <option value="oldest">Oldest first</option>
            <option value="alpha">A–Z</option>
            {cfg.fields.some((f) => f.key === "priority") && <option value="priority">Priority</option>}
            {cfg.dateKey && <option value="date">By date</option>}
          </NativeSelect>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setQ(""); setFilters({}); }}><X /> Clear</Button>
          )}
          {toolbarExtra}
          {!hideHeaderAdd && <Button onClick={openNew}><Plus /> Add {cfg.singular.toLowerCase()}</Button>}
        </div>
      </div>

      {all.length === 0 ? (
        <EmptyState icon={<Lightbulb />} title={`No ${cfg.plural.toLowerCase()} recorded yet`} body={cfg.emptyBody} action={<Button onClick={openNew}><Plus /> Add {cfg.singular.toLowerCase()}</Button>} />
      ) : shown.length === 0 ? (
        <EmptyState icon={<Search />} title="Nothing matches" body="Try a different search or clear the filters." action={<Button variant="outline" onClick={() => { setQ(""); setFilters({}); }}>Clear filters</Button>} />
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {shown.map((r) => {
            const sub = cfg.subtitleKey ? String(r[cfg.subtitleKey] ?? "") : "";
            const proj = !projectId && r.projectId ? db.projects.find((p) => p.id === r.projectId) : undefined;
            return (
              <li key={r.id}>
                <button type="button" onClick={() => setViewId(r.id)} className="flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-accent/40 focus-visible:bg-accent/40 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {r.pinned === "yes" && <Pin className="size-3.5 text-primary" aria-label="Pinned" />}
                      <span className="font-semibold">{String(r[cfg.titleKey] || "Untitled")}</span>
                      {kind === "versions" && r.name ? <span className="text-muted-foreground">{String(r.name)}</span> : null}
                      <SampleBadge show={r.isSample} />
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      {proj && <span>{proj.icon} {proj.name}</span>}
                      {kind !== "versions" && kind !== "sessions" && !projectId && !r.projectId && "projectId" in r && <span className="italic">Unassigned</span>}
                      {sub && <span className="line-clamp-1 max-w-xl">{sub.replace(/\n/g, " · ")}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {cfg.badges.map((b) => <StatusPill key={b} value={String(r[b] ?? "")} />)}
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {cfg.dateKey && r[cfg.dateKey] ? fmtDate(String(r[cfg.dateKey])) : fmtDate(r.updatedAt)}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">{shown.length} of {all.length} shown</p>

      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewId(undefined)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {viewing && (
            <RecordDetail
              kind={kind}
              rec={viewing}
              nameOf={nameOf}
              onEdit={() => { setEditId(viewing.id); setFormOpen(true); }}
              onDelete={() =>
                ask({ title: `Delete this ${cfg.singular.toLowerCase()}?`, body: "This permanently removes the record. A deletion event stays in the timeline.", confirm: "Delete", destructive: true }, () => {
                  attempt(() => deleteRecord(kind, viewing.id), `${cfg.singular} deleted`);
                  setViewId(undefined);
                })
              }
            />
          )}
        </SheetContent>
      </Sheet>

      <RecordFormDialog kind={kind} open={formOpen} onOpenChange={setFormOpen} recordId={editId} projectId={projectId} />
      {dialog}
    </div>
  );
}

function RecordDetail({ kind, rec, nameOf, onEdit, onDelete }: { kind: RecordKind; rec: Rec; nameOf: (k: string, v: string) => string; onEdit: () => void; onDelete: () => void }) {
  const db = useDB();
  const cfg = RECORD_CONFIG[kind];
  const statusField = cfg.fields.find((f) => f.key === "status" || f.key === "implementationStatus");
  const project = rec.projectId ? db.projects.find((p) => p.id === rec.projectId) : undefined;

  return (
    <div className="space-y-5">
      <SheetHeader className="p-0">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {cfg.singular} <SampleBadge show={rec.isSample} />
        </div>
        <SheetTitle className="font-display text-xl">{String(rec[cfg.titleKey] || "Untitled")}</SheetTitle>
        <SheetDescription>
          {project ? (
            <Link to="/projects/$projectId" params={{ projectId: project.id }} className="underline-offset-2 hover:underline">{project.icon} {project.name}</Link>
          ) : "projectId" in rec ? "Not linked to a project" : null}
          {" · "}Created {fmtDateTime(rec.createdAt)} · Updated {fmtDateTime(rec.updatedAt)}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onEdit}><Pencil /> Edit</Button>
        {statusField?.options && (
          <QuickStatus kind={kind} rec={rec} field={statusField.key} options={statusField.options} />
        )}
        {kind === "resources" && <OpenResource r={rec as unknown as Resource} />}
        {kind === "ideas" && <ConvertIdea idea={rec as unknown as Idea} />}
        <Button size="sm" variant="ghost" className="text-destructive" onClick={onDelete}><Trash2 /> Delete</Button>
      </div>

      {kind === "bugs" && rec.status === "Fixed" && rec.verificationStatus !== "Verified Fixed" && (
        <p className="rounded-lg tone-warning px-3 py-2 text-sm">Marked Fixed but not yet verified. Retest and set verification when you've confirmed it.</p>
      )}
      {kind === "features" && rec.implementationStatus === "Implemented" && rec.verificationStatus === "Not Verified" && (
        <p className="rounded-lg tone-info px-3 py-2 text-sm">Implemented, but not verified as working.</p>
      )}
      {kind === "ideas" && (rec as unknown as Idea).convertedTo?.length ? (
        <p className="rounded-lg tone-primary px-3 py-2 text-sm">
          Converted to {(rec as unknown as Idea).convertedTo!.map((c) => (c.kind === "features" ? "a feature" : "an improvement")).join(" and ")}. The idea itself was kept as-is.
        </p>
      ) : null}
      {(kind === "features" || kind === "improvements") && rec.convertedFromIdeaId ? (
        <p className="text-xs text-muted-foreground">Created from an idea: {db.ideas.find((i) => i.id === rec.convertedFromIdeaId)?.title ?? "(idea removed)"}</p>
      ) : null}

      <dl className="space-y-4">
        {cfg.fields.filter((f) => f.key !== cfg.titleKey).map((f) => {
          const raw = rec[f.key];
          const empty = raw === "" || raw === undefined || raw === null || (Array.isArray(raw) && raw.length === 0);
          let content: ReactNode;
          if (empty) content = <NotRecorded />;
          else if (f.type === "textarea") content = <Markdown text={String(raw)} />;
          else if (f.type === "select") content = <StatusPill value={String(raw)} />;
          else if (f.type === "tags") content = <div className="flex flex-wrap gap-1">{(raw as string[]).map((t) => <span key={t} className="rounded bg-secondary px-1.5 py-0.5 text-xs">{t}</span>)}</div>;
          else if (f.type === "date") content = <span className="text-sm">{fmtDate(String(raw))}</span>;
          else if (f.type === "toggle") content = <span className="text-sm">{raw === "yes" ? "Yes" : "No"}</span>;
          else if (f.type === "url" || isLikelyUrl(String(raw))) content = <a className="break-all text-sm text-primary underline" href={String(raw)} target="_blank" rel="noreferrer noopener">{String(raw)}</a>;
          else if (["version", "feature", "project"].includes(f.type)) content = <span className="text-sm">{nameOf(f.key, String(raw))}</span>;
          else content = <span className="text-sm">{String(raw)}</span>;
          return (
            <div key={f.key}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{f.label}</dt>
              <dd className="mt-1">{content}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function QuickStatus({ kind, rec, field, options }: { kind: RecordKind; rec: Rec; field: string; options: string[] }) {
  return (
    <NativeSelect
      aria-label="Change status"
      className="h-8 w-auto"
      value={String(rec[field] ?? "")}
      onChange={(e) => attempt(() => updateRecord(kind, rec.id, { [field]: e.target.value }), "Status updated")}
    >
      {options.map((o) => <option key={o}>{o}</option>)}
    </NativeSelect>
  );
}

function OpenResource({ r }: { r: Resource }) {
  const [msg, setMsg] = useState<string | null>(null);
  const isImage = /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(r.url);
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => {
          if (r.url && /^https?:\/\//i.test(r.url)) {
            const w = window.open(r.url, "_blank", "noopener,noreferrer");
            if (!w) setMsg("Your browser blocked the new tab. Copy the link instead.");
          } else if (r.fileReference) {
            setMsg(`"${r.fileReference}" is a file reference only — the file itself isn't stored in TimeCapsule yet (cloud file storage isn't connected).`);
          } else setMsg("This resource has no link or file reference to open.");
        }}
      >
        {r.url ? <ExternalLink /> : <FileWarning />} Open
      </Button>
      {msg && <p className="basis-full rounded-lg tone-warning px-3 py-2 text-sm" role="status">{msg}</p>}
      {isImage && <img src={r.url} alt={r.name} className="basis-full max-h-64 rounded-lg border object-contain" onError={() => setMsg("Image preview couldn't be loaded — the link may be unavailable.")} />}
    </>
  );
}

function ConvertIdea({ idea }: { idea: Idea }) {
  const db = useDB();
  const [pid, setPid] = useState(idea.projectId);
  const run = (kind: "features" | "improvements") => {
    const res = attempt(() => convertIdea(idea.id, kind, pid));
    if (res) toast.success(`Created ${kind === "features" ? "feature" : "improvement"} from this idea`, { description: "The idea's status was not changed." });
  };
  return (
    <div className={cn("flex flex-wrap items-center gap-2 basis-full rounded-lg border border-dashed p-2")}>
      <Wand2 className="size-4 text-primary" />
      <span className="text-sm">Convert to:</span>
      {!idea.projectId && (
        <NativeSelect aria-label="Project for conversion" className="h-8 w-auto" value={pid} onChange={(e) => setPid(e.target.value)}>
          <option value="">— choose project —</option>
          {db.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </NativeSelect>
      )}
      <Button size="sm" variant="secondary" disabled={!pid} onClick={() => run("features")}>Feature</Button>
      <Button size="sm" variant="secondary" disabled={!pid} onClick={() => run("improvements")}>Improvement</Button>
    </div>
  );
}
