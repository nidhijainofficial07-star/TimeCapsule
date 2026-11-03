import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useDB } from "@/services/db";
import { searchArchive, SEARCH_TYPE_LABEL, type SearchHit, type SearchType } from "@/services/search";
import { EmptyState, PageHeader } from "@/components/tc/common";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_workspace/search")({
  validateSearch: (s: Record<string, unknown>): { q?: string } => ({ q: typeof s.q === "string" ? s.q : undefined }),
  head: () => ({
    meta: [
      { title: "Search — Project TimeCapsule" },
      { name: "description", content: "Search across projects, features, bugs, ideas, sessions, versions, snapshots, resources and notes." },
      { property: "og:title", content: "Search — Project TimeCapsule" },
      { property: "og:description", content: "Find anything in your archive." },
    ],
  }),
  component: SearchPage,
});

function HitLink({ h, children }: { h: SearchHit; children: React.ReactNode }) {
  const cls = "font-semibold hover:underline";
  if (h.type === "projects") return <Link to="/projects/$projectId" params={{ projectId: h.id }} className={cls}>{children}</Link>;
  if (h.type === "inbox") return <Link to="/ideas" search={{ tab: "inbox" }} className={cls}>{children}</Link>;
  if (h.projectId) return <Link to="/projects/$projectId" params={{ projectId: h.projectId }} search={{ tab: h.type as "bugs", record: h.id }} className={cls}>{children}</Link>;
  if (h.type === "ideas" || h.type === "notes") return <Link to="/ideas" search={{ tab: h.type, record: h.id }} className={cls}>{children}</Link>;
  if (h.type === "resources") return <Link to="/resources" search={{ record: h.id }} className={cls}>{children}</Link>;
  return <span className={cls}>{children}</span>;
}

function SearchPage() {
  const { q = "" } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const db = useDB();
  const [text, setText] = useState(q);
  useEffect(() => setText(q), [q]);
  const hits = useMemo(() => searchArchive(db, q), [db, q]);
  const groups = useMemo(() => {
    const m = new Map<SearchType, SearchHit[]>();
    for (const h of hits) m.set(h.type, [...(m.get(h.type) ?? []), h]);
    return [...m.entries()];
  }, [hits]);

  return (
    <div>
      <PageHeader title="Search the archive" description="Searches everything saved in this browser." />
      <form onSubmit={(e) => { e.preventDefault(); navigate({ search: { q: text } }); }} className="relative mb-6 max-w-2xl" role="search">
        <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
        <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} className="h-10 pl-9" placeholder="Search projects, bugs, ideas, sessions…" aria-label="Search query" />
      </form>
      {!q ? (
        <EmptyState icon={<Search />} title="Type something to search" body="Tip: press / anywhere to jump to search." />
      ) : hits.length === 0 ? (
        <EmptyState icon={<Search />} title={`Nothing found for “${q}”`} body="Try a shorter or different word." />
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">{hits.length} results</p>
          {groups.map(([type, list]) => (
            <section key={type}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{SEARCH_TYPE_LABEL[type]} ({list.length})</h2>
              <ul className="divide-y overflow-hidden rounded-xl border bg-card">
                {list.map((h) => {
                  const p = h.projectId && h.type !== "projects" ? db.projects.find((x) => x.id === h.projectId) : undefined;
                  return (
                    <li key={h.type + h.id} className="px-4 py-3">
                      <HitLink h={h}>{h.title}</HitLink>
                      <p className="text-xs text-muted-foreground">{p ? `${p.icon} ${p.name} · ` : ""}matched in {h.matchedIn}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{h.excerpt}</p>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
