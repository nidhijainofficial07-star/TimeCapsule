import type { RecordKind } from "@/lib/types";
import {
  BUG_STATUSES, BUG_VERIFICATION, FEATURE_STATUSES, IDEA_CATEGORIES, IDEA_STATUSES, IMPROVEMENT_STATUSES,
  NOTE_KINDS, PRIORITIES, RESOURCE_TYPES, SEVERITIES, VERIFICATION_STATUSES,
} from "@/lib/constants";

export type FieldType = "text" | "textarea" | "select" | "date" | "time" | "tags" | "url" | "version" | "feature" | "project" | "toggle";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  placeholder?: string;
  help?: string;
  half?: boolean;
  /** Group label; groups after the first render collapsed under "More details". */
  group?: string;
}

export interface KindConfig {
  singular: string;
  plural: string;
  description: string;
  emptyBody: string;
  titleKey: string;
  subtitleKey?: string;
  badges: string[];
  filters: string[];
  dateKey?: string;
  fields: FieldDef[];
}

const P = { key: "priority", label: "Priority", type: "select", options: PRIORITIES, half: true } as const;

export const RECORD_CONFIG: Record<RecordKind, KindConfig> = {
  features: {
    singular: "Feature", plural: "Features", titleKey: "title", subtitleKey: "description",
    description: "What the project does — implementation status and verification are tracked separately.",
    emptyBody: "Record each feature with its implementation status. Verification is set manually — nothing is marked working automatically.",
    badges: ["implementationStatus", "verificationStatus", "priority"], filters: ["implementationStatus", "verificationStatus", "priority", "category"],
    fields: [
      { key: "title", label: "Feature name", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "implementationStatus", label: "Implementation status", type: "select", options: FEATURE_STATUSES, half: true },
      { key: "verificationStatus", label: "Verification (manual)", type: "select", options: VERIFICATION_STATUSES, half: true, help: "\"Implemented\" doesn't mean verified." },
      P,
      { key: "category", label: "Category", type: "text", half: true },
      { key: "lastTestedAt", label: "Last tested", type: "date", half: true, group: "Testing & links" },
      { key: "relatedVersionId", label: "Related version", type: "version", half: true, group: "Testing & links" },
      { key: "testingNotes", label: "Testing notes", type: "textarea", group: "Testing & links" },
      { key: "notes", label: "Implementation notes", type: "textarea", group: "Testing & links" },
      { key: "links", label: "Screenshots / resources (links, one per line)", type: "textarea", group: "Testing & links" },
    ],
  },
  bugs: {
    singular: "Bug", plural: "Bugs & Issues", titleKey: "title", subtitleKey: "description",
    description: "Problems and defects. Fixed is not the same as Verified — resolved bugs stay as history.",
    emptyBody: "Track bugs separately from features and improvements. Resolved bugs are preserved as history.",
    badges: ["status", "severity", "verificationStatus"], filters: ["status", "severity", "affectedFeatureId", "affectedVersionId"], dateKey: "reportedAt",
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "status", label: "Status", type: "select", options: BUG_STATUSES, half: true },
      { key: "severity", label: "Severity", type: "select", options: SEVERITIES, half: true },
      P,
      { key: "verificationStatus", label: "Verification", type: "select", options: BUG_VERIFICATION, half: true },
      { key: "affectedFeatureId", label: "Affected feature", type: "feature", half: true },
      { key: "affectedVersionId", label: "Affected version", type: "version", half: true },
      { key: "reportedAt", label: "Date reported", type: "date", half: true },
      { key: "resolvedAt", label: "Date resolved", type: "date", half: true },
      { key: "reproductionSteps", label: "Steps to reproduce", type: "textarea", group: "Reproduction" },
      { key: "expectedResult", label: "Expected result", type: "textarea", half: true, group: "Reproduction" },
      { key: "actualResult", label: "Actual result", type: "textarea", half: true, group: "Reproduction" },
      { key: "environment", label: "Environment & browser", type: "text", group: "Reproduction" },
      { key: "errorLogs", label: "Error messages / logs", type: "textarea", group: "Reproduction" },
      { key: "attachments", label: "Screenshots / attachments (links or file names)", type: "textarea", group: "Reproduction" },
      { key: "workaround", label: "Workaround", type: "textarea", group: "Resolution" },
      { key: "suspectedCause", label: "Suspected cause (your own notes)", type: "textarea", group: "Resolution" },
      { key: "resolutionNotes", label: "Resolution notes", type: "textarea", group: "Resolution" },
    ],
  },
  improvements: {
    singular: "Improvement", plural: "Improvements", titleKey: "title", subtitleKey: "description",
    description: "Ways to make something better, even when nothing is broken.",
    emptyBody: "Improvements are kept separate from bugs. Nothing here is approved or implemented automatically.",
    badges: ["status", "priority"], filters: ["status", "priority"],
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "reason", label: "Reason for improvement", type: "textarea", half: true },
      { key: "benefit", label: "Expected benefit", type: "textarea", half: true },
      { key: "status", label: "Status", type: "select", options: IMPROVEMENT_STATUSES, half: true },
      P,
      { key: "relatedFeatureId", label: "Related feature", type: "feature", half: true, group: "Details" },
      { key: "relatedVersionId", label: "Related version", type: "version", half: true, group: "Details" },
      { key: "completedAt", label: "Completion date", type: "date", half: true, group: "Details" },
      { key: "notes", label: "Notes", type: "textarea", group: "Details" },
    ],
  },
  ideas: {
    singular: "Idea", plural: "Future Ideas", titleKey: "title", subtitleKey: "description",
    description: "Things you might explore later. Saving an idea is not a commitment.",
    emptyBody: "Capture ideas freely — they can stay unassigned and be linked to a project later.",
    badges: ["status", "category"], filters: ["status", "category", "priority", "projectId"],
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "description", label: "Full description", type: "textarea" },
      { key: "projectId", label: "Project", type: "project", half: true },
      { key: "category", label: "Category", type: "select", options: IDEA_CATEGORIES, half: true },
      { key: "status", label: "Status", type: "select", options: IDEA_STATUSES, half: true },
      P,
      { key: "futureVersion", label: "Consider for version / milestone", type: "text", half: true, placeholder: "e.g. 2.0", group: "Details" },
      { key: "relatedVersionId", label: "Related existing version", type: "version", half: true, group: "Details" },
      { key: "relatedFeatureId", label: "Related feature", type: "feature", half: true, group: "Details" },
      { key: "tags", label: "Tags", type: "tags", half: true, group: "Details" },
      { key: "links", label: "Supporting links", type: "textarea", group: "Details" },
      { key: "personalNotes", label: "Personal notes", type: "textarea", group: "Details" },
    ],
  },
  resources: {
    singular: "Resource", plural: "Resources & Files", titleKey: "name", subtitleKey: "description",
    description: "Repositories, deployments, documents and other references.",
    emptyBody: "Link repositories, deployments, designs and documents. Files are stored as references only in this prototype.",
    badges: ["type"], filters: ["type", "projectId", "relatedVersionId"],
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "type", label: "Resource type", type: "select", options: RESOURCE_TYPES, half: true },
      { key: "projectId", label: "Project", type: "project", half: true },
      { key: "url", label: "URL", type: "url", placeholder: "https://…" },
      { key: "fileReference", label: "Or: file reference (name/location — not uploaded)", type: "text", help: "File uploads require cloud storage, which isn't connected yet." },
      { key: "description", label: "Description", type: "textarea" },
      { key: "tags", label: "Tags", type: "tags", half: true },
      { key: "relatedVersionId", label: "Related version", type: "version", half: true },
      { key: "pinned", label: "Pinned / favourite", type: "toggle", half: true },
      { key: "notes", label: "Notes", type: "textarea", group: "Notes" },
    ],
  },
  versions: {
    singular: "Version", plural: "Versions", titleKey: "label", subtitleKey: "summary",
    description: "Releases and milestones you record. Earlier versions are never overwritten by new ones.",
    emptyBody: "Record releases and milestones with any label you like — v0.1, Prototype 2, Hackathon Submission…",
    badges: [], filters: [], dateKey: "releaseDate",
    fields: [
      { key: "label", label: "Version label", type: "text", required: true, half: true, placeholder: "v1.0, Prototype 2…" },
      { key: "name", label: "Version name", type: "text", half: true },
      { key: "releaseDate", label: "Release date", type: "date", half: true },
      { key: "deploymentUrl", label: "Deployment link", type: "url", half: true },
      { key: "summary", label: "Summary", type: "textarea" },
      { key: "changes", label: "Changes made (one per line)", type: "textarea" },
      { key: "featuresAdded", label: "Features added", type: "textarea", half: true, group: "Changelog" },
      { key: "featuresImproved", label: "Features improved", type: "textarea", half: true, group: "Changelog" },
      { key: "bugsFixed", label: "Bugs fixed", type: "textarea", half: true, group: "Changelog" },
      { key: "limitations", label: "Known limitations", type: "textarea", half: true, group: "Changelog" },
      { key: "resources", label: "Associated resources", type: "textarea", group: "Changelog" },
      { key: "workingNotes", label: "What was working at the time", type: "textarea", group: "Changelog" },
    ],
  },
  sessions: {
    singular: "Development session", plural: "Development Sessions", titleKey: "title", subtitleKey: "stoppingPoint",
    description: "What happened in each period of work — and exactly where you stopped.",
    emptyBody: "Log each work session. Unknown fields can stay blank — nothing is filled in for you.",
    badges: [], filters: [], dateKey: "date",
    fields: [
      { key: "title", label: "Session title", type: "text", required: true },
      { key: "date", label: "Date", type: "date", half: true },
      { key: "relatedVersionId", label: "Related version", type: "version", half: true },
      { key: "startTime", label: "Start time", type: "time", half: true },
      { key: "endTime", label: "End time", type: "time", half: true },
      { key: "objective", label: "Main objective", type: "textarea" },
      { key: "completedWork", label: "Work completed", type: "textarea" },
      { key: "stoppingPoint", label: "Current stopping point", type: "textarea", group: "Where I stopped" },
      { key: "nextStep", label: "My next step", type: "textarea", group: "Where I stopped" },
      { key: "wasDoing", label: "What I was doing", type: "textarea", half: true, group: "Where I stopped" },
      { key: "unfinished", label: "What remains unfinished", type: "textarea", half: true, group: "Where I stopped" },
      { key: "tryingToSolve", label: "What I was trying to solve", type: "textarea", half: true, group: "Where I stopped" },
      { key: "inspectFirst", label: "What to inspect first when I return", type: "textarea", half: true, group: "Where I stopped" },
      { key: "featuresTouched", label: "Features added / modified", type: "textarea", half: true, group: "Details" },
      { key: "bugsDiscovered", label: "Bugs discovered", type: "textarea", half: true, group: "Details" },
      { key: "bugsResolved", label: "Bugs resolved", type: "textarea", half: true, group: "Details" },
      { key: "challenges", label: "Challenges encountered", type: "textarea", half: true, group: "Details" },
      { key: "decisions", label: "Decisions made", type: "textarea", half: true, group: "Details" },
      { key: "experiments", label: "Experiments performed", type: "textarea", half: true, group: "Details" },
      { key: "links", label: "Important links / resources", type: "textarea", group: "Details" },
      { key: "notes", label: "Additional notes", type: "textarea", group: "Details" },
    ],
  },
  notes: {
    singular: "Note", plural: "Notes", titleKey: "title", subtitleKey: "content",
    description: "Development notes, decisions, references and lessons.",
    emptyBody: "Keep notes, decisions, references, checklists and lessons learned — global or linked to a project.",
    badges: ["kind"], filters: ["kind", "projectId"],
    fields: [
      { key: "title", label: "Title", type: "text", required: true },
      { key: "kind", label: "Kind", type: "select", options: NOTE_KINDS, half: true },
      { key: "projectId", label: "Project (optional)", type: "project", half: true },
      { key: "content", label: "Content (supports - lists, `code`, ``` blocks, links)", type: "textarea" },
      { key: "tags", label: "Tags", type: "tags", half: true },
      { key: "pinned", label: "Pinned", type: "toggle", half: true },
    ],
  },
};
