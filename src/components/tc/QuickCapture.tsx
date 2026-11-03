import { createContext, useContext, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { CaptureType } from "@/lib/types";
import { useDB } from "@/services/db";
import { CAPTURE_TYPES, capture } from "@/services/archive";
import { useDraft } from "@/hooks/use-draft";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "./fields";
import { DraftBar, RecoveredDraftBanner } from "./common";
import { cn } from "@/lib/utils";

interface Ctx { open: (opts?: { projectId?: string; type?: CaptureType }) => void }
const QuickCaptureCtx = createContext<Ctx>({ open: () => {} });
export const useQuickCapture = () => useContext(QuickCaptureCtx);

type Values = { type: CaptureType; title: string; details: string; url: string; projectId: string };

export function QuickCaptureProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [preset, setPreset] = useState<Partial<Values>>({});
  return (
    <QuickCaptureCtx.Provider value={{ open: (o) => { setPreset({ projectId: o?.projectId ?? "", type: o?.type ?? "idea" }); setOpen(true); } }}>
      {children}
      <QuickCaptureDialog open={isOpen} onOpenChange={setOpen} preset={preset} />
    </QuickCaptureCtx.Provider>
  );
}

function QuickCaptureDialog({ open, onOpenChange, preset }: { open: boolean; onOpenChange: (o: boolean) => void; preset: Partial<Values> }) {
  const db = useDB();
  const navigate = useNavigate();
  const draft = useDraft<Values>("quick-capture", { type: "idea", title: "", details: "", url: "", projectId: "", ...preset }, open);
  const v = draft.values;
  const [err, setErr] = useState("");
  const set = (k: keyof Values, val: string) => draft.setValues((p) => ({ ...p, [k]: val }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.title.trim()) return setErr("Give it a short title.");
    if (v.type === "resource" && v.url && !/^https?:\/\//i.test(v.url)) return setErr("Links must start with http:// or https://");
    try {
      const res = capture({ type: v.type, title: v.title.trim(), details: v.details, url: v.url }, v.projectId || undefined);
      draft.clear();
      onOpenChange(false);
      const where = res.where === "inbox" ? "Saved to your Inbox" : res.where === "nextStep" ? "Next step recorded" : v.projectId ? "Saved to project" : "Saved to Ideas";
      toast.success(where, {
        action: res.where === "inbox" ? { label: "Open Inbox", onClick: () => navigate({ to: "/ideas", search: { tab: "inbox" } }) } : v.projectId ? { label: "Open project", onClick: () => navigate({ to: "/projects/$projectId", params: { projectId: v.projectId } }) } : undefined,
      });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not save.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Quick Capture</DialogTitle>
          <DialogDescription>Jot it down now, organise it later. Unassigned captures go to your Inbox.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {draft.recovered && draft.recovered.values.title && <RecoveredDraftBanner savedAt={draft.recovered.savedAt} onRestore={draft.restore} onDiscard={draft.discard} />}
          <div role="radiogroup" aria-label="Capture type" className="flex flex-wrap gap-1.5">
            {CAPTURE_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={v.type === t.value}
                onClick={() => set("type", t.value)}
                className={cn("rounded-full border px-2.5 py-1 text-xs font-medium transition", v.type === t.value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qc-title">Title</Label>
            <Input id="qc-title" autoFocus value={v.title} onChange={(e) => { set("title", e.target.value); setErr(""); }} placeholder="What's on your mind?" />
          </div>
          {v.type === "resource" && (
            <div className="space-y-1.5">
              <Label htmlFor="qc-url">Link</Label>
              <Input id="qc-url" type="url" value={v.url} onChange={(e) => set("url", e.target.value)} placeholder="https://…" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="qc-details">Details (optional)</Label>
            <Textarea id="qc-details" rows={3} value={v.details} onChange={(e) => set("details", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qc-project">Project</Label>
            <NativeSelect id="qc-project" value={v.projectId} onChange={(e) => set("projectId", e.target.value)}>
              <option value="">Unassigned — keep in Inbox</option>
              {db.projects.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
            </NativeSelect>
          </div>
          {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <DraftBar savedAt={draft.savedAt} error={draft.saveError} dirty={draft.dirty} />
            <Button type="submit">Save capture</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
