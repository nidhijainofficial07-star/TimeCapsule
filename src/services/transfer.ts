// Export & import. Exports never include credentials; file contents are references only.
import type { DB, Project } from "@/lib/types";
import { getDB, mutate } from "./db";
import { projectStatusLabel } from "@/lib/constants";
import { CONTEXT_FIELDS } from "@/lib/types";
import { fmtDate, slug, todayDate, uid } from "@/lib/format";

export const EXPORT_FORMAT = "project-timecapsule-export";
const COLLECTIONS = ["projects", "features", "bugs", "improvements", "ideas", "resources", "versions", "sessions", "notes", "inbox", "snapshots", "activity"] as const;
type Coll = (typeof COLLECTIONS)[number];

export interface ExportFile {
  format: typeof EXPORT_FORMAT;
  formatVersion: 1;
  exportedAt: string;
  scope: string;
  note: string;
  data: Partial<Pick<DB, Coll>>;
}

export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const NOTE = "File attachments are exported as references (names/URLs) only — file contents are not included. No passwords or tokens are included.";

export function buildExport(scope: "all" | { projectId: string } | { collections: Coll[] }, db: DB = getDB()): ExportFile {
  let data: ExportFile["data"] = {};
  let label = "Complete archive";
  if (scope === "all") {
    for (const c of COLLECTIONS) (data as Record<string, unknown>)[c] = db[c];
  } else if ("projectId" in scope) {
    const p = db.projects.find((x) => x.id === scope.projectId);
    label = `Project: ${p?.name ?? scope.projectId}`;
    for (const c of COLLECTIONS) {
      const list = db[c] as unknown as { id: string; projectId?: string }[];
      (data as Record<string, unknown>)[c] = c === "projects" ? list.filter((x) => x.id === scope.projectId) : c === "inbox" ? [] : list.filter((x) => x.projectId === scope.projectId);
    }
  } else {
    label = scope.collections.join(", ");
    data = Object.fromEntries(scope.collections.map((c) => [c, db[c]]));
  }
  return { format: EXPORT_FORMAT, formatVersion: 1, exportedAt: new Date().toISOString(), scope: label, note: NOTE, data: structuredClone(data) };
}

export function exportFilename(name: string, ext: string) {
  return `Project-TimeCapsule-${slug(name)}-${todayDate()}.${ext}`;
}

function csvCell(v: unknown) {
  const s = Array.isArray(v) ? v.join("; ") : String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCSV(rows: Record<string, unknown>[], columns: string[]) {
  return [columns.join(","), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(","))].join("\n");
}

export function projectMarkdown(db: DB, p: Project) {
  const by = <T extends { projectId: string }>(l: T[]) => l.filter((x) => x.projectId === p.id);
  const lines: string[] = [];
  const sec = (t: string) => lines.push("", `## ${t}`, "");
  lines.push(`# ${p.icon} ${p.name}`, "", p.shortDescription || "_No short description recorded._", "");
  lines.push(`- **Status:** ${projectStatusLabel(p.status)}`, `- **Created:** ${fmtDate(p.createdAt)}`, `- **Last updated:** ${fmtDate(p.updatedAt)}`, `- **Last reviewed:** ${fmtDate(p.lastReviewedAt)}`, `- **Last tested:** ${fmtDate(p.lastTestedAt)}`);
  if (p.technologies.length) lines.push(`- **Technologies:** ${p.technologies.join(", ")}`);
  if (p.repositoryUrl) lines.push(`- **Repository:** ${p.repositoryUrl}`);
  if (p.deploymentUrl) lines.push(`- **Deployment:** ${p.deploymentUrl}`);
  for (const [label, v] of [["Problem statement", p.problemStatement], ["Purpose", p.purpose], ["Motivation", p.motivation], ["Goals", p.goals]] as const) {
    if (v) { sec(label); lines.push(v); }
  }
  for (const f of CONTEXT_FIELDS) {
    const v = p.context[f.key];
    if (v) { sec(f.label); lines.push(v); }
  }
  sec("Next step");
  lines.push(p.nextStep || "_No next step recorded._");
  const list = (title: string, items: string[]) => { sec(title); lines.push(items.length ? items.join("\n") : "_None recorded._"); };
  list("Features", by(db.features).map((f) => `- **${f.title}** — ${f.implementationStatus} / ${f.verificationStatus}${f.lastTestedAt ? ` (tested ${f.lastTestedAt})` : ""}`));
  list("Bugs", by(db.bugs).map((b) => `- **${b.title}** — ${b.status}, ${b.severity}`));
  list("Improvements", by(db.improvements).map((b) => `- **${b.title}** — ${b.status}`));
  list("Ideas", by(db.ideas).map((b) => `- **${b.title}** — ${b.category}, ${b.status}`));
  list("Versions", by(db.versions).map((v) => `- **${v.label}** ${v.name} (${v.releaseDate || "no date"}) — ${v.summary}`));
  list("Development sessions", by(db.sessions).map((s) => `- **${s.date}** ${s.title}${s.stoppingPoint ? ` — stopped at: ${s.stoppingPoint}` : ""}`));
  list("Resources", by(db.resources).map((r) => `- ${r.name} (${r.type}) ${r.url || r.fileReference}`));
  list("Snapshots", by(db.snapshots).map((s) => `- **${s.snapshotDate}** ${s.title} — ${s.reason}`));
  lines.push("", "---", `_Exported from Project TimeCapsule on ${fmtDate(new Date().toISOString())}. ${NOTE}_`);
  return lines.join("\n");
}

// ---------- Import ----------

export interface ImportPreview {
  ok: boolean;
  error?: string;
  file?: ExportFile;
  counts: Record<string, { total: number; duplicates: number }>;
  duplicateProjectNames: string[];
}

export function previewImport(text: string, db: DB = getDB()): ImportPreview {
  const counts: ImportPreview["counts"] = {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file is not valid JSON.", counts, duplicateProjectNames: [] };
  }
  const f = parsed as ExportFile;
  if (!f || f.format !== EXPORT_FORMAT || typeof f.data !== "object" || !f.data) {
    return { ok: false, error: "This doesn't look like a Project TimeCapsule export file.", counts, duplicateProjectNames: [] };
  }
  for (const c of COLLECTIONS) {
    const list = f.data[c];
    if (list === undefined) continue;
    if (!Array.isArray(list)) return { ok: false, error: `"${c}" is not a list of records.`, counts, duplicateProjectNames: [] };
    for (const r of list) {
      if (!r || typeof r !== "object" || typeof (r as { id?: unknown }).id !== "string") {
        return { ok: false, error: `A record in "${c}" is missing its identifier.`, counts, duplicateProjectNames: [] };
      }
    }
    if (c === "projects" && list.some((p) => typeof (p as Project).name !== "string")) {
      return { ok: false, error: "A project record is missing its name.", counts, duplicateProjectNames: [] };
    }
    const existing = new Set((db[c] as { id: string }[]).map((x) => x.id));
    counts[c] = { total: list.length, duplicates: list.filter((r) => existing.has((r as { id: string }).id)).length };
  }
  const names = new Set(db.projects.map((p) => p.name.toLowerCase()));
  const duplicateProjectNames = (f.data.projects ?? []).filter((p) => names.has(p.name.toLowerCase())).map((p) => p.name);
  return { ok: true, file: f, counts, duplicateProjectNames };
}

/**
 * "skip": add new records, leave existing records with the same ID untouched.
 * "copy": import everything as new copies with fresh IDs (relationships remapped).
 * Existing records are never overwritten.
 */
export function applyImport(file: ExportFile, mode: "skip" | "copy") {
  let added = 0;
  let skipped = 0;
  mutate((db) => {
    const idMap = new Map<string, string>();
    if (mode === "copy") {
      for (const c of COLLECTIONS) for (const r of (file.data[c] ?? []) as { id: string }[]) idMap.set(r.id, uid());
    }
    const remap = (v: unknown) => (typeof v === "string" && idMap.has(v) ? idMap.get(v) : v);
    for (const c of COLLECTIONS) {
      const incoming = (file.data[c] ?? []) as unknown as Record<string, unknown>[];
      const target = db[c] as unknown as Record<string, unknown>[];
      const existing = new Set(target.map((x) => x.id));
      for (const raw of incoming) {
        const r = structuredClone(raw);
        if (mode === "copy") {
          for (const k of Object.keys(r)) r[k] = remap(r[k]);
          if (c === "projects") r.name = `${r.name} (imported)`;
        } else if (existing.has(r.id)) {
          skipped++;
          continue;
        }
        r.isSample = false;
        target.push(r);
        added++;
      }
    }
    db.activity.unshift({
      id: uid(), entityType: "import", eventType: "import.completed",
      description: `Imported ${added} records from "${file.scope}" (exported ${fmtDate(file.exportedAt)})`,
      occurredAt: new Date().toISOString(), recordedAt: new Date().toISOString(),
    });
  });
  return { added, skipped };
}
