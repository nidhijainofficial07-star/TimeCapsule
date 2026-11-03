// Core data model for Project TimeCapsule. Shared by services, UI and import/export.

export type ID = string;

export interface BaseRecord {
  id: ID;
  createdAt: string;
  updatedAt: string;
  /** Demonstration content seeded by the app; never personal data. */
  isSample?: boolean;
}

export type ProjectStatus = "in_progress" | "paused" | "completed_for_now" | "archived";

export const CONTEXT_FIELDS = [
  { key: "originalIdea", label: "Original idea" },
  { key: "whyChosen", label: "Why I chose this project" },
  { key: "targetAudience", label: "Target audience" },
  { key: "intendedSolution", label: "Intended solution" },
  { key: "objectives", label: "Main objectives" },
  { key: "functionalRequirements", label: "Functional requirements" },
  { key: "nonFunctionalRequirements", label: "Non-functional requirements" },
  { key: "constraints", label: "Constraints" },
  { key: "assumptions", label: "Assumptions" },
  { key: "techReasons", label: "Technologies & reasons for choosing them" },
  { key: "architecture", label: "Architecture notes" },
  { key: "implementationDecisions", label: "Important implementation decisions" },
  { key: "knownLimitations", label: "Known limitations" },
  { key: "externalDependencies", label: "External dependencies" },
  { key: "deployment", label: "Deployment details" },
  { key: "lessons", label: "Lessons learned" },
  { key: "initialFeatures", label: "Initial feature list" },
  { key: "initialChallenges", label: "Initial challenges" },
  { key: "developmentStage", label: "Current development stage" },
  { key: "importantResources", label: "Important resources" },
  { key: "background", label: "Background notes" },
] as const;
export type ContextKey = (typeof CONTEXT_FIELDS)[number]["key"];

export interface LifecycleEntry { from: ProjectStatus | null; to: ProjectStatus; reason?: string; at: string }
export interface ReviewEntry { at: string; note?: string }
export interface TestRecord { id: ID; at: string; whatTested: string; environment?: string; result?: string; limitations?: string; issues?: string }
export interface NextStepEntry { text: string; outcome: "completed" | "replaced"; at: string }
export interface ContextHistoryEntry { key: string; previous: string; changedAt: string }

export interface Project extends BaseRecord {
  name: string;
  shortDescription: string;
  problemStatement: string;
  purpose: string;
  motivation: string;
  targetUsers: string;
  goals: string;
  category: string;
  technologies: string[];
  tags: string[];
  startDate: string;
  status: ProjectStatus;
  icon: string;
  repositoryUrl: string;
  deploymentUrl: string;
  lastReviewedAt: string | null;
  lastTestedAt: string | null;
  archivedAt: string | null;
  nextStep: string;
  nextStepHistory: NextStepEntry[];
  context: Partial<Record<ContextKey, string>>;
  contextHistory: ContextHistoryEntry[];
  lifecycleHistory: LifecycleEntry[];
  reviewHistory: ReviewEntry[];
  testRecords: TestRecord[];
  checklist: Record<string, boolean>;
}

export interface Feature extends BaseRecord {
  projectId: ID;
  title: string;
  description: string;
  category: string;
  implementationStatus: string;
  verificationStatus: string;
  priority: string;
  relatedVersionId: string;
  notes: string;
  testingNotes: string;
  lastTestedAt: string;
  links: string;
  convertedFromIdeaId?: ID;
}

export interface Bug extends BaseRecord {
  projectId: ID;
  title: string;
  description: string;
  severity: string;
  priority: string;
  status: string;
  affectedFeatureId: string;
  affectedVersionId: string;
  reproductionSteps: string;
  expectedResult: string;
  actualResult: string;
  environment: string;
  errorLogs: string;
  attachments: string;
  workaround: string;
  suspectedCause: string;
  resolutionNotes: string;
  reportedAt: string;
  resolvedAt: string;
  verificationStatus: string;
}

export interface Improvement extends BaseRecord {
  projectId: ID;
  title: string;
  description: string;
  reason: string;
  benefit: string;
  priority: string;
  status: string;
  relatedFeatureId: string;
  relatedVersionId: string;
  notes: string;
  completedAt: string;
  convertedFromIdeaId?: ID;
}

export interface Idea extends BaseRecord {
  projectId: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  tags: string[];
  relatedFeatureId: string;
  relatedVersionId: string;
  futureVersion: string;
  links: string;
  personalNotes: string;
  convertedTo?: { kind: "features" | "improvements"; id: ID; at: string }[];
}

export interface Resource extends BaseRecord {
  projectId: string;
  name: string;
  type: string;
  url: string;
  fileReference: string;
  description: string;
  tags: string[];
  relatedVersionId: string;
  notes: string;
  pinned: string; // "yes" | ""
}

export interface Version extends BaseRecord {
  projectId: ID;
  label: string;
  name: string;
  releaseDate: string;
  summary: string;
  changes: string;
  featuresAdded: string;
  featuresImproved: string;
  bugsFixed: string;
  limitations: string;
  resources: string;
  deploymentUrl: string;
  workingNotes: string;
}

export interface DevSession extends BaseRecord {
  projectId: ID;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  objective: string;
  completedWork: string;
  featuresTouched: string;
  bugsDiscovered: string;
  bugsResolved: string;
  challenges: string;
  decisions: string;
  experiments: string;
  links: string;
  wasDoing: string;
  unfinished: string;
  tryingToSolve: string;
  inspectFirst: string;
  stoppingPoint: string;
  nextStep: string;
  relatedVersionId: string;
  notes: string;
}

export interface Note extends BaseRecord {
  projectId: string;
  title: string;
  content: string;
  kind: string;
  tags: string[];
  pinned: string;
}

export interface InboxItem extends BaseRecord {
  captureType: CaptureType;
  title: string;
  details: string;
  url: string;
}

export type CaptureType =
  | "idea" | "bug" | "feature" | "improvement" | "note" | "decision" | "resource" | "next_step" | "general";

export const SNAPSHOT_SECTIONS = [
  { key: "description", label: "Description & goals" },
  { key: "status", label: "Lifecycle status" },
  { key: "features", label: "Features & statuses" },
  { key: "bugs", label: "Bugs & statuses" },
  { key: "improvements", label: "Improvements" },
  { key: "ideas", label: "Saved ideas" },
  { key: "version", label: "Current version" },
  { key: "resources", label: "Important resources" },
  { key: "sessions", label: "Recent sessions" },
  { key: "nextStep", label: "Stopping point & next step" },
  { key: "notes", label: "Decisions & notes" },
] as const;
export type SnapshotSection = (typeof SNAPSHOT_SECTIONS)[number]["key"];

export interface SnapshotState {
  project?: Pick<Project, "name" | "shortDescription" | "problemStatement" | "purpose" | "goals" | "technologies">;
  status?: ProjectStatus;
  features?: { id: ID; title: string; implementationStatus: string; verificationStatus: string; lastTestedAt: string }[];
  bugs?: { id: ID; title: string; status: string; severity: string }[];
  improvements?: { id: ID; title: string; status: string }[];
  ideas?: { id: ID; title: string; status: string; category: string }[];
  version?: { id: ID; label: string; name: string; releaseDate: string } | null;
  resources?: { id: ID; name: string; type: string; url: string }[];
  sessions?: { id: ID; title: string; date: string }[];
  stoppingPoint?: string;
  nextStep?: string;
  notes?: { id: ID; title: string; kind: string }[];
}

export interface Snapshot extends BaseRecord {
  projectId: ID;
  title: string;
  reason: string;
  milestone: string;
  snapshotDate: string;
  reflection: string;
  includedSections: SnapshotSection[];
  unavailableSections: SnapshotSection[];
  relatedVersionId: string;
  recordedState: SnapshotState;
}

export interface ActivityEvent {
  id: ID;
  projectId?: string;
  entityType: string;
  entityId?: string;
  eventType: string;
  description: string;
  occurredAt: string;
  recordedAt: string;
  isSample?: boolean;
}

export type WidgetId = "stats" | "pickup" | "activity" | "ideas" | "reminders";

export interface Preferences {
  theme: "light" | "dark" | "system";
  widgets: { id: WidgetId; visible: boolean }[];
  defaultView: "grid" | "list";
  defaultSort: ProjectSort;
  density: "comfortable" | "compact";
  landingPage: "/" | "/projects" | "/ideas" | "/timeline";
  reviewReminders: boolean;
  reviewAfterDays: number;
  confirmDestructive: boolean;
  sidebarCollapsed: boolean;
}

export type ProjectSort =
  | "updated" | "created" | "oldest" | "alpha" | "issues" | "reviewed_recent" | "reviewed_least";

export interface DB {
  version: 1;
  projects: Project[];
  features: Feature[];
  bugs: Bug[];
  improvements: Improvement[];
  ideas: Idea[];
  resources: Resource[];
  versions: Version[];
  sessions: DevSession[];
  notes: Note[];
  inbox: InboxItem[];
  snapshots: Snapshot[];
  activity: ActivityEvent[];
  preferences: Preferences;
}

export type RecordKind =
  | "features" | "bugs" | "improvements" | "ideas" | "resources" | "versions" | "sessions" | "notes";

export type AnyRecord = Feature | Bug | Improvement | Idea | Resource | Version | DevSession | Note;
