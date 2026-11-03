import type { DB, Project, ProjectSort } from "@/lib/types";
import { OPEN_BUG_STATUSES, UNFINISHED_FEATURE_STATUSES, UNREVIEWED_IDEA_STATUSES } from "@/lib/constants";
import { sessionsFor, latestVersion } from "./archive";
import { daysSince } from "@/lib/format";

export const isOpenBug = (status: string) => OPEN_BUG_STATUSES.includes(status);
export const isUnreviewedIdea = (status: string) => UNREVIEWED_IDEA_STATUSES.includes(status);

export function projectSummary(db: DB, p: Project) {
  const features = db.features.filter((f) => f.projectId === p.id);
  const bugs = db.bugs.filter((b) => b.projectId === p.id);
  const ideas = db.ideas.filter((i) => i.projectId === p.id);
  const sessions = sessionsFor(db, p.id);
  const working = features.filter((f) => f.implementationStatus === "Working" || f.verificationStatus === "Verified Working").length;
  return {
    features,
    featureCount: features.length,
    workingFeatures: working,
    unfinishedFeatures: features.filter((f) => UNFINISHED_FEATURE_STATUSES.includes(f.implementationStatus)).length,
    openBugs: bugs.filter((b) => isOpenBug(b.status)).length,
    unreviewedIdeas: ideas.filter((i) => isUnreviewedIdea(i.status)).length,
    lastSession: sessions[0],
    latestVersion: latestVersion(db, p.id),
    latestSnapshot: db.snapshots.filter((s) => s.projectId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
    nextStep: p.nextStep || "",
  };
}

export function dashboardStats(db: DB) {
  const by = (s: string) => db.projects.filter((p) => p.status === s).length;
  return {
    total: db.projects.length,
    inProgress: by("in_progress"),
    paused: by("paused"),
    completed: by("completed_for_now"),
    archived: by("archived"),
    openBugs: db.bugs.filter((b) => isOpenBug(b.status)).length,
    unreviewedIdeas: db.ideas.filter((i) => isUnreviewedIdea(i.status)).length,
    snapshots: db.snapshots.length,
  };
}

/** Projects to resume, ranked purely by recorded data (sessions, next steps, open items). */
export function resumeCandidates(db: DB, limit = 4) {
  return db.projects
    .filter((p) => p.status !== "archived")
    .map((p) => {
      const s = projectSummary(db, p);
      const lastActivity = [s.lastSession?.date, p.updatedAt, p.lastReviewedAt].filter(Boolean).sort().reverse()[0] ?? p.createdAt;
      const score = (p.status === "in_progress" ? 2 : 0) + (s.nextStep ? 1 : 0) + (s.openBugs || s.unreviewedIdeas ? 0.5 : 0);
      return { p, s, lastActivity, score };
    })
    .sort((a, b) => b.score - a.score || String(b.lastActivity).localeCompare(String(a.lastActivity)))
    .slice(0, limit);
}

export function reviewReminders(db: DB) {
  const { reviewReminders: on, reviewAfterDays } = db.preferences;
  if (!on) return [];
  return db.projects
    .filter((p) => p.status !== "archived")
    .map((p) => ({ p, days: daysSince(p.lastReviewedAt) }))
    .filter(({ days }) => days === null || days >= reviewAfterDays)
    .sort((a, b) => (b.days ?? 99999) - (a.days ?? 99999));
}

export function sortProjects(db: DB, list: Project[], sort: ProjectSort) {
  const issues = (p: Project) => db.bugs.filter((b) => b.projectId === p.id && isOpenBug(b.status)).length;
  const arr = [...list];
  switch (sort) {
    case "created": return arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "oldest": return arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case "alpha": return arr.sort((a, b) => a.name.localeCompare(b.name));
    case "issues": return arr.sort((a, b) => issues(b) - issues(a));
    case "reviewed_recent": return arr.sort((a, b) => (b.lastReviewedAt ?? "").localeCompare(a.lastReviewedAt ?? ""));
    case "reviewed_least": return arr.sort((a, b) => (a.lastReviewedAt ?? "").localeCompare(b.lastReviewedAt ?? ""));
    default: return arr.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
}

export const SORT_OPTIONS: { value: ProjectSort; label: string }[] = [
  { value: "updated", label: "Recently updated" },
  { value: "created", label: "Recently created" },
  { value: "oldest", label: "Oldest created" },
  { value: "alpha", label: "Alphabetical" },
  { value: "issues", label: "Most open issues" },
  { value: "reviewed_recent", label: "Most recently reviewed" },
  { value: "reviewed_least", label: "Least recently reviewed" },
];
