import type { DB, RecordKind } from "@/lib/types";

export type SearchType = "projects" | RecordKind | "snapshots" | "inbox";

export interface SearchHit {
  type: SearchType;
  id: string;
  projectId?: string;
  title: string;
  matchedIn: string;
  excerpt: string;
}

export const SEARCH_TYPE_LABEL: Record<SearchType, string> = {
  projects: "Projects", features: "Features", bugs: "Bugs", improvements: "Improvements", ideas: "Ideas",
  sessions: "Development sessions", versions: "Versions", snapshots: "Snapshots", resources: "Resources",
  notes: "Notes", inbox: "Inbox",
};

const FIELDS: Record<SearchType, [string, string][]> = {
  projects: [["name", "name"], ["shortDescription", "description"], ["problemStatement", "problem statement"], ["purpose", "purpose"], ["goals", "goals"], ["technologies", "technologies"], ["tags", "tags"], ["category", "category"], ["nextStep", "next step"]],
  features: [["title", "title"], ["description", "description"], ["notes", "implementation notes"], ["testingNotes", "testing notes"]],
  bugs: [["title", "title"], ["description", "description"], ["errorLogs", "error logs"], ["reproductionSteps", "steps"], ["resolutionNotes", "resolution"]],
  improvements: [["title", "title"], ["description", "description"], ["reason", "reason"]],
  ideas: [["title", "title"], ["description", "description"], ["tags", "tags"], ["personalNotes", "notes"]],
  sessions: [["title", "title"], ["objective", "objective"], ["completedWork", "work completed"], ["challenges", "challenges"], ["decisions", "decisions"], ["stoppingPoint", "stopping point"], ["nextStep", "next step"], ["notes", "notes"]],
  versions: [["label", "label"], ["name", "name"], ["summary", "summary"], ["changes", "changes"], ["limitations", "limitations"]],
  snapshots: [["title", "title"], ["reason", "reason"], ["milestone", "milestone"], ["reflection", "reflection"]],
  resources: [["name", "name"], ["description", "description"], ["url", "URL"], ["tags", "tags"], ["type", "type"]],
  notes: [["title", "title"], ["content", "content"], ["tags", "tags"], ["kind", "kind"]],
  inbox: [["title", "title"], ["details", "details"]],
};

const TITLE: Record<SearchType, string> = {
  projects: "name", features: "title", bugs: "title", improvements: "title", ideas: "title", sessions: "title",
  versions: "label", snapshots: "title", resources: "name", notes: "title", inbox: "title",
};

function excerpt(text: string, q: string) {
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return text.slice(0, 120);
  const start = Math.max(0, i - 40);
  return (start > 0 ? "…" : "") + text.slice(start, i + q.length + 80) + (i + q.length + 80 < text.length ? "…" : "");
}

export function searchArchive(db: DB, query: string, types?: SearchType[]): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: SearchHit[] = [];
  for (const type of Object.keys(FIELDS) as SearchType[]) {
    if (types && !types.includes(type)) continue;
    const list = db[type] as unknown as Record<string, unknown>[];
    for (const rec of list) {
      for (const [key, label] of FIELDS[type]) {
        const raw = rec[key];
        const text = Array.isArray(raw) ? raw.join(", ") : String(raw ?? "");
        if (text.toLowerCase().includes(q)) {
          hits.push({
            type, id: String(rec.id), projectId: type === "projects" ? String(rec.id) : (rec.projectId as string) || undefined,
            title: String(rec[TITLE[type]] || "Untitled"), matchedIn: label, excerpt: excerpt(text, q),
          });
          break;
        }
      }
    }
  }
  return hits;
}
