import { useState } from "react";
import type { Project, ProjectStatus } from "@/lib/types";
import { addTestRecord, markReviewed, setProjectStatus } from "@/services/archive";
import { PROJECT_STATUSES } from "@/lib/constants";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/tc/fields";
import { attempt } from "@/components/tc/common";
import { todayDate } from "@/lib/format";

export function StatusDialog({ p, open, onOpenChange, initial }: { p: Project; open: boolean; onOpenChange: (o: boolean) => void; initial?: ProjectStatus }) {
  const [to, setTo] = useState<ProjectStatus>(initial ?? p.status);
  const [reason, setReason] = useState("");
  const [confirmArchive, setConfirmArchive] = useState(false);
  const archiving = to === "archived" && p.status !== "archived";
  const restoring = p.status === "archived" && to !== "archived";

  const save = () => {
    if (archiving && !confirmArchive) return setConfirmArchive(true);
    const ok = attempt(() => { setProjectStatus(p.id, to, reason || undefined); return true; }, archiving ? "Project archived — nothing was deleted" : restoring ? "Project restored" : "Status updated");
    if (ok) { onOpenChange(false); setReason(""); setConfirmArchive(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (o) setTo(initial ?? p.status); setConfirmArchive(false); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial === "archived" ? "Archive project" : p.status === "archived" ? "Restore project" : "Change status"}</DialogTitle>
          <DialogDescription>Status changes are recorded in the project's lifecycle history.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="st-to">New status</Label>
            <NativeSelect id="st-to" value={to} onChange={(e) => { setTo(e.target.value as ProjectStatus); setConfirmArchive(false); }}>
              {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-reason">{archiving ? "Archive reason (optional)" : "Note (optional)"}</Label>
            <Textarea id="st-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {archiving && (
            <p className="rounded-lg tone-info px-3 py-2 text-sm">
              Archiving keeps every record. The project moves to Archived Projects and can be restored at any time.
              {confirmArchive && <strong className="block pt-1">Click “Archive project” again to confirm.</strong>}
            </p>
          )}
          {to === "completed_for_now" && <p className="text-xs text-muted-foreground">You can still add ideas, improvements and future versions to Completed for Now projects.</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={to === p.status}>{archiving ? (confirmArchive ? "Yes, archive project" : "Archive project") : restoring ? "Restore project" : "Save status"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReviewDialog({ p, open, onOpenChange }: { p: Project; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [note, setNote] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as reviewed</DialogTitle>
          <DialogDescription>Confirms you reviewed this project's saved context today. It doesn't mean anything was tested.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="rv-note">Review note (optional)</Label>
          <Textarea id="rv-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { if (attempt(() => { markReviewed(p.id, note || undefined); return true; }, "Review recorded")) { onOpenChange(false); setNote(""); } }}>Record review</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TestDialog({ p, open, onOpenChange }: { p: Project; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [v, setV] = useState({ at: todayDate(), whatTested: "", environment: "", result: "", limitations: "", issues: "" });
  const [err, setErr] = useState("");
  const set = (k: keyof typeof v, val: string) => setV((p2) => ({ ...p2, [k]: val }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Record a test</DialogTitle>
          <DialogDescription>Updates “Last tested” only because you're recording that you tested it.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="t-at">Date tested</Label><Input id="t-at" type="date" value={v.at} onChange={(e) => set("at", e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="t-env">Environment</Label><Input id="t-env" value={v.environment} onChange={(e) => set("environment", e.target.value)} placeholder="Chrome, local dev…" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="t-what">What was tested *</Label><Input id="t-what" value={v.whatTested} onChange={(e) => { set("whatTested", e.target.value); setErr(""); }} />{err && <p className="text-xs text-destructive">{err}</p>}</div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="t-res">Result</Label><Textarea id="t-res" rows={2} value={v.result} onChange={(e) => set("result", e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="t-lim">Known limitations</Label><Textarea id="t-lim" rows={2} value={v.limitations} onChange={(e) => set("limitations", e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="t-iss">Issues discovered</Label><Textarea id="t-iss" rows={2} value={v.issues} onChange={(e) => set("issues", e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => {
            if (!v.whatTested.trim()) return setErr("Describe what you tested.");
            if (attempt(() => { addTestRecord(p.id, { ...v, at: v.at || todayDate() }); return true; }, "Test recorded")) { onOpenChange(false); setV({ at: todayDate(), whatTested: "", environment: "", result: "", limitations: "", issues: "" }); }
          }}>Save test record</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
