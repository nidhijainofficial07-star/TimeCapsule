import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Section } from "@/components/tc/common";
import { SnapshotCompare, SnapshotList, CreateSnapshotDialog } from "@/features/snapshots/snapshots";
import { NativeSelect } from "@/components/tc/fields";
import { Button } from "@/components/ui/button";
import { useDB } from "@/services/db";
import { Camera } from "lucide-react";

export const Route = createFileRoute("/_workspace/snapshots")({
  head: () => ({
    meta: [
      { title: "Time Capsule Snapshots — Project TimeCapsule" },
      { name: "description", content: "Frozen moments of each project's recorded context, ready to compare." },
      { property: "og:title", content: "Time Capsule Snapshots — Project TimeCapsule" },
      { property: "og:description", content: "See how your projects evolved." },
    ],
  }),
  component: SnapshotsPage,
});

function SnapshotsPage() {
  const db = useDB();
  const [pid, setPid] = useState(db.projects[0]?.id ?? "");
  const [cmp, setCmp] = useState(db.projects[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Time Capsule Snapshots"
        description="A snapshot preserves the recorded context of a project at a moment in time. It isn't a source-code backup."
        actions={db.projects.length > 0 && (
          <div className="flex gap-2">
            <NativeSelect aria-label="Project for new snapshot" value={pid} onChange={(e) => setPid(e.target.value)} className="w-auto">
              {db.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </NativeSelect>
            <Button onClick={() => setOpen(true)} disabled={!pid}><Camera /> Create snapshot</Button>
          </div>
        )}
      />
      <SnapshotList />
      {db.projects.length > 0 && (
        <Section title="Compare two snapshots of a project" action={
          <NativeSelect aria-label="Project to compare" value={cmp} onChange={(e) => setCmp(e.target.value)} className="h-8 w-auto">
            {db.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </NativeSelect>
        }>
          <SnapshotCompare key={cmp} projectId={cmp} />
        </Section>
      )}
      {pid && <CreateSnapshotDialog projectId={pid} open={open} onOpenChange={setOpen} />}
    </div>
  );
}
