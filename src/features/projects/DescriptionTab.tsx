import { useState } from "react";
import { History, Pencil } from "lucide-react";
import type { ContextKey, Project } from "@/lib/types";
import { CONTEXT_FIELDS } from "@/lib/types";
import { updateProject } from "@/services/archive";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Markdown, attempt } from "@/components/tc/common";
import { fmtDateTime } from "@/lib/format";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const CORE: { key: keyof Project; label: string }[] = [
  { key: "problemStatement", label: "Problem statement" },
  { key: "purpose", label: "Purpose" },
  { key: "motivation", label: "Motivation" },
  { key: "targetUsers", label: "Target users" },
  { key: "goals", label: "Main goals" },
];

function EditableBlock({ p, label, value, histKey, onSave }: { p: Project; label: string; value: string; histKey: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const history = p.contextHistory.filter((h) => h.key === histKey);
  return (
    <div className="surface-card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold">{label}</h3>
        {!editing && <Button size="sm" variant="ghost" onClick={() => { setText(value); setEditing(true); }} aria-label={`Edit ${label}`}><Pencil /> Edit</Button>}
      </div>
      {editing ? (
        <div className="space-y-2">
          <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} aria-label={label} autoFocus />
          <p className="text-xs text-muted-foreground">Supports - lists, **bold**, `code`, ``` code blocks and links. The previous text is kept in history.</p>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { if (attempt(() => { onSave(text); return true; }, `${label} saved`)) setEditing(false); }}>Save</Button>
          </div>
        </div>
      ) : (
        <Markdown text={value} />
      )}
      {history.length > 0 && (
        <Collapsible className="mt-3">
          <CollapsibleTrigger className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"><History className="size-3.5" /> {history.length} earlier version{history.length > 1 ? "s" : ""}</CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {history.map((h, i) => (
              <div key={i} className="rounded-lg bg-surface p-2">
                <p className="mb-1 text-[11px] text-muted-foreground">Replaced {fmtDateTime(h.changedAt)}</p>
                <Markdown text={h.previous} />
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

export function DescriptionTab({ p }: { p: Project }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 lg:grid-cols-2">
        {CORE.map((c) => (
          <EditableBlock key={c.key} p={p} label={c.label} value={String(p[c.key] ?? "")} histKey={c.key} onSave={(v) => updateProject(p.id, { [c.key]: v })} />
        ))}
      </div>
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Project context</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {CONTEXT_FIELDS.map((c) => (
            <EditableBlock key={c.key} p={p} label={c.label} value={p.context[c.key as ContextKey] ?? ""} histKey={`context.${c.key}`} onSave={(v) => updateProject(p.id, { context: { [c.key]: v } })} />
          ))}
        </div>
      </div>
    </div>
  );
}
