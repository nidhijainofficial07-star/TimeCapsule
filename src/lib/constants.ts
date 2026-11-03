import type { ProjectStatus, Preferences } from "./types";

export type Tone = "success" | "warning" | "info" | "danger" | "neutral" | "primary";

export const PROJECT_STATUSES: { value: ProjectStatus; label: string; tone: Tone }[] = [
  { value: "in_progress", label: "In Progress", tone: "info" },
  { value: "paused", label: "Paused", tone: "warning" },
  { value: "completed_for_now", label: "Completed for Now", tone: "success" },
  { value: "archived", label: "Archived", tone: "neutral" },
];
export const projectStatusLabel = (s: ProjectStatus) =>
  PROJECT_STATUSES.find((x) => x.value === s)?.label ?? s;

export const PROJECT_CATEGORIES = [
  "Web App", "Mobile App", "Game", "AI / ML", "Hackathon", "Library / Tool", "Research", "Design", "Learning", "Other",
];

export const PRIORITIES = ["Low", "Medium", "High", "Critical"];

export const FEATURE_STATUSES = [
  "Planned", "In Progress", "Implemented", "Working", "Partly Working", "Broken",
  "Needs Review", "Not Tested", "Deferred", "Not Implemented",
];
export const VERIFICATION_STATUSES = ["Not Verified", "Verified Working", "Verified Partly Working", "Verified Broken"];

export const BUG_STATUSES = [
  "Open", "Investigating", "In Progress", "Blocked", "Fixed", "Retest Required", "Verified", "Won't Fix", "Deferred",
];
export const OPEN_BUG_STATUSES = ["Open", "Investigating", "In Progress", "Blocked", "Retest Required"];
export const SEVERITIES = ["Minor", "Moderate", "Major", "Critical"];
export const BUG_VERIFICATION = ["Not Verified", "Verified Fixed", "Still Reproduces"];

export const IMPROVEMENT_STATUSES = ["Suggested", "Planned", "In Progress", "Implemented", "Reviewed", "Deferred", "Rejected"];

export const IDEA_CATEGORIES = [
  "New Feature", "UI/UX", "Technical Improvement", "Performance", "Security", "Experiment", "Future Version", "Research", "General Idea",
];
export const IDEA_STATUSES = ["Captured", "To Review", "Considering", "Planned", "In Progress", "Implemented", "Deferred", "Rejected"];
export const UNREVIEWED_IDEA_STATUSES = ["Captured", "To Review"];

export const RESOURCE_TYPES = [
  "GitHub Repository", "Live Deployment", "Demo Video", "Presentation", "Problem Statement", "PDF", "Screenshot",
  "UI Design", "Source Document", "Certificate", "Documentation", "API Reference", "Research Link",
  "Database Diagram", "Architecture Diagram", "Notes", "Other File",
];

export const NOTE_KINDS = [
  "General Note", "Decision", "Technical Reference", "Lesson Learned", "Research Link", "Checklist", "Observation", "Investigate Later",
];

export const UNFINISHED_FEATURE_STATUSES = ["Planned", "In Progress", "Partly Working", "Broken", "Needs Review", "Not Tested", "Not Implemented"];

const TONE_MAP: Record<string, Tone> = {
  Working: "success", "Verified Working": "success", Verified: "success", "Verified Fixed": "success", Implemented: "success",
  Fixed: "info", Reviewed: "success", "Completed for Now": "success",
  "Partly Working": "warning", "Needs Review": "warning", "Not Tested": "warning", "Retest Required": "warning",
  Paused: "warning", Blocked: "danger", Investigating: "warning", "To Review": "warning", "Verified Partly Working": "warning",
  Broken: "danger", Open: "danger", Critical: "danger", Major: "danger", "Still Reproduces": "danger", "Verified Broken": "danger",
  "In Progress": "info", Planned: "info", Considering: "info", Captured: "primary", Suggested: "primary",
  High: "warning", Moderate: "warning",
};
export const toneFor = (value: string): Tone => TONE_MAP[value] ?? "neutral";

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  widgets: [
    { id: "stats", visible: true },
    { id: "pickup", visible: true },
    { id: "reminders", visible: true },
    { id: "activity", visible: true },
    { id: "ideas", visible: true },
  ],
  defaultView: "grid",
  defaultSort: "updated",
  density: "comfortable",
  landingPage: "/",
  reviewReminders: true,
  reviewAfterDays: 60,
  confirmDestructive: true,
  sidebarCollapsed: false,
};

export const WIDGET_LABELS: Record<string, string> = {
  stats: "Statistics",
  pickup: "Pick up where you left off",
  reminders: "Review reminders",
  activity: "Recent activity",
  ideas: "Recent ideas",
};

export const PROJECT_ICONS = ["📦", "🌱", "🪴", "🗣️", "🤝", "🎮", "🧠", "🛰️", "📚", "🎨", "⚙️", "🔬", "🚀", "🧩", "🎧", "🗺️"];
