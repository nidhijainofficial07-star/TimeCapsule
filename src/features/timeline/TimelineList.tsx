import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { History } from "lucide-react";
import { useDB } from "@/services/db";
import { EmptyState, SampleBadge } from "@/components/tc/common";
import { NativeSelect } from "@/components/tc/fields";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fmtDate, fmtDateTime } from "@/lib/format";
import type { ActivityEvent } from "@/lib/types";

const TYPE_LABELS: Record<string, string> = {
  projects: "Project changes", features: "Features", bugs: "Bugs", improvements: "Improvements", ideas: "Ideas",
  resources: "Resources", versions: "Versions", sessions: "Development sessions", snapshots: "Snapshots", notes: "Notes", inbox: "Inbox", import: "Imports",
};

const TAB_FOR: Record<string, "overview" | "features" | "bugs" | "improvements" | "ideas" | "resources" | "versions" | "sessions" | "snapshots" | "description"> = {
  features: "features", bugs: "bugs", improvements: "improvements", ideas: "ideas", resources: "resources",
  versions: "versions", sessions: "sessions", snapshots: "snapshots", notes: "description", projects: "overview",
};

export function EventLink({ e, children }: { e: ActivityEvent; children: React.ReactNode }) {
  if (!e.projectId) {
    if (e.entityType === "ideas" || e.entityType === "notes") return <Link to="/ideas" search={{ record: e.entityId, tab: e.entityType === "notes" ? "notes" : "ideas" }} className="hover:underline">{children}</Link>;
    if (e.entityType === "inbox") return <Link to="/ideas" search={{ tab: "inbox" }} className="hover:underline">{children}</Link>;
    return <>{children}</>;
  }
  const tab = TAB_FOR[e.entityType] ?? ("overview" as const);
  return (
    <Link to="/projects/$projectId" params={{ projectId: e.projectId }} search={{ tab, record: e.entityType !== "projects" && !e.eventType.endsWith("deleted") ? e.entityId : undefined }} className="hover:underline">
      {children}
    </Link>
  );
}

export function TimelineList({ projectId }: { projectId?: string }) {
  const db = useDB();
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [proj, setProj] = useState("");

  const events = useMemo(() => {
    return db.activity
      .filter((e) => (projectId ? e.projectId === projectId : !proj || e.projectId === proj))
      .filter((e) => !type || e.entityType === type)
      .filter((e) => !from || e.occurredAt.slice(0, 10) >= from)
      .filter((e) => !to || e.occurredAt.slice(0, 10) <= to)
      .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [db.activity, projectId, type, from, to, proj]);

  const groups = useMemo(() => {
    const m = new Map<string, ActivityEvent[]>();
    for (const e of events) {
      const k = e.occurredAt.slice(0, 7);
      m.set(k, [...(m.get(k) ?? []), e]);
    }
    return [...m.entries()];
  }, [events]);

  const types = Array.from(new Set(db.activity.map((e) => e.entityType)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {!projectId && (
          <NativeSelect aria-label="Project" value={proj} onChange={(e) => setProj(e.target.value)} className="w-auto">
            <option value="">All projects</option>
            {db.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </NativeSelect>
        )}
        <NativeSelect aria-label="Event type" value={type} onChange={(e) => setType(e.target.value)} className="w-auto">
          <option value="">All event types</option>
          {types.map((t) => <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>)}
        </NativeSelect>
        <label className="flex items-center gap-1.5 text-sm">From <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto" /></label>
        <label className="flex items-center gap-1.5 text-sm">To <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto" /></label>
        {(type || from || to || proj) && <Button size="sm" variant="ghost" onClick={() => { setType(""); setFrom(""); setTo(""); setProj(""); }}>Clear</Button>}
      </div>
      {events.length === 0 ? (
        <EmptyState icon={<History />} title="No events" body="The timeline is built only from things you actually record — nothing is reconstructed or invented." />
      ) : (
        groups.map(([month, list]) => (
          <section key={month}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{fmtDate(month + "-01").replace(/^\d+ /, "")}</h3>
            <ol className="relative ml-2 space-y-3 border-l pl-5">
              {list.map((e) => {
                const p = e.projectId ? db.projects.find((x) => x.id === e.projectId) : undefined;
                const imported = e.recordedAt.slice(0, 10) !== e.occurredAt.slice(0, 10);
                return (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[26px] top-1.5 size-2.5 rounded-full border-2 border-background bg-primary" aria-hidden="true" />
                    <p className="text-sm"><EventLink e={e}>{e.description}</EventLink> <SampleBadge show={e.isSample} /></p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDateTime(e.occurredAt)}
                      {imported && ` · recorded ${fmtDate(e.recordedAt)}`}
                      {!projectId && p && <> · {p.icon} {p.name}</>}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}
