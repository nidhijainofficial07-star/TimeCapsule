import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FolderKanban, LayoutGrid, List, Plus, Search, X, Zap } from "lucide-react";
import { useDB } from "@/services/db";
import { updatePreferences } from "@/services/preferences";
import { projectSummary, sortProjects, SORT_OPTIONS } from "@/services/selectors";
import { searchArchive } from "@/services/search";
import { PROJECT_CATEGORIES, PROJECT_STATUSES } from "@/lib/constants";
import type { ProjectSort } from "@/lib/types";
import { EmptyState, PageHeader, SampleBadge } from "@/components/tc/common";
import { NativeSelect } from "@/components/tc/fields";
import { ProjectCard, ProjectIcon, ProjectStatusPill } from "@/features/projects/ProjectCard";
import { QuickProjectDialog } from "@/features/projects/QuickProjectDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate } from "@/lib/format";

type Search = { status?: string; has?: string; q?: string };

export const Route = createFileRoute("/_workspace/projects/")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    status: typeof s.status === "string" ? s.status : undefined,
    has: typeof s.has === "string" ? s.has : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "All Projects — Project TimeCapsule" },
      { name: "description", content: "Browse, search, filter and sort every project in your archive." },
      { property: "og:title", content: "All Projects — Project TimeCapsule" },
      { property: "og:description", content: "Every project you've added, in one library." },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const db = useDB();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/projects/" });
  const [q, setQ] = useState(search.q ?? "");
  const [statuses, setStatuses] = useState<string[]>(search.status ? [search.status] : []);
  const [tech, setTech] = useState("");
  const [tag, setTag] = useState("");
  const [category, setCategory] = useState("");
  const [createdAfter, setCreatedAfter] = useState("");
  const [updatedAfter, setUpdatedAfter] = useState("");
  const [reviewedBefore, setReviewedBefore] = useState("");
  const [hasBugs, setHasBugs] = useState(search.has === "bugs");
  const [hasUnfinished, setHasUnfinished] = useState(false);
  const [hasIdeas, setHasIdeas] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(search.status === "archived");
  const [sort, setSort] = useState<ProjectSort>(db.preferences.defaultSort);
  const [quick, setQuick] = useState(false);
  const view = db.preferences.defaultView;

  const techs = useMemo(() => Array.from(new Set(db.projects.flatMap((p) => p.technologies))).sort(), [db.projects]);
  const tags = useMemo(() => Array.from(new Set(db.projects.flatMap((p) => p.tags))).sort(), [db.projects]);

  const { list, matches } = useMemo(() => {
    const matchMap = new Map<string, string[]>();
    if (q.trim()) {
      for (const h of searchArchive(db, q, ["projects", "features", "ideas", "notes", "resources"])) {
        if (!h.projectId) continue;
        const where = h.type === "projects" ? h.matchedIn : `${h.type.slice(0, -1)} “${h.title}”`;
        matchMap.set(h.projectId, [...(matchMap.get(h.projectId) ?? []), where]);
      }
    }
    let l = db.projects.filter((p) => {
      if (!includeArchived && p.status === "archived" && !statuses.includes("archived")) return false;
      if (statuses.length && !statuses.includes(p.status)) return false;
      if (tech && !p.technologies.includes(tech)) return false;
      if (tag && !p.tags.includes(tag)) return false;
      if (category && p.category !== category) return false;
      if (createdAfter && p.createdAt.slice(0, 10) < createdAfter) return false;
      if (updatedAfter && p.updatedAt.slice(0, 10) < updatedAfter) return false;
      if (reviewedBefore && p.lastReviewedAt && p.lastReviewedAt.slice(0, 10) >= reviewedBefore) return false;
      const s = projectSummary(db, p);
      if (hasBugs && !s.openBugs) return false;
      if (hasUnfinished && !s.unfinishedFeatures) return false;
      if (hasIdeas && !s.unreviewedIdeas) return false;
      if (q.trim() && !matchMap.has(p.id)) return false;
      return true;
    });
    l = sortProjects(db, l, sort);
    return { list: l, matches: matchMap };
  }, [db, q, statuses, tech, tag, category, createdAfter, updatedAfter, reviewedBefore, hasBugs, hasUnfinished, hasIdeas, includeArchived, sort]);

  const active = q || statuses.length || tech || tag || category || createdAfter || updatedAfter || reviewedBefore || hasBugs || hasUnfinished || hasIdeas || includeArchived;
  const clear = () => {
    setQ(""); setStatuses([]); setTech(""); setTag(""); setCategory(""); setCreatedAfter(""); setUpdatedAfter("");
    setReviewedBefore(""); setHasBugs(false); setHasUnfinished(false); setHasIdeas(false); setIncludeArchived(false);
    navigate({ search: {} });
  };

  return (
    <div>
      <PageHeader
        title="All Projects"
        description="Every project you've added. Feature counts reflect what's recorded — not how complete a project is."
        actions={<>
          <Button variant="outline" onClick={() => setQuick(true)}><Zap /> Quick project</Button>
          <Button asChild><Link to="/projects/new"><Plus /> Add Project</Link></Button>
        </>}
      />

      <div className="surface-card mb-4 space-y-3 p-3">
        <div className="flex flex-col gap-2 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" placeholder="Search names, descriptions, technologies, tags, features, ideas, notes, resources…" aria-label="Search projects" />
          </div>
          <NativeSelect aria-label="Sort projects" value={sort} onChange={(e) => setSort(e.target.value as ProjectSort)} className="md:w-56">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </NativeSelect>
          <div className="flex rounded-md border p-0.5" role="group" aria-label="View">
            <Button size="sm" variant={view === "grid" ? "secondary" : "ghost"} onClick={() => updatePreferences({ defaultView: "grid" })} aria-pressed={view === "grid"} aria-label="Grid view"><LayoutGrid /></Button>
            <Button size="sm" variant={view === "list" ? "secondary" : "ghost"} onClick={() => updatePreferences({ defaultView: "list" })} aria-pressed={view === "list"} aria-label="List view"><List /></Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PROJECT_STATUSES.map((s) => {
            const on = statuses.includes(s.value);
            return (
              <button key={s.value} type="button" aria-pressed={on} onClick={() => setStatuses((p) => (on ? p.filter((x) => x !== s.value) : [...p, s.value]))}
                className={on ? "rounded-full border border-primary bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground" : "rounded-full border px-2.5 py-1 text-xs font-medium hover:bg-accent"}>
                {s.label}
              </button>
            );
          })}
          <NativeSelect aria-label="Technology" value={tech} onChange={(e) => setTech(e.target.value)} className="h-8 w-auto">
            <option value="">Any technology</option>
            {techs.map((t) => <option key={t}>{t}</option>)}
          </NativeSelect>
          <NativeSelect aria-label="Tag" value={tag} onChange={(e) => setTag(e.target.value)} className="h-8 w-auto">
            <option value="">Any tag</option>
            {tags.map((t) => <option key={t}>{t}</option>)}
          </NativeSelect>
          <NativeSelect aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-8 w-auto">
            <option value="">Any category</option>
            {PROJECT_CATEGORIES.map((t) => <option key={t}>{t}</option>)}
          </NativeSelect>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <label className="flex items-center gap-1.5">Created after <Input type="date" value={createdAfter} onChange={(e) => setCreatedAfter(e.target.value)} className="h-8 w-auto" /></label>
          <label className="flex items-center gap-1.5">Updated after <Input type="date" value={updatedAfter} onChange={(e) => setUpdatedAfter(e.target.value)} className="h-8 w-auto" /></label>
          <label className="flex items-center gap-1.5">Not reviewed since <Input type="date" value={reviewedBefore} onChange={(e) => setReviewedBefore(e.target.value)} className="h-8 w-auto" /></label>
          <label className="flex items-center gap-1.5"><Checkbox checked={hasBugs} onCheckedChange={(c) => setHasBugs(!!c)} /> Open bugs</label>
          <label className="flex items-center gap-1.5"><Checkbox checked={hasUnfinished} onCheckedChange={(c) => setHasUnfinished(!!c)} /> Unfinished features</label>
          <label className="flex items-center gap-1.5"><Checkbox checked={hasIdeas} onCheckedChange={(c) => setHasIdeas(!!c)} /> Unreviewed ideas</label>
          <label className="flex items-center gap-1.5"><Checkbox checked={includeArchived} onCheckedChange={(c) => setIncludeArchived(!!c)} /> Include archived</label>
          {active ? <Button size="sm" variant="ghost" onClick={clear}><X /> Clear filters</Button> : null}
        </div>
      </div>

      {db.projects.length === 0 ? (
        <EmptyState icon={<FolderKanban />} title="No projects yet" body="Add your first project — only the name is required. You can fill in the rest gradually." action={<Button asChild><Link to="/projects/new"><Plus /> Add Project</Link></Button>} />
      ) : list.length === 0 ? (
        <EmptyState icon={<Search />} title="No projects match" body="Try removing some filters." action={<Button variant="outline" onClick={clear}>Clear filters</Button>} />
      ) : view === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <div key={p.id} className="flex flex-col">
              <ProjectCard p={p} />
              {matches.get(p.id) && <p className="mt-1 px-1 text-xs text-muted-foreground">Found in: {matches.get(p.id)!.slice(0, 3).join(", ")}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="surface-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead><TableHead>Status</TableHead><TableHead className="hidden md:table-cell">Technologies</TableHead>
                <TableHead>Open bugs</TableHead><TableHead className="hidden lg:table-cell">Ideas to review</TableHead>
                <TableHead className="hidden md:table-cell">Updated</TableHead><TableHead className="hidden lg:table-cell">Reviewed</TableHead><TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((p) => {
                const s = projectSummary(db, p);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ProjectIcon p={p} size="sm" />
                        <div className="min-w-0">
                          <Link to="/projects/$projectId" params={{ projectId: p.id }} className="font-semibold hover:underline">{p.name}</Link> <SampleBadge show={p.isSample} />
                          {matches.get(p.id) && <div className="text-xs text-muted-foreground">Found in: {matches.get(p.id)!.slice(0, 2).join(", ")}</div>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><ProjectStatusPill status={p.status} /></TableCell>
                    <TableCell className="hidden text-xs md:table-cell">{p.technologies.join(", ") || "—"}</TableCell>
                    <TableCell className="tabular-nums">{s.openBugs}</TableCell>
                    <TableCell className="hidden tabular-nums lg:table-cell">{s.unreviewedIdeas}</TableCell>
                    <TableCell className="hidden text-xs md:table-cell">{fmtDate(p.updatedAt)}</TableCell>
                    <TableCell className="hidden text-xs lg:table-cell">{fmtDate(p.lastReviewedAt, "Never")}</TableCell>
                    <TableCell><Button asChild size="sm" variant="secondary"><Link to="/resume/$projectId" params={{ projectId: p.id }}>Resume</Link></Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <QuickProjectDialog open={quick} onOpenChange={setQuick} />
    </div>
  );
}
