import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { ContextKey, Project, ProjectStatus } from "@/lib/types";
import { useDB } from "@/services/db";
import { blankProject, createProject, updateProject } from "@/services/archive";
import { useDraft, useUnsavedGuard } from "@/hooks/use-draft";
import { PROJECT_CATEGORIES, PROJECT_ICONS, PROJECT_STATUSES } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NativeSelect, TagInput } from "@/components/tc/fields";
import { DraftBar, RecoveredDraftBanner, Section, attempt } from "@/components/tc/common";
import { cn } from "@/lib/utils";

type Values = Omit<Project, "id" | "createdAt" | "updatedAt">;

const INITIAL_CONTEXT: { key: ContextKey; label: string }[] = [
  { key: "originalIdea", label: "Original idea" },
  { key: "initialFeatures", label: "Initial feature list" },
  { key: "knownLimitations", label: "Known limitations" },
  { key: "initialChallenges", label: "Initial challenges" },
  { key: "developmentStage", label: "Current development stage" },
  { key: "importantResources", label: "Important resources" },
  { key: "background", label: "Background notes" },
];

export function ProjectForm({ project }: { project?: Project }) {
  const db = useDB();
  const navigate = useNavigate();
  const initial = useMemo<Values>(() => (project ? structuredClone(project) : blankProject()), [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const draft = useDraft<Values>(project ? `project:${project.id}` : "project:new", initial);
  const v = draft.values;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useUnsavedGuard(draft.dirty && !saving);

  const set = <K extends keyof Values>(k: K, val: Values[K]) => draft.setValues((p) => ({ ...p, [k]: val }));
  const setCtx = (k: ContextKey, val: string) => draft.setValues((p) => ({ ...p, context: { ...p.context, [k]: val } }));
  const dup = v.name.trim() && db.projects.some((p) => p.id !== project?.id && p.name.trim().toLowerCase() === v.name.trim().toLowerCase());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!v.name.trim()) errs.name = "Project name is required.";
    for (const k of ["repositoryUrl", "deploymentUrl"] as const) if (v[k] && !/^https?:\/\//i.test(v[k])) errs[k] = "Links must start with http:// or https://";
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setSaving(true);
    const id = attempt(() => {
      if (project) {
        const { nextStepHistory: _a, contextHistory: _b, lifecycleHistory: _c, reviewHistory: _d, testRecords: _e, checklist: _f, lastReviewedAt: _g, lastTestedAt: _h, archivedAt: _i, ...patch } = v;
        updateProject(project.id, patch);
        return project.id;
      }
      return createProject({ ...v, name: v.name.trim() }).id;
    }, project ? "Project updated" : "Project created");
    if (id) {
      draft.clear();
      setTimeout(() => navigate({ to: "/projects/$projectId", params: { projectId: id } }), 0);
    } else setSaving(false);
  };

  const field = (k: keyof Values, label: string, opts: { area?: boolean; placeholder?: string; type?: string } = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`p-${String(k)}`}>{label}</Label>
      {opts.area ? (
        <Textarea id={`p-${String(k)}`} rows={3} value={String(v[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} placeholder={opts.placeholder} />
      ) : (
        <Input id={`p-${String(k)}`} type={opts.type ?? "text"} value={String(v[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} placeholder={opts.placeholder} aria-invalid={!!errors[k as string]} />
      )}
      {errors[k as string] && <p className="text-xs text-destructive" role="alert">{errors[k as string]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-5">
      {draft.recovered && <RecoveredDraftBanner savedAt={draft.recovered.savedAt} onRestore={draft.restore} onDiscard={draft.discard} />}

      <Section title="Project details">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="p-name">Project name <span className="text-destructive">*</span></Label>
            <Input id="p-name" value={v.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name} autoFocus={!project} />
            {errors.name && <p className="text-xs text-destructive" role="alert">{errors.name}</p>}
            {dup && <p className="text-xs text-warning">Another project already uses this name. You can still save it.</p>}
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <span className="text-sm font-medium">Icon</span>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Project icon">
              {PROJECT_ICONS.map((ic) => (
                <button key={ic} type="button" role="radio" aria-checked={v.icon === ic} aria-label={`Icon ${ic}`} onClick={() => set("icon", ic)}
                  className={cn("grid size-9 place-items-center rounded-lg border text-lg transition", v.icon === ic ? "border-primary bg-accent" : "hover:bg-accent/50")}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">{field("shortDescription", "Short description")}</div>
          {field("problemStatement", "Full problem statement", { area: true })}
          {field("purpose", "Project purpose", { area: true })}
          {field("motivation", "Motivation — why I started it", { area: true })}
          {field("targetUsers", "Target users", { area: true })}
          <div className="md:col-span-2">{field("goals", "Main goals", { area: true, placeholder: "- One goal per line" })}</div>
          <div className="space-y-1.5">
            <Label htmlFor="p-category">Category</Label>
            <NativeSelect id="p-category" value={v.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">— Choose —</option>
              {PROJECT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-status">Lifecycle status</Label>
            <NativeSelect id="p-status" value={v.status} onChange={(e) => set("status", e.target.value as ProjectStatus)}>
              {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-tech">Technologies & tools</Label>
            <TagInput id="p-tech" value={v.technologies} onChange={(t) => set("technologies", t)} placeholder="React, Firebase…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-tags">Tags</Label>
            <TagInput id="p-tags" value={v.tags} onChange={(t) => set("tags", t)} />
          </div>
          {field("startDate", "Start date", { type: "date" })}
          <div />
          {field("repositoryUrl", "Repository link", { type: "url", placeholder: "https://github.com/…" })}
          {field("deploymentUrl", "Deployment link", { type: "url", placeholder: "https://…" })}
        </div>
      </Section>

      <Section title="Initial project context (optional)">
        <p className="mb-3 text-xs text-muted-foreground">Everything here stays blank until you write it.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {INITIAL_CONTEXT.map((c) => (
            <div key={c.key} className="space-y-1.5">
              <Label htmlFor={`c-${c.key}`}>{c.label}</Label>
              <Textarea id={`c-${c.key}`} rows={3} value={v.context[c.key] ?? ""} onChange={(e) => setCtx(c.key, e.target.value)} />
            </div>
          ))}
          {!project && (
            <div className="space-y-1.5">
              <Label htmlFor="p-next">First recorded next step</Label>
              <Textarea id="p-next" rows={3} value={v.nextStep} onChange={(e) => set("nextStep", e.target.value)} />
            </div>
          )}
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <DraftBar savedAt={draft.savedAt} error={draft.saveError} dirty={draft.dirty} />
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => navigate(project ? { to: "/projects/$projectId", params: { projectId: project.id } } : { to: "/projects" })}>Cancel</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSaving(true);
              toast.success("Draft kept in this browser", { description: "Reopen this form to continue. It isn't saved as a project yet." });
              setTimeout(() => navigate({ to: project ? "/projects/$projectId" : "/projects", params: project ? { projectId: project.id } : undefined } as never), 0);
            }}
          >
            Save as draft
          </Button>
          <Button type="submit">{project ? "Save changes" : "Save project"}</Button>
        </div>
      </div>
    </form>
  );
}
