import { useMemo, useState } from "react";
import type { RecordKind } from "@/lib/types";
import { RECORD_CONFIG, type FieldDef } from "./config";
import { useDB } from "@/services/db";
import { blankRecord, createRecord, updateRecord } from "@/services/archive";
import { useDraft } from "@/hooks/use-draft";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { NativeSelect, TagInput } from "@/components/tc/fields";
import { DraftBar, RecoveredDraftBanner, attempt } from "@/components/tc/common";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function RecordFormDialog({
  kind, open, onOpenChange, recordId, projectId, prefill, onSaved,
}: {
  kind: RecordKind;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  recordId?: string;
  projectId?: string;
  prefill?: Record<string, unknown>;
  onSaved?: (id: string) => void;
}) {
  const db = useDB();
  const cfg = RECORD_CONFIG[kind];
  const existing = recordId ? (db[kind] as unknown as Record<string, unknown>[]).find((r) => r.id === recordId) : undefined;
  const initial = useMemo(
    () => (existing ? { ...existing } : { ...blankRecord(kind), projectId: projectId ?? "", ...prefill }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recordId, projectId, open],
  );
  const draft = useDraft<Record<string, unknown>>(`${kind}:${recordId ?? `new:${projectId ?? "global"}`}`, initial, open);
  const v = draft.values;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showMore, setShowMore] = useState(false);
  const pid = String(v.projectId || projectId || "");

  const versions = db.versions.filter((x) => x.projectId === pid);
  const features = db.features.filter((x) => x.projectId === pid);

  const set = (k: string, val: unknown) => draft.setValues((p) => ({ ...p, [k]: val }));

  const primary = cfg.fields.filter((f) => !f.group);
  const groups = Array.from(new Set(cfg.fields.filter((f) => f.group).map((f) => f.group!)));

  const close = (o: boolean) => {
    if (!o && draft.dirty && !window.confirm("Close without saving? Your draft stays in this browser and can be restored next time.")) return;
    onOpenChange(o);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    for (const f of cfg.fields) if (f.required && !String(v[f.key] ?? "").trim()) errs[f.key] = `${f.label} is required.`;
    if (v.url && String(v.url).trim() && !/^https?:\/\//i.test(String(v.url))) errs.url = "Links must start with http:// or https://";
    if (["features", "bugs", "improvements", "versions", "sessions"].includes(kind) && !pid) errs.projectId = "Choose a project.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const { id: _id, createdAt: _c, updatedAt: _u, ...data } = v;
    const result = attempt(() => {
      if (recordId) {
        updateRecord(kind, recordId, data);
        return recordId;
      }
      return createRecord(kind, { ...data, projectId: pid }).id;
    }, recordId ? `${cfg.singular} updated` : `${cfg.singular} saved`);
    if (result) {
      draft.clear();
      onOpenChange(false);
      onSaved?.(result);
    }
  };

  const renderField = (f: FieldDef) => {
    const id = `f-${kind}-${f.key}`;
    const val = v[f.key];
    let control: React.ReactNode;
    switch (f.type) {
      case "textarea":
        control = <Textarea id={id} value={String(val ?? "")} onChange={(e) => set(f.key, e.target.value)} rows={3} placeholder={f.placeholder} />;
        break;
      case "select":
        control = (
          <NativeSelect id={id} value={String(val ?? "")} onChange={(e) => set(f.key, e.target.value)}>
            {f.options!.map((o) => <option key={o}>{o}</option>)}
          </NativeSelect>
        );
        break;
      case "version":
        control = (
          <NativeSelect id={id} value={String(val ?? "")} onChange={(e) => set(f.key, e.target.value)} disabled={!pid}>
            <option value="">— None —</option>
            {versions.map((o) => <option key={o.id} value={o.id}>{o.label} {o.name}</option>)}
          </NativeSelect>
        );
        break;
      case "feature":
        control = (
          <NativeSelect id={id} value={String(val ?? "")} onChange={(e) => set(f.key, e.target.value)} disabled={!pid}>
            <option value="">— None —</option>
            {features.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
          </NativeSelect>
        );
        break;
      case "project":
        control = (
          <NativeSelect id={id} value={String(val ?? "")} onChange={(e) => set(f.key, e.target.value)}>
            <option value="">— Unassigned —</option>
            {db.projects.map((o) => <option key={o.id} value={o.id}>{o.icon} {o.name}</option>)}
          </NativeSelect>
        );
        break;
      case "tags":
        control = <TagInput id={id} value={(val as string[]) ?? []} onChange={(t) => set(f.key, t)} />;
        break;
      case "toggle":
        control = (
          <div className="flex h-9 items-center">
            <Switch id={id} checked={val === "yes"} onCheckedChange={(c) => set(f.key, c ? "yes" : "")} />
          </div>
        );
        break;
      default:
        control = (
          <Input id={id} type={f.type === "date" ? "date" : f.type === "time" ? "time" : f.type === "url" ? "url" : "text"} value={String(val ?? "")} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} aria-invalid={!!errors[f.key]} />
        );
    }
    return (
      <div key={f.key} className={cn("space-y-1.5", f.half ? "sm:col-span-1" : "sm:col-span-2")}>
        <Label htmlFor={id}>
          {f.label}
          {f.required && <span className="text-destructive"> *</span>}
        </Label>
        {control}
        {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
        {errors[f.key] && <p className="text-xs text-destructive" role="alert">{errors[f.key]}</p>}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{recordId ? `Edit ${cfg.singular.toLowerCase()}` : `New ${cfg.singular.toLowerCase()}`}</DialogTitle>
          <DialogDescription>{cfg.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {draft.recovered && <RecoveredDraftBanner savedAt={draft.recovered.savedAt} onRestore={draft.restore} onDiscard={draft.discard} />}
          {errors.projectId && <p className="text-sm text-destructive" role="alert">{errors.projectId}</p>}
          {!projectId && !cfg.fields.some((f) => f.type === "project") && (
            <div className="space-y-1.5">
              <Label htmlFor={`f-${kind}-pid`}>Project <span className="text-destructive">*</span></Label>
              <NativeSelect id={`f-${kind}-pid`} value={pid} onChange={(e) => set("projectId", e.target.value)}>
                <option value="">— Choose project —</option>
                {db.projects.map((o) => <option key={o.id} value={o.id}>{o.icon} {o.name}</option>)}
              </NativeSelect>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">{primary.filter((f) => !(projectId && f.type === "project")).map(renderField)}</div>
          {groups.length > 0 && (
            <div>
              <button type="button" onClick={() => setShowMore((s) => !s)} className="flex items-center gap-1 text-sm font-semibold text-primary" aria-expanded={showMore}>
                <ChevronDown className={cn("size-4 transition", showMore && "rotate-180")} /> {showMore ? "Hide" : "More"} details ({groups.join(", ")})
              </button>
              {showMore &&
                groups.map((g) => (
                  <fieldset key={g} className="mt-4">
                    <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{g}</legend>
                    <div className="grid gap-4 sm:grid-cols-2">{cfg.fields.filter((f) => f.group === g).map(renderField)}</div>
                  </fieldset>
                ))}
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <DraftBar savedAt={draft.savedAt} error={draft.saveError} dirty={draft.dirty} />
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => close(false)}>Cancel</Button>
              <Button type="submit">{recordId ? "Save changes" : `Save ${cfg.singular.toLowerCase()}`}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
