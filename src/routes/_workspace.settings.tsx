import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, RotateCcw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useDB, getDB, replaceDB, normalizeDB } from "@/services/db";
import { updatePreferences, resetDashboardLayout } from "@/services/preferences";
import { auth, useSession } from "@/services/auth";
import { applyImport, buildExport, download, exportFilename, previewImport, toCSV, type ImportPreview } from "@/services/transfer";
import { buildSampleData, stripSample } from "@/data/sample";
import { discardAllDrafts, listDrafts } from "@/hooks/use-draft";
import { SORT_OPTIONS } from "@/services/selectors";
import { PageHeader, Section, useConfirm, attempt } from "@/components/tc/common";
import { ShortcutList } from "@/components/tc/AppShell";
import { NativeSelect } from "@/components/tc/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WIDGET_LABELS } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import { emptyDB } from "@/services/db";

export const Route = createFileRoute("/_workspace/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Project TimeCapsule" },
      { name: "description", content: "Theme, dashboard, preferences, data export and import." },
      { property: "og:title", content: "Settings — Project TimeCapsule" },
      { property: "og:description", content: "Personalise your archive and manage your data." },
    ],
  }),
  component: SettingsPage,
});

function Row({ label, hint, children, htmlFor }: { label: string; hint?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="sm:w-64">{children}</div>
    </div>
  );
}

function SettingsPage() {
  const db = useDB();
  const prefs = db.preferences;
  const session = useSession();
  const [name, setName] = useState(session?.displayName ?? "");
  const { ask, dialog } = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mode, setMode] = useState<"skip" | "copy">("skip");
  const drafts = listDrafts();
  const save = (p: Parameters<typeof updatePreferences>[0]) => attempt(() => updatePreferences(p), "Preference saved");

  const exportAll = () => {
    download(exportFilename("Complete-Archive", "json"), JSON.stringify(buildExport("all"), null, 2), "application/json");
    toast.success("Full archive exported");
  };
  const exportPart = (c: "ideas" | "notes" | "versions" | "snapshots" | "resources" | "sessions" | "activity") => {
    download(exportFilename(c, "json"), JSON.stringify(buildExport({ collections: [c] }), null, 2), "application/json");
    toast.success(`${c} exported`);
  };
  const exportIdeasCsv = () => {
    const rows = db.ideas.map((i) => ({ ...i, project: db.projects.find((p) => p.id === i.projectId)?.name ?? "" }));
    download(exportFilename("Ideas", "csv"), toCSV(rows, ["title", "project", "category", "status", "priority", "futureVersion", "createdAt"]), "text/csv");
  };

  const onFile = async (f: File) => {
    if (f.size > 10 * 1024 * 1024) { toast.error("That file is larger than 10 MB."); return; }
    const text = await f.text();
    setPreview(previewImport(text));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader title="Settings" />

      <Section title="Appearance">
        <div className="divide-y">
          <Row label="Theme" hint="System follows your device setting." htmlFor="s-theme">
            <NativeSelect id="s-theme" value={prefs.theme} onChange={(e) => save({ theme: e.target.value as "light" })}>
              <option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option>
            </NativeSelect>
          </Row>
          <Row label="Card density" htmlFor="s-density">
            <NativeSelect id="s-density" value={prefs.density} onChange={(e) => save({ density: e.target.value as "compact" })}>
              <option value="comfortable">Comfortable</option><option value="compact">Compact</option>
            </NativeSelect>
          </Row>
        </div>
      </Section>

      <Section title="Dashboard & projects">
        <div className="divide-y">
          {prefs.widgets.map((w) => (
            <Row key={w.id} label={`Show “${WIDGET_LABELS[w.id]}”`} htmlFor={`sw-${w.id}`}>
              <Switch id={`sw-${w.id}`} checked={w.visible} onCheckedChange={(c) => save({ widgets: prefs.widgets.map((x) => (x.id === w.id ? { ...x, visible: c } : x)) })} />
            </Row>
          ))}
          <Row label="Default project view" htmlFor="s-view">
            <NativeSelect id="s-view" value={prefs.defaultView} onChange={(e) => save({ defaultView: e.target.value as "grid" })}>
              <option value="grid">Grid</option><option value="list">List</option>
            </NativeSelect>
          </Row>
          <Row label="Default project sorting" htmlFor="s-sort">
            <NativeSelect id="s-sort" value={prefs.defaultSort} onChange={(e) => save({ defaultSort: e.target.value as "updated" })}>
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </NativeSelect>
          </Row>
          <Row label="Landing page after sign-in" htmlFor="s-land">
            <NativeSelect id="s-land" value={prefs.landingPage} onChange={(e) => save({ landingPage: e.target.value as "/" })}>
              <option value="/">Dashboard</option><option value="/projects">All Projects</option><option value="/ideas">Ideas & Notes</option><option value="/timeline">Timeline</option>
            </NativeSelect>
          </Row>
          <Row label="Reset dashboard layout" hint="Restores default sections, order and density.">
            <Button variant="outline" onClick={() => attempt(resetDashboardLayout, "Dashboard reset")}><RotateCcw /> Reset</Button>
          </Row>
        </div>
      </Section>

      <Section title="Reminders & confirmations">
        <div className="divide-y">
          <Row label="Review reminders" hint="Remind me about projects I haven't marked as reviewed." htmlFor="s-rem">
            <Switch id="s-rem" checked={prefs.reviewReminders} onCheckedChange={(c) => save({ reviewReminders: c })} />
          </Row>
          <Row label="Remind after (days)" htmlFor="s-days">
            <Input id="s-days" type="number" min={7} max={365} value={prefs.reviewAfterDays} disabled={!prefs.reviewReminders}
              onChange={(e) => { const n = Number(e.target.value); if (n >= 1 && n <= 3650) updatePreferences({ reviewAfterDays: n }); }} />
          </Row>
          <Row label="Confirm before deleting" hint="Ask before removing records. Archiving always asks." htmlFor="s-conf">
            <Switch id="s-conf" checked={prefs.confirmDestructive} onCheckedChange={(c) => save({ confirmDestructive: c })} />
          </Row>
        </div>
      </Section>

      <Section title="Keyboard shortcuts"><ShortcutList /></Section>

      <Section title="Account & privacy">
        <div className="divide-y">
          <Row label="Display name" htmlFor="s-name">
            <div className="flex gap-2">
              <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} />
              <Button variant="outline" disabled={!name.trim()} onClick={() => { auth.updateName(name.trim()); toast.success("Name updated"); }}>Save</Button>
            </div>
          </Row>
          <Row label="Signed in as"><span className="text-sm">{session?.email}</span></Row>
        </div>
        <div className="mt-3 rounded-lg tone-warning px-3 py-2 text-sm">
          <strong>Honest status:</strong> this is a prototype. Sign-in is not verified, and your archive is stored only in this browser on this device — it isn't encrypted, synced, or backed up to the cloud. Anyone using this browser profile could see it. Secure accounts, private storage and automatic backups come with the backend phase. Export regularly.
        </div>
      </Section>

      <Section title="Export">
        <p className="mb-3 text-xs text-muted-foreground">Exports include your records. Files are references only; no passwords or tokens are ever included. A download is not an automatic backup.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportAll}><Download /> Complete archive (JSON)</Button>
          <Button variant="outline" onClick={() => exportPart("ideas")}>Ideas (JSON)</Button>
          <Button variant="outline" onClick={exportIdeasCsv}>Ideas (CSV)</Button>
          <Button variant="outline" onClick={() => exportPart("notes")}>Notes</Button>
          <Button variant="outline" onClick={() => exportPart("versions")}>Versions</Button>
          <Button variant="outline" onClick={() => exportPart("snapshots")}>Snapshots</Button>
          <Button variant="outline" onClick={() => exportPart("resources")}>Resource metadata</Button>
          <Button variant="outline" onClick={() => exportPart("sessions")}>Development history</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Per-project JSON, Markdown and CSV exports are in each project's “Project Settings” tab.</p>
      </Section>

      <Section title="Import">
        <p className="mb-3 text-sm text-muted-foreground">Import a Project TimeCapsule JSON export. You'll see a preview first — existing records are never overwritten.</p>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
        <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload /> Choose file…</Button>
      </Section>

      <Section title="Drafts">
        {drafts.length === 0 ? <p className="text-sm text-muted-foreground">No unsaved drafts in this browser.</p> : (
          <>
            <ul className="mb-3 space-y-1 text-sm">{drafts.map((d) => <li key={d.key} className="flex justify-between"><span className="font-mono text-xs">{d.key}</span><span className="text-xs text-muted-foreground">{fmtDateTime(d.savedAt)}</span></li>)}</ul>
            <Button variant="outline" onClick={() => ask({ title: "Discard all drafts?", body: "Unsaved form drafts in this browser will be removed.", confirm: "Discard", destructive: true }, () => { discardAllDrafts(); toast.success("Drafts discarded"); })}><Trash2 /> Discard all drafts</Button>
          </>
        )}
      </Section>

      <div id="data">
        <Section title="Sample & stored data">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => ask({ title: "Clear sample data?", body: "Removes every record labelled “Sample”. Your own records are untouched.", confirm: "Clear sample data", force: true }, () => attempt(() => replaceDB(stripSample(getDB())), "Sample data cleared"))}>Clear sample data</Button>
            <Button variant="outline" onClick={() => ask({ title: "Restore sample data?", body: "Adds the sample projects back alongside your own records.", confirm: "Add samples", force: true }, () => attempt(() => {
              const cur = stripSample(getDB());
              const s = buildSampleData();
              replaceDB(normalizeDB({ ...cur, ...Object.fromEntries((["projects", "features", "bugs", "improvements", "ideas", "resources", "versions", "sessions", "notes", "activity"] as const).map((k) => [k, [...(s[k] as unknown[]), ...(cur[k] as unknown[])]])) }));
            }, "Sample data added"))}>Restore sample data</Button>
            <Button variant="ghost" className="text-destructive" onClick={() => ask({ title: "Erase everything in this browser?", body: "This permanently deletes ALL projects and records stored in this browser, including your own. Export first if you want a copy. This cannot be undone.", confirm: "Erase everything", destructive: true, force: true }, () => attempt(() => replaceDB({ ...emptyDB(), preferences: getDB().preferences }), "Archive erased"))}><Trash2 /> Erase all data</Button>
          </div>
        </Section>
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import preview</DialogTitle>
            <DialogDescription>{preview?.ok ? `From “${preview.file?.scope}”, exported ${fmtDateTime(preview.file?.exportedAt)}.` : "This file can't be imported."}</DialogDescription>
          </DialogHeader>
          {preview && !preview.ok && <p className="rounded-lg tone-danger px-3 py-2 text-sm" role="alert">{preview.error}</p>}
          {preview?.ok && (
            <div className="space-y-3">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-muted-foreground"><th>Type</th><th>Records</th><th>Already exist</th></tr></thead>
                <tbody>{Object.entries(preview.counts).filter(([, c]) => c.total).map(([k, c]) => <tr key={k} className="border-t"><td className="py-1">{k}</td><td>{c.total}</td><td>{c.duplicates}</td></tr>)}</tbody>
              </table>
              {preview.duplicateProjectNames.length > 0 && <p className="text-xs text-warning">Projects with matching names: {preview.duplicateProjectNames.join(", ")}</p>}
              <fieldset className="space-y-2 text-sm">
                <legend className="font-semibold">How should duplicates be handled?</legend>
                <label className="flex items-start gap-2"><input type="radio" name="mode" checked={mode === "skip"} onChange={() => setMode("skip")} className="mt-1" /> <span><strong>Merge, skip existing</strong> — add new records; records already here (same ID) are left untouched.</span></label>
                <label className="flex items-start gap-2"><input type="radio" name="mode" checked={mode === "copy"} onChange={() => setMode("copy")} className="mt-1" /> <span><strong>Import as copies</strong> — everything is added as new records (projects get “(imported)”).</span></label>
                <p className="text-xs text-muted-foreground">Nothing is ever replaced.</p>
              </fieldset>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPreview(null)}>Cancel</Button>
            {preview?.ok && (
              <Button onClick={() => {
                try {
                  const r = applyImport(preview.file!, mode);
                  toast.success(`Imported ${r.added} records`, { description: r.skipped ? `${r.skipped} existing records were skipped.` : undefined });
                  setPreview(null);
                } catch (e) {
                  toast.error("Import failed", { description: e instanceof Error ? e.message : "Nothing was changed." });
                }
              }}>Confirm import</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {dialog}
    </div>
  );
}
