import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { ProjectStatus } from "@/lib/types";
import { createProject } from "@/services/archive";
import { useDB } from "@/services/db";
import { PROJECT_STATUSES } from "@/lib/constants";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/tc/fields";
import { attempt } from "@/components/tc/common";

export function QuickProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const db = useDB();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("in_progress");
  const [next, setNext] = useState("");
  const [err, setErr] = useState("");
  const dup = name.trim() && db.projects.some((p) => p.name.toLowerCase() === name.trim().toLowerCase());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setErr("Project name is required.");
    const p = attempt(() => createProject({ name: name.trim(), shortDescription: desc, status, nextStep: next }), "Project created");
    if (p) {
      onOpenChange(false);
      setName(""); setDesc(""); setNext("");
      navigate({ to: "/projects/$projectId", params: { projectId: p.id } });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick project</DialogTitle>
          <DialogDescription>Just the essentials — complete the rest later.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="qp-name">Project name *</Label>
            <Input id="qp-name" autoFocus value={name} onChange={(e) => { setName(e.target.value); setErr(""); }} />
            {dup && <p className="text-xs text-warning">You already have a project with this name. That's allowed.</p>}
            {err && <p className="text-xs text-destructive" role="alert">{err}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qp-desc">One-line description</Label>
            <Input id="qp-desc" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qp-status">Status</Label>
            <NativeSelect id="qp-status" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
              {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qp-next">Next step (optional)</Label>
            <Input id="qp-next" value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Create project</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
