import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Inbox, Trash2, Zap } from "lucide-react";
import { useDB } from "@/services/db";
import { CAPTURE_TYPES, assignInboxItem, deleteInboxItem } from "@/services/archive";
import { RecordManager } from "@/features/records/RecordManager";
import { useQuickCapture } from "@/components/tc/QuickCapture";
import { EmptyState, PageHeader, attempt, useConfirm } from "@/components/tc/common";
import { NativeSelect } from "@/components/tc/fields";
import { Button } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "ideas", label: "All ideas" },
  { id: "unassigned", label: "Unassigned ideas" },
  { id: "inbox", label: "Inbox" },
  { id: "notes", label: "Notes & knowledge" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export const Route = createFileRoute("/_workspace/ideas")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab; record?: string } => ({
    tab: TABS.some((t) => t.id === s.tab) ? (s.tab as Tab) : undefined,
    record: typeof s.record === "string" ? s.record : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Ideas & Notes — Project TimeCapsule" },
      { name: "description", content: "Ideas, notes, decisions, references and your quick-capture inbox." },
      { property: "og:title", content: "Ideas & Notes — Project TimeCapsule" },
      { property: "og:description", content: "A knowledge library across all your projects." },
    ],
  }),
  component: IdeasPage,
});

function IdeasPage() {
  const { tab = "ideas", record } = Route.useSearch();
  const navigate = useNavigate({ from: "/ideas" });
  const db = useDB();
  const qc = useQuickCapture();
  return (
    <div>
      <PageHeader title="Ideas & Notes" description="Capture freely. Link to a project later — the original date and content are kept." actions={<Button onClick={() => qc.open()}><Zap /> Quick Capture</Button>} />
      <div role="tablist" className="mb-4 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => navigate({ search: { tab: t.id } })}
            className={cn("whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium", tab === t.id ? "border-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t.label}{t.id === "inbox" && db.inbox.length > 0 && ` (${db.inbox.length})`}
          </button>
        ))}
      </div>
      {tab === "ideas" && <RecordManager kind="ideas" openId={record} onOpenIdChange={(id) => navigate({ search: (p) => ({ ...p, record: id }), replace: true })} />}
      {tab === "unassigned" && <RecordManager key="un" kind="ideas" filterFn={unassigned} />}
      {tab === "notes" && <RecordManager kind="notes" openId={record} onOpenIdChange={(id) => navigate({ search: (p) => ({ ...p, record: id }), replace: true })} />}
      {tab === "inbox" && <InboxList />}
    </div>
  );
}
const unassigned = (r: Record<string, unknown>) => !r.projectId;

function InboxList() {
  const db = useDB();
  const qc = useQuickCapture();
  const [targets, setTargets] = useState<Record<string, string>>({});
  const { ask, dialog } = useConfirm();
  if (db.inbox.length === 0)
    return <EmptyState icon={<Inbox />} title="Inbox is empty" body="Quick captures without a project land here so nothing gets lost. Assign them when you're ready." action={<Button onClick={() => qc.open()}><Zap /> Quick Capture</Button>} />;
  return (
    <>
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {db.inbox.map((i) => (
          <li key={i.id} className="flex flex-col gap-2 p-4 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{i.title}</p>
              <p className="text-xs text-muted-foreground">{CAPTURE_TYPES.find((c) => c.value === i.captureType)?.label} · captured {fmtDateTime(i.createdAt)}</p>
              {i.details && <p className="mt-1 text-sm text-muted-foreground">{i.details}</p>}
              {i.url && <a href={i.url} target="_blank" rel="noreferrer noopener" className="text-sm text-primary underline">{i.url}</a>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <NativeSelect aria-label="Assign to project" value={targets[i.id] ?? ""} onChange={(e) => setTargets((t) => ({ ...t, [i.id]: e.target.value }))} className="w-auto">
                <option value="">Choose project…</option>
                {db.projects.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
              </NativeSelect>
              <Button size="sm" disabled={!targets[i.id]} onClick={() => attempt(() => assignInboxItem(i.id, targets[i.id]), "Assigned to project")}>Assign</Button>
              <Button size="icon" variant="ghost" aria-label="Delete capture" onClick={() => ask({ title: "Delete this capture?", body: "It will be removed from the inbox permanently.", confirm: "Delete", destructive: true }, () => attempt(() => deleteInboxItem(i.id), "Capture deleted"))}><Trash2 /></Button>
            </div>
          </li>
        ))}
      </ul>
      {dialog}
    </>
  );
}
