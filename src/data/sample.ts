// Illustrative DEMONSTRATION data. Every record is flagged isSample and shown with a "Sample" label.
// It does not describe any real project's actual state. Clear it from Settings.
import type { DB, Project } from "@/lib/types";
import { DEFAULT_PREFERENCES } from "@/lib/constants";

const day = 86400000;
const ago = (d: number) => new Date(Date.now() - d * day).toISOString();
const dateAgo = (d: number) => ago(d).slice(0, 10);

let n = 0;
const sid = (p: string) => `sample-${p}-${++n}`;

function project(over: Partial<Project> & { id: string; name: string }): Project {
  return {
    shortDescription: "", problemStatement: "", purpose: "", motivation: "", targetUsers: "", goals: "",
    category: "", technologies: [], tags: [], startDate: "", status: "in_progress", icon: "📦",
    repositoryUrl: "", deploymentUrl: "", lastReviewedAt: null, lastTestedAt: null, archivedAt: null,
    nextStep: "", nextStepHistory: [], context: {}, contextHistory: [], lifecycleHistory: [], reviewHistory: [],
    testRecords: [], checklist: {}, createdAt: ago(200), updatedAt: ago(5), isSample: true,
    ...over,
  };
}

export function buildSampleData(): DB {
  n = 0;
  const garden = "sample-garden";
  const kannada = "sample-kannada";
  const skill = "sample-skill";

  const projects: Project[] = [
    project({
      id: garden, name: "Lumi's Little Dream Garden", icon: "🪴", category: "Game",
      shortDescription: "Sample: a cosy browser game about tending a small magical garden.",
      problemStatement: "Sample text — illustrates where you'd describe the problem this project solves.",
      purpose: "Sample: a relaxing game to practise canvas rendering and state machines.",
      goals: "- Plant, water and harvest loop\n- Day/night cycle\n- Save progress",
      technologies: ["React", "TypeScript", "Canvas API"], tags: ["game", "sample"],
      status: "in_progress", createdAt: ago(120), updatedAt: ago(3), startDate: dateAgo(120),
      nextStep: "Sample: wire the watering can to the soil moisture state.",
      lastReviewedAt: ago(20),
      lifecycleHistory: [{ from: null, to: "in_progress", at: ago(120) }],
      context: { originalIdea: "Sample: a tiny garden that grows while you're away.", architecture: "Sample: game loop in a `useAnimationFrame` hook; state in a reducer." },
    }),
    project({
      id: kannada, name: "KannadaMitra", icon: "🗣️", category: "Learning",
      shortDescription: "Sample: a friendly companion for learning everyday Kannada phrases.",
      purpose: "Sample: illustrates a paused learning project with recorded history.",
      technologies: ["React", "Vite", "Web Speech API"], tags: ["language", "sample"],
      status: "paused", createdAt: ago(300), updatedAt: ago(70), startDate: dateAgo(300),
      lifecycleHistory: [{ from: null, to: "in_progress", at: ago(300) }, { from: "in_progress", to: "paused", reason: "Sample reason: exams", at: ago(70) }],
    }),
    project({
      id: skill, name: "SkillConnect", icon: "🤝", category: "Hackathon",
      shortDescription: "Sample: matching students with peers who can teach a skill.",
      technologies: ["Next.js", "PostgreSQL"], tags: ["hackathon", "sample"],
      status: "completed_for_now", createdAt: ago(400), updatedAt: ago(150), startDate: dateAgo(400),
      lifecycleHistory: [{ from: null, to: "in_progress", at: ago(400) }, { from: "in_progress", to: "completed_for_now", reason: "Sample: hackathon submitted", at: ago(150) }],
    }),
  ];

  const base = (createdDays: number) => ({ createdAt: ago(createdDays), updatedAt: ago(Math.max(0, createdDays - 2)), isSample: true });

  const v1 = sid("v");
  const v2 = sid("v");
  const versions = [
    { id: v1, projectId: garden, label: "v0.1", name: "First sprout", releaseDate: dateAgo(90), summary: "Sample: planting works, nothing grows yet.", changes: "- Grid of soil tiles\n- Seed selection", featuresAdded: "- Planting", featuresImproved: "", bugsFixed: "", limitations: "- No saving", resources: "", deploymentUrl: "", workingNotes: "Sample: planting worked in Chrome at the time.", ...base(90) },
    { id: v2, projectId: garden, label: "v0.2", name: "Day & night", releaseDate: dateAgo(30), summary: "Sample: adds the day/night cycle.", changes: "- Grid of soil tiles\n- Seed selection\n- Day/night cycle", featuresAdded: "- Day/night cycle", featuresImproved: "- Planting animation", bugsFixed: "- Seeds disappearing on resize", limitations: "- No saving\n- Watering not connected", resources: "", deploymentUrl: "", workingNotes: "", ...base(30) },
    { id: sid("v"), projectId: skill, label: "Hackathon Submission", name: "Demo day build", releaseDate: dateAgo(150), summary: "Sample: version submitted for judging.", changes: "- Profiles\n- Matching", featuresAdded: "", featuresImproved: "", bugsFixed: "", limitations: "- Matching is naive", resources: "", deploymentUrl: "", workingNotes: "", ...base(150) },
  ];

  const f1 = sid("f");
  const features = [
    { id: f1, projectId: garden, title: "Planting seeds", description: "Sample feature.", category: "Gameplay", implementationStatus: "Working", verificationStatus: "Verified Working", priority: "High", relatedVersionId: v1, notes: "", testingNotes: "Sample: tested in Chrome.", lastTestedAt: dateAgo(30), links: "", ...base(95) },
    { id: sid("f"), projectId: garden, title: "Day/night cycle", description: "Sample feature.", category: "World", implementationStatus: "Implemented", verificationStatus: "Not Verified", priority: "Medium", relatedVersionId: v2, notes: "", testingNotes: "", lastTestedAt: "", links: "", ...base(40) },
    { id: sid("f"), projectId: garden, title: "Watering", description: "Sample feature.", category: "Gameplay", implementationStatus: "In Progress", verificationStatus: "Not Verified", priority: "High", relatedVersionId: "", notes: "", testingNotes: "", lastTestedAt: "", links: "", ...base(10) },
    { id: sid("f"), projectId: kannada, title: "Phrase cards", description: "Sample feature.", category: "Core", implementationStatus: "Partly Working", verificationStatus: "Not Verified", priority: "High", relatedVersionId: "", notes: "", testingNotes: "", lastTestedAt: "", links: "", ...base(250) },
    { id: sid("f"), projectId: skill, title: "Skill matching", description: "Sample feature.", category: "Core", implementationStatus: "Working", verificationStatus: "Not Verified", priority: "High", relatedVersionId: "", notes: "", testingNotes: "", lastTestedAt: "", links: "", ...base(380) },
  ];

  const bugs = [
    { id: sid("b"), projectId: garden, title: "Sample bug: plants flicker at dusk", description: "Illustrative bug record.", severity: "Minor", priority: "Low", status: "Open", affectedFeatureId: "", affectedVersionId: v2, reproductionSteps: "1. Wait for dusk\n2. Observe flicker", expectedResult: "Smooth fade", actualResult: "Flicker", environment: "Chrome", errorLogs: "", attachments: "", workaround: "", suspectedCause: "", resolutionNotes: "", reportedAt: dateAgo(12), resolvedAt: "", verificationStatus: "Not Verified", ...base(12) },
    { id: sid("b"), projectId: garden, title: "Sample bug: seeds vanish on resize", description: "Illustrative resolved bug.", severity: "Moderate", priority: "Medium", status: "Fixed", affectedFeatureId: f1, affectedVersionId: v1, reproductionSteps: "", expectedResult: "", actualResult: "", environment: "", errorLogs: "", attachments: "", workaround: "", suspectedCause: "", resolutionNotes: "Sample: recalculated grid on resize.", reportedAt: dateAgo(60), resolvedAt: dateAgo(35), verificationStatus: "Not Verified", ...base(60) },
    { id: sid("b"), projectId: kannada, title: "Sample bug: audio doesn't play on Safari", description: "Illustrative.", severity: "Major", priority: "High", status: "Investigating", affectedFeatureId: "", affectedVersionId: "", reproductionSteps: "", expectedResult: "", actualResult: "", environment: "Safari", errorLogs: "", attachments: "", workaround: "", suspectedCause: "", resolutionNotes: "", reportedAt: dateAgo(80), resolvedAt: "", verificationStatus: "Not Verified", ...base(80) },
  ];

  const improvements = [
    { id: sid("i"), projectId: garden, title: "Sample: smoother camera panning", description: "", reason: "Illustrative improvement.", benefit: "Nicer feel", priority: "Low", status: "Suggested", relatedFeatureId: "", relatedVersionId: "", notes: "", completedAt: "", ...base(15) },
  ];

  const ideas = [
    { id: sid("id"), projectId: garden, title: "Sample idea: seasonal events", description: "Illustrative idea record.", category: "Future Version", priority: "Medium", status: "Captured", tags: [], relatedFeatureId: "", relatedVersionId: "", futureVersion: "v1.0", links: "", personalNotes: "", ...base(8) },
    { id: sid("id"), projectId: skill, title: "Sample idea: mentor ratings", description: "Shows that Completed for Now projects can still collect ideas.", category: "New Feature", priority: "Low", status: "To Review", tags: [], relatedFeatureId: "", relatedVersionId: "", futureVersion: "2.0", links: "", personalNotes: "", ...base(40) },
    { id: sid("id"), projectId: "", title: "Sample idea: a CLI to log sessions", description: "Unassigned idea — link it to a project later.", category: "Experiment", priority: "Low", status: "Captured", tags: ["tooling"], relatedFeatureId: "", relatedVersionId: "", futureVersion: "", links: "", personalNotes: "", ...base(4) },
  ];

  const resources = [
    { id: sid("r"), projectId: garden, name: "Sample: MDN Canvas tutorial", type: "Documentation", url: "https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial", fileReference: "", description: "Illustrative resource link.", tags: [], relatedVersionId: "", notes: "", pinned: "yes", ...base(100) },
    { id: sid("r"), projectId: kannada, name: "Sample: Web Speech API reference", type: "API Reference", url: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API", fileReference: "", description: "", tags: [], relatedVersionId: "", notes: "", pinned: "", ...base(260) },
    { id: sid("r"), projectId: skill, name: "Sample: pitch-deck.pdf", type: "Presentation", url: "", fileReference: "pitch-deck.pdf (on my laptop)", description: "Reference only — file not uploaded.", tags: [], relatedVersionId: "", notes: "", pinned: "", ...base(150) },
  ];

  const sessions = [
    { id: sid("s"), projectId: garden, title: "Sample session: day/night polish", date: dateAgo(3), startTime: "19:00", endTime: "21:30", objective: "Sample objective.", completedWork: "- Sample: tuned sky gradient", featuresTouched: "Day/night cycle", bugsDiscovered: "Plants flicker at dusk", bugsResolved: "", challenges: "", decisions: "Sample: keep the cycle at 4 minutes.", experiments: "", links: "", wasDoing: "Sample: connecting watering to moisture.", unfinished: "Watering animation", tryingToSolve: "", inspectFirst: "Sample: `useSoil.ts`", stoppingPoint: "Sample: watering can sprite renders; click handler not wired.", nextStep: "Wire the click handler.", relatedVersionId: v2, notes: "", ...base(3) },
    { id: sid("s"), projectId: kannada, title: "Sample session: phrase cards", date: dateAgo(72), startTime: "", endTime: "", objective: "", completedWork: "", featuresTouched: "", bugsDiscovered: "", bugsResolved: "", challenges: "", decisions: "", experiments: "", links: "", wasDoing: "", unfinished: "", tryingToSolve: "", inspectFirst: "", stoppingPoint: "Sample: Safari audio investigation.", nextStep: "", relatedVersionId: "", notes: "", ...base(72) },
  ];

  const notes = [
    { id: sid("n"), projectId: "", title: "Sample note: favourite debugging checklist", content: "- Reproduce\n- Isolate\n- Fix\n- Verify", kind: "Checklist", tags: ["debugging"], pinned: "yes", ...base(50) },
    { id: sid("n"), projectId: garden, title: "Sample decision: canvas over DOM", content: "Illustrative decision record.", kind: "Decision", tags: [], pinned: "", ...base(110) },
  ];

  const activity = [
    ...projects.map((p) => ({ id: sid("a"), projectId: p.id, entityType: "projects", entityId: p.id, eventType: "projects.created", description: `Project created: ${p.name}`, occurredAt: p.createdAt, recordedAt: p.createdAt, isSample: true })),
    ...sessions.map((s) => ({ id: sid("a"), projectId: s.projectId, entityType: "sessions", entityId: s.id, eventType: "sessions.created", description: `Development session recorded: ${s.title}`, occurredAt: new Date(s.date).toISOString(), recordedAt: s.createdAt, isSample: true })),
    ...versions.map((v) => ({ id: sid("a"), projectId: v.projectId, entityType: "versions", entityId: v.id, eventType: "versions.created", description: `Version added: ${v.label}`, occurredAt: v.createdAt, recordedAt: v.createdAt, isSample: true })),
    ...bugs.map((b) => ({ id: sid("a"), projectId: b.projectId, entityType: "bugs", entityId: b.id, eventType: "bugs.created", description: `Bug added: ${b.title}`, occurredAt: b.createdAt, recordedAt: b.createdAt, isSample: true })),
    ...ideas.map((b) => ({ id: sid("a"), projectId: b.projectId || undefined, entityType: "ideas", entityId: b.id, eventType: "ideas.created", description: `Idea added: ${b.title}`, occurredAt: b.createdAt, recordedAt: b.createdAt, isSample: true })),
  ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  return {
    version: 1, projects, features, bugs, improvements, ideas, resources, versions, sessions, notes,
    inbox: [], snapshots: [], activity, preferences: structuredClone(DEFAULT_PREFERENCES),
  };
}

/** Remove every sample-flagged record. Personal records are untouched. */
export function stripSample(db: DB): DB {
  const keep = <T extends { isSample?: boolean }>(l: T[]) => l.filter((r) => !r.isSample);
  const sampleProjectIds = new Set(db.projects.filter((p) => p.isSample).map((p) => p.id));
  return {
    ...db,
    projects: keep(db.projects), features: keep(db.features), bugs: keep(db.bugs), improvements: keep(db.improvements),
    ideas: keep(db.ideas), resources: keep(db.resources), versions: keep(db.versions), sessions: keep(db.sessions),
    notes: keep(db.notes), inbox: keep(db.inbox),
    snapshots: db.snapshots.filter((s) => !s.isSample && !sampleProjectIds.has(s.projectId)),
    activity: db.activity.filter((a) => !a.isSample && !(a.projectId && sampleProjectIds.has(a.projectId))),
  };
}
