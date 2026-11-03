import { beforeEach, describe, expect, it } from "vitest";
import { __setDBForTests, emptyDB, getDB } from "@/services/db";
import { createProject, createRecord, createSnapshot, setProjectStatus, updateRecord, capture, convertIdea } from "@/services/archive";
import { dashboardStats } from "@/services/selectors";
import { applyImport, buildExport, previewImport } from "@/services/transfer";

beforeEach(() => {
  localStorage.clear();
  __setDBForTests(emptyDB());
});

describe("archive rules", () => {
  it("marking a bug Fixed does not mark it verified", () => {
    const p = createProject({ name: "A" });
    const b = createRecord("bugs", { projectId: p.id, title: "x" });
    updateRecord("bugs", b.id, { status: "Fixed" });
    expect(getDB().bugs[0].verificationStatus).toBe("Not Verified");
  });

  it("archiving keeps records and restoring brings the project back", () => {
    const p = createProject({ name: "A" });
    createRecord("features", { projectId: p.id, title: "f" });
    setProjectStatus(p.id, "archived", "done");
    expect(getDB().features).toHaveLength(1);
    setProjectStatus(p.id, "paused");
    expect(getDB().projects[0].status).toBe("paused");
    expect(getDB().projects[0].archivedAt).toBeNull();
  });

  it("snapshots do not change when records are edited later", () => {
    const p = createProject({ name: "A" });
    const f = createRecord("features", { projectId: p.id, title: "f", implementationStatus: "Working" });
    createSnapshot({ projectId: p.id, title: "s", reason: "", milestone: "", snapshotDate: "2026-01-01", reflection: "", sections: ["features"] });
    updateRecord("features", f.id, { implementationStatus: "Broken" });
    expect(getDB().snapshots[0].recordedState.features?.[0].implementationStatus).toBe("Working");
  });

  it("stats count open bugs only", () => {
    const p = createProject({ name: "A" });
    createRecord("bugs", { projectId: p.id, title: "a", status: "Open" });
    createRecord("bugs", { projectId: p.id, title: "b", status: "Verified" });
    expect(dashboardStats(getDB()).openBugs).toBe(1);
  });

  it("unassigned bug capture goes to the inbox", () => {
    capture({ type: "bug", title: "x", details: "", url: "" });
    expect(getDB().inbox).toHaveLength(1);
    expect(getDB().bugs).toHaveLength(0);
  });

  it("converting an idea leaves its status unchanged", () => {
    const p = createProject({ name: "A" });
    const i = createRecord("ideas", { projectId: p.id, title: "i", status: "Captured" });
    convertIdea(i.id, "features");
    expect(getDB().ideas[0].status).toBe("Captured");
    expect(getDB().features).toHaveLength(1);
  });

  it("import skips existing records instead of overwriting", () => {
    createProject({ name: "A" });
    const file = buildExport("all");
    file.data.projects![0].name = "Changed";
    const prev = previewImport(JSON.stringify(file));
    expect(prev.counts.projects.duplicates).toBe(1);
    applyImport(prev.file!, "skip");
    expect(getDB().projects).toHaveLength(1);
    expect(getDB().projects[0].name).toBe("A");
  });

  it("opening data never sets last reviewed automatically", () => {
    const p = createProject({ name: "A" });
    expect(getDB().projects.find((x) => x.id === p.id)!.lastReviewedAt).toBeNull();
  });
});
