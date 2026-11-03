// Domain services. UI calls these; they call the store. Swap the store for an API later.
import type {
  ActivityEvent, AnyRecord, CaptureType, DB, Idea, InboxItem, Project, ProjectStatus,
  RecordKind, Snapshot, SnapshotSection, SnapshotState, TestRecord, ContextKey,
} from "@/lib/types";
import { mutate, getDB } from "./db";
import { nowISO, todayDate, uid } from "@/lib/format";
import { projectStatusLabel } from "@/lib/constants";

export const KIND_LABEL: Record<RecordKind, string> = {
  features: "Feature", bugs: "Bug", improvements: "Improvement", ideas: "Idea",
  resources: "Resource", versions: "Version", sessions: "Development session", notes: "Note",
};

/** Field that represents each record kind's status (for activity events). */
export const STATUS_KEY: Partial<Record<RecordKind, string>> = {
  features: "implementationStatus", bugs: "status", improvements: "status", ideas: "status",
};

export const TITLE_KEY: Record<RecordKind, string> = {
  features: "title", bugs: "title", improvements: "title", ideas: "title",
  resources: "name", versions: "label", sessions: "title", notes: "title",
};

const TEMPLATES: Record<RecordKind, Record<string, unknown>> = {
  features: { projectId: "", title: "", description: "", category: "", implementationStatus: "Planned", verificationStatus: "Not Verified", priority: "Medium", relatedVersionId: "", notes: "", testingNotes: "", lastTestedAt: "", links: "" },
  bugs: { projectId: "", title: "", description: "", severity: "Moderate", priority: "Medium", status: "Open", affectedFeatureId: "", affectedVersionId: "", reproductionSteps: "", expectedResult: "", actualResult: "", environment: "", errorLogs: "", attachments: "", workaround: "", suspectedCause: "", resolutionNotes: "", reportedAt: "", resolvedAt: "", verificationStatus: "Not Verified" },
  improvements: { projectId: "", title: "", description: "", reason: "", benefit: "", priority: "Medium", status: "Suggested", relatedFeatureId: "", relatedVersionId: "", notes: "", completedAt: "" },
  ideas: { projectId: "", title: "", description: "", category: "General Idea", priority: "Medium", status: "Captured", tags: [], relatedFeatureId: "", relatedVersionId: "", futureVersion: "", links: "", personalNotes: "" },
  resources: { projectId: "", name: "", type: "Research Link", url: "", fileReference: "", description: "", tags: [], relatedVersionId: "", notes: "", pinned: "" },
  versions: { projectId: "", label: "", name: "", releaseDate: "", summary: "", changes: "", featuresAdded: "", featuresImproved: "", bugsFixed: "", limitations: "", resources: "", deploymentUrl: "", workingNotes: "" },
  sessions: { projectId: "", title: "", date: "", startTime: "", endTime: "", objective: "", completedWork: "", featuresTouched: "", bugsDiscovered: "", bugsResolved: "", challenges: "", decisions: "", experiments: "", links: "", wasDoing: "", unfinished: "", tryingToSolve: "", inspectFirst: "", stoppingPoint: "", nextStep: "", relatedVersionId: "", notes: "" },
  notes: { projectId: "", title: "", content: "", kind: "General Note", tags: [], pinned: "" },
};

export function blankRecord(kind: RecordKind): Record<string, unknown> {
  const t = structuredClone(TEMPLATES[kind]);
  if (kind === "sessions") t.date = todayDate();
  if (kind === "bugs") t.reportedAt = todayDate();
  return t;
}

function log(db: DB, e: Omit<ActivityEvent, "id" | "recordedAt" | "occurredAt"> & { occurredAt?: string }) {
  const at = nowISO();
  db.activity.unshift({ ...e, id: uid(), recordedAt: at, occurredAt: e.occurredAt ?? at });
}

function touchProject(db: DB, projectId?: string) {
  if (!projectId) return;
  const p = db.projects.find((x) => x.id === projectId);
  if (p) p.updatedAt = nowISO();
}

const recTitle = (kind: RecordKind, r: Record<string, unknown>) => String(r[TITLE_KEY[kind]] || "Untitled");

// ---------- Generic records ----------

export function createRecord(kind: RecordKind, data: Record<string, unknown>): AnyRecord {
  const at = nowISO();
  const rec = { ...blankRecord(kind), ...data, id: uid(), createdAt: at, updatedAt: at } as unknown as AnyRecord;
  mutate((db) => {
    (db[kind] as AnyRecord[]).unshift(rec);
    const projectId = (rec as { projectId?: string }).projectId || undefined;
    const r = rec as unknown as Record<string, unknown>;
    log(db, {
      projectId, entityType: kind, entityId: rec.id, eventType: `${kind}.created`,
      description: kind === "sessions" ? `Development session recorded: ${recTitle(kind, r)}` : `${KIND_LABEL[kind]} added: ${recTitle(kind, r)}`,
      occurredAt: kind === "sessions" && r.date ? new Date(String(r.date)).toISOString() : undefined,
    });
    touchProject(db, projectId);
  });
  return rec;
}

export function updateRecord(kind: RecordKind, id: string, patch: Record<string, unknown>) {
  mutate((db) => {
    const list = db[kind] as unknown as Record<string, unknown>[];
    const rec = list.find((r) => r.id === id);
    if (!rec) throw new Error("Record no longer exists.");
    const sk = STATUS_KEY[kind];
    const before = sk ? String(rec[sk] ?? "") : "";
    Object.assign(rec, patch, { id, updatedAt: nowISO() });
    const after = sk ? String(rec[sk] ?? "") : "";
    const projectId = (rec.projectId as string) || undefined;
    if (kind === "bugs" && before !== after && (after === "Fixed" || after === "Verified") && !rec.resolvedAt) {
      rec.resolvedAt = todayDate();
    }
    if (sk && before !== after) {
      const resolved = kind === "bugs" && ["Fixed", "Verified"].includes(after);
      log(db, {
        projectId, entityType: kind, entityId: id,
        eventType: resolved ? "bugs.resolved" : `${kind}.status_changed`,
        description: `${KIND_LABEL[kind]} "${recTitle(kind, rec)}": ${before || "—"} → ${after}`,
      });
    } else {
      log(db, { projectId, entityType: kind, entityId: id, eventType: `${kind}.updated`, description: `${KIND_LABEL[kind]} updated: ${recTitle(kind, rec)}` });
    }
    touchProject(db, projectId);
  });
}

export function deleteRecord(kind: RecordKind, id: string) {
  mutate((db) => {
    const list = db[kind] as unknown as Record<string, unknown>[];
    const idx = list.findIndex((r) => r.id === id);
    if (idx < 0) return;
    const [rec] = list.splice(idx, 1);
    log(db, { projectId: (rec.projectId as string) || undefined, entityType: kind, entityId: id, eventType: `${kind}.deleted`, description: `${KIND_LABEL[kind]} deleted: ${recTitle(kind, rec)}` });
  });
}

// ---------- Projects ----------

export function blankProject(): Omit<Project, "id" | "createdAt" | "updatedAt"> {
  return {
    name: "", shortDescription: "", problemStatement: "", purpose: "", motivation: "", targetUsers: "", goals: "",
    category: "", technologies: [], tags: [], startDate: "", status: "in_progress", icon: "📦",
    repositoryUrl: "", deploymentUrl: "", lastReviewedAt: null, lastTestedAt: null, archivedAt: null,
    nextStep: "", nextStepHistory: [], context: {}, contextHistory: [], lifecycleHistory: [],
    reviewHistory: [], testRecords: [], checklist: {},
  };
}

export function createProject(data: Partial<Project>): Project {
  const at = nowISO();
  const p: Project = { ...blankProject(), ...data, id: uid(), createdAt: at, updatedAt: at } as Project;
  p.lifecycleHistory = [{ from: null, to: p.status, at }];
  if (p.status === "archived") p.archivedAt = at;
  mutate((db) => {
    db.projects.unshift(p);
    log(db, { projectId: p.id, entityType: "projects", entityId: p.id, eventType: "projects.created", description: `Project created: ${p.name}` });
  });
  return p;
}

const TRACKED_TEXT: (keyof Project)[] = ["shortDescription", "problemStatement", "purpose", "motivation", "goals", "targetUsers"];

/** Update a project; previous text of descriptive fields is kept in contextHistory instead of being lost. */
export function updateProject(id: string, patch: Partial<Project>) {
  mutate((db) => {
    const p = db.projects.find((x) => x.id === id);
    if (!p) throw new Error("Project no longer exists.");
    const at = nowISO();
    const changedLabels: string[] = [];
    for (const k of TRACKED_TEXT) {
      if (k in patch && patch[k] !== p[k] && p[k]) {
        p.contextHistory.unshift({ key: k, previous: String(p[k]), changedAt: at });
        changedLabels.push(k);
      }
    }
    if (patch.context) {
      for (const [k, v] of Object.entries(patch.context)) {
        const prev = p.context[k as ContextKey];
        if (prev && prev !== v) {
          p.contextHistory.unshift({ key: `context.${k}`, previous: prev, changedAt: at });
          changedLabels.push(k);
        }
      }
      patch = { ...patch, context: { ...p.context, ...patch.context } };
    }
    const statusChange = patch.status && patch.status !== p.status ? patch.status : null;
    const prevStatus = p.status;
    Object.assign(p, patch, { id, updatedAt: at });
    if (statusChange) {
      p.status = prevStatus;
      applyStatus(db, p, statusChange);
    }
    log(db, {
      projectId: id, entityType: "projects", entityId: id,
      eventType: changedLabels.length ? "projects.description_changed" : "projects.updated",
      description: changedLabels.length ? `Project description updated: ${p.name}` : `Project details updated: ${p.name}`,
    });
  });
}

function applyStatus(db: DB, p: Project, to: ProjectStatus, reason?: string) {
  const at = nowISO();
  const from = p.status;
  if (from === to) return;
  p.lifecycleHistory.push({ from, to, reason, at });
  p.status = to;
  p.updatedAt = at;
  if (to === "archived") p.archivedAt = at;
  if (from === "archived") p.archivedAt = null;
  const eventType = to === "archived" ? "projects.archived" : from === "archived" ? "projects.restored" : "projects.status_changed";
  const description =
    to === "archived" ? `Project archived: ${p.name}${reason ? ` — ${reason}` : ""}`
      : from === "archived" ? `Project restored: ${p.name} (now ${projectStatusLabel(to)})`
        : `Project status: ${projectStatusLabel(from)} → ${projectStatusLabel(to)}`;
  log(db, { projectId: p.id, entityType: "projects", entityId: p.id, eventType, description });
}

export function setProjectStatus(id: string, to: ProjectStatus, reason?: string) {
  mutate((db) => {
    const p = db.projects.find((x) => x.id === id);
    if (!p) throw new Error("Project no longer exists.");
    applyStatus(db, p, to, reason);
  });
}

export function markReviewed(id: string, note?: string) {
  mutate((db) => {
    const p = db.projects.find((x) => x.id === id);
    if (!p) throw new Error("Project no longer exists.");
    const at = nowISO();
    p.lastReviewedAt = at;
    p.reviewHistory.unshift({ at, note });
    log(db, { projectId: id, entityType: "projects", entityId: id, eventType: "projects.reviewed", description: `Project context reviewed${note ? `: ${note}` : ""}` });
  });
}

export function addTestRecord(id: string, rec: Omit<TestRecord, "id">) {
  mutate((db) => {
    const p = db.projects.find((x) => x.id === id);
    if (!p) throw new Error("Project no longer exists.");
    p.testRecords.unshift({ ...rec, id: uid() });
    if (!p.lastTestedAt || rec.at > p.lastTestedAt) p.lastTestedAt = rec.at;
    log(db, { projectId: id, entityType: "projects", entityId: id, eventType: "projects.tested", description: `Test recorded: ${rec.whatTested}${rec.result ? ` — ${rec.result}` : ""}`, occurredAt: rec.at });
  });
}

export function setNextStep(id: string, text: string, outcomeOfPrevious?: "completed" | "replaced") {
  mutate((db) => {
    const p = db.projects.find((x) => x.id === id);
    if (!p) throw new Error("Project no longer exists.");
    const at = nowISO();
    if (p.nextStep && outcomeOfPrevious) p.nextStepHistory.unshift({ text: p.nextStep, outcome: outcomeOfPrevious, at });
    const prev = p.nextStep;
    p.nextStep = text;
    p.updatedAt = at;
    if (outcomeOfPrevious === "completed" && prev) {
      log(db, { projectId: id, entityType: "projects", entityId: id, eventType: "projects.next_step_completed", description: `Next step completed: ${prev}` });
    }
    if (text) log(db, { projectId: id, entityType: "projects", entityId: id, eventType: "projects.next_step_set", description: `Next step recorded: ${text}` });
  });
}

export function toggleChecklist(id: string, item: string, value: boolean) {
  mutate((db) => {
    const p = db.projects.find((x) => x.id === id);
    if (p) p.checklist = { ...p.checklist, [item]: value };
  });
}
export function resetChecklist(id: string) {
  mutate((db) => {
    const p = db.projects.find((x) => x.id === id);
    if (p) p.checklist = {};
  });
}

// ---------- Quick capture & inbox ----------

export const CAPTURE_TYPES: { value: CaptureType; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "bug", label: "Bug / issue" },
  { value: "feature", label: "Feature request" },
  { value: "improvement", label: "Improvement" },
  { value: "note", label: "Development note" },
  { value: "decision", label: "Decision" },
  { value: "resource", label: "Resource link" },
  { value: "next_step", label: "Next step" },
  { value: "general", label: "General note" },
];

interface CapturePayload { type: CaptureType; title: string; details: string; url: string; createdAt?: string }

function routeCapture(c: CapturePayload, projectId: string): { kind: RecordKind | "nextStep"; data: Record<string, unknown> } {
  switch (c.type) {
    case "idea": return { kind: "ideas", data: { projectId, title: c.title, description: c.details } };
    case "bug": return { kind: "bugs", data: { projectId, title: c.title, description: c.details } };
    case "feature": return { kind: "features", data: { projectId, title: c.title, description: c.details } };
    case "improvement": return { kind: "improvements", data: { projectId, title: c.title, description: c.details } };
    case "resource": return { kind: "resources", data: { projectId, name: c.title, url: c.url, description: c.details } };
    case "decision": return { kind: "notes", data: { projectId, title: c.title, content: c.details, kind: "Decision" } };
    case "next_step": return { kind: "nextStep", data: { text: c.title + (c.details ? ` — ${c.details}` : "") } };
    case "note": return { kind: "notes", data: { projectId, title: c.title, content: c.details, kind: "General Note" } };
    default: return { kind: "notes", data: { projectId, title: c.title, content: c.details, kind: "General Note" } };
  }
}

/** Saves a capture. With a project it becomes the matching record; without, it goes to the Inbox. */
export function capture(c: CapturePayload, projectId?: string): { where: "inbox" | RecordKind | "nextStep"; id?: string } {
  if (!projectId) {
    if (c.type === "idea") {
      const rec = createRecord("ideas", { projectId: "", title: c.title, description: c.details });
      return { where: "ideas", id: rec.id };
    }
    const at = nowISO();
    const item: InboxItem = { id: uid(), createdAt: at, updatedAt: at, captureType: c.type, title: c.title, details: c.details, url: c.url };
    mutate((db) => {
      db.inbox.unshift(item);
      log(db, { entityType: "inbox", entityId: item.id, eventType: "inbox.captured", description: `Captured to inbox: ${c.title}` });
    });
    return { where: "inbox", id: item.id };
  }
  const r = routeCapture(c, projectId);
  if (r.kind === "nextStep") {
    setNextStep(projectId, String(r.data.text), "replaced");
    return { where: "nextStep" };
  }
  const rec = createRecord(r.kind, r.data);
  return { where: r.kind, id: rec.id };
}

/** Assign an inbox item to a project. The new record keeps the original capture date. */
export function assignInboxItem(itemId: string, projectId: string) {
  const db = getDB();
  const item = db.inbox.find((i) => i.id === itemId);
  if (!item) throw new Error("Inbox item not found.");
  const r = routeCapture({ ...item, type: item.captureType }, projectId);
  if (r.kind === "nextStep") {
    setNextStep(projectId, String(r.data.text), "replaced");
  } else {
    const rec = createRecord(r.kind, r.data);
    mutate((d) => {
      const list = d[r.kind as RecordKind] as unknown as Record<string, unknown>[];
      const target = list.find((x) => x.id === rec.id);
      if (target) target.createdAt = item.createdAt;
    });
  }
  mutate((d) => {
    d.inbox = d.inbox.filter((i) => i.id !== itemId);
  });
}

export function deleteInboxItem(itemId: string) {
  mutate((d) => {
    d.inbox = d.inbox.filter((i) => i.id !== itemId);
  });
}

/** Create a feature or improvement from an idea. The idea's own status is left untouched. */
export function convertIdea(ideaId: string, kind: "features" | "improvements", projectId?: string) {
  const idea = getDB().ideas.find((i) => i.id === ideaId) as Idea | undefined;
  if (!idea) throw new Error("Idea not found.");
  const pid = projectId || idea.projectId;
  if (!pid) throw new Error("Link the idea to a project first.");
  const rec = createRecord(kind, {
    projectId: pid, title: idea.title, description: idea.description, convertedFromIdeaId: idea.id,
    ...(kind === "improvements" ? { reason: `Converted from idea "${idea.title}"` } : { notes: `Converted from idea "${idea.title}"` }),
  });
  mutate((db) => {
    const i = db.ideas.find((x) => x.id === ideaId);
    if (i) {
      i.convertedTo = [...(i.convertedTo ?? []), { kind, id: rec.id, at: nowISO() }];
      if (!i.projectId) i.projectId = pid;
    }
  });
  return rec;
}

// ---------- Snapshots ----------

export function buildSnapshotState(db: DB, projectId: string, sections: SnapshotSection[]) {
  const p = db.projects.find((x) => x.id === projectId);
  if (!p) throw new Error("Project not found.");
  const has = (s: SnapshotSection) => sections.includes(s);
  const state: SnapshotState = {};
  const unavailable: SnapshotSection[] = [];
  const by = <T extends { projectId: string }>(l: T[]) => l.filter((r) => r.projectId === projectId);

  if (has("description")) {
    state.project = { name: p.name, shortDescription: p.shortDescription, problemStatement: p.problemStatement, purpose: p.purpose, goals: p.goals, technologies: [...p.technologies] };
    if (!p.shortDescription && !p.problemStatement && !p.goals) unavailable.push("description");
  }
  if (has("status")) state.status = p.status;
  if (has("features")) {
    state.features = by(db.features).map((f) => ({ id: f.id, title: f.title, implementationStatus: f.implementationStatus, verificationStatus: f.verificationStatus, lastTestedAt: f.lastTestedAt }));
    if (!state.features.length) unavailable.push("features");
  }
  if (has("bugs")) {
    state.bugs = by(db.bugs).map((b) => ({ id: b.id, title: b.title, status: b.status, severity: b.severity }));
    if (!state.bugs.length) unavailable.push("bugs");
  }
  if (has("improvements")) {
    state.improvements = by(db.improvements).map((b) => ({ id: b.id, title: b.title, status: b.status }));
    if (!state.improvements.length) unavailable.push("improvements");
  }
  if (has("ideas")) {
    state.ideas = by(db.ideas).map((b) => ({ id: b.id, title: b.title, status: b.status, category: b.category }));
    if (!state.ideas.length) unavailable.push("ideas");
  }
  if (has("version")) {
    const v = latestVersion(db, projectId);
    state.version = v ? { id: v.id, label: v.label, name: v.name, releaseDate: v.releaseDate } : null;
    if (!v) unavailable.push("version");
  }
  if (has("resources")) {
    state.resources = by(db.resources).map((r) => ({ id: r.id, name: r.name, type: r.type, url: r.url }));
    if (!state.resources.length) unavailable.push("resources");
  }
  const sessions = sessionsFor(db, projectId);
  if (has("sessions")) {
    state.sessions = sessions.slice(0, 5).map((s) => ({ id: s.id, title: s.title, date: s.date }));
    if (!state.sessions.length) unavailable.push("sessions");
  }
  if (has("nextStep")) {
    state.stoppingPoint = sessions[0]?.stoppingPoint ?? "";
    state.nextStep = p.nextStep || sessions[0]?.nextStep || "";
    if (!state.stoppingPoint && !state.nextStep) unavailable.push("nextStep");
  }
  if (has("notes")) {
    state.notes = by(db.notes).map((n) => ({ id: n.id, title: n.title, kind: n.kind }));
    if (!state.notes.length) unavailable.push("notes");
  }
  return { state: structuredClone(state), unavailable };
}

export function createSnapshot(input: { projectId: string; title: string; reason: string; milestone: string; snapshotDate: string; reflection: string; sections: SnapshotSection[] }) {
  const db = getDB();
  const { state, unavailable } = buildSnapshotState(db, input.projectId, input.sections);
  const at = nowISO();
  const snap: Snapshot = {
    id: uid(), createdAt: at, updatedAt: at, projectId: input.projectId, title: input.title, reason: input.reason,
    milestone: input.milestone, snapshotDate: input.snapshotDate, reflection: input.reflection,
    includedSections: input.sections, unavailableSections: unavailable,
    relatedVersionId: state.version?.id ?? "", recordedState: state,
  };
  mutate((d) => {
    d.snapshots.unshift(snap);
    log(d, { projectId: input.projectId, entityType: "snapshots", entityId: snap.id, eventType: "snapshots.created", description: `Time Capsule Snapshot saved: ${snap.title}` });
    touchProject(d, input.projectId);
  });
  return snap;
}

// ---------- Derived selectors ----------

export function sessionsFor(db: DB, projectId: string) {
  return db.sessions
    .filter((s) => s.projectId === projectId)
    .sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
}
export function latestVersion(db: DB, projectId: string) {
  return db.versions
    .filter((v) => v.projectId === projectId)
    .sort((a, b) => (b.releaseDate || b.createdAt).localeCompare(a.releaseDate || a.createdAt))[0];
}
