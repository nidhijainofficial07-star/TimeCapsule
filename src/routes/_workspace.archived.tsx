import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Archive } from "lucide-react";
import { useDB } from "@/services/db";
import { EmptyState, PageHeader, SampleBadge } from "@/components/tc/common";
import { ProjectIcon } from "@/features/projects/ProjectCard";
import { StatusDialog } from "@/features/projects/lifecycle";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/format";
import type { Project } from "@/lib/types";

export const Route = createFileRoute("/_workspace/archived")({
  head: () => ({
    meta: [
      { title: "Archived Projects — Project TimeCapsule" },
      { name: "description", content: "Projects kept for reference. Every record is preserved and can be restored." },
      { property: "og:title", content: "Archived Projects — Project TimeCapsule" },
      { property: "og:description", content: "Archived, never deleted." },
    ],
  }),
  component: ArchivedPage,
});

function ArchivedPage() {
  const db = useDB();
  const [restore, setRestore] = useState<Project | null>(null);
  const list = db.projects.filter((p) => p.status === "archived").sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));
  return (
    <div>
      <PageHeader title="Archived Projects" description="Archived projects keep all their records. Restore one any time." />
      {list.length === 0 ? (
        <EmptyState icon={<Archive />} title="No archived projects" body="Archive a project from its workspace when it's no longer active. Nothing is deleted." />
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {list.map((p) => {
            const last = [...p.lifecycleHistory].reverse().find((h) => h.to === "archived");
            return (
              <li key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <ProjectIcon p={p} />
                <div className="min-w-0 flex-1">
                  <Link to="/projects/$projectId" params={{ projectId: p.id }} className="font-semibold hover:underline">{p.name}</Link> <SampleBadge show={p.isSample} />
                  <p className="text-xs text-muted-foreground">Archived {fmtDate(p.archivedAt)}{last?.reason && ` — ${last.reason}`}</p>
                </div>
                <Button variant="outline" onClick={() => setRestore(p)}>Restore</Button>
              </li>
            );
          })}
        </ul>
      )}
      {restore && <StatusDialog p={restore} open={!!restore} initial="paused" onOpenChange={(o) => !o && setRestore(null)} />}
    </div>
  );
}
