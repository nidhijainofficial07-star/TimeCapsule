import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/tc/common";
import { ProjectForm } from "@/features/projects/ProjectForm";

export const Route = createFileRoute("/_workspace/projects/new")({
  head: () => ({
    meta: [
      { title: "Add Project — Project TimeCapsule" },
      { name: "description", content: "Add a project to your archive. Only the name is required." },
      { property: "og:title", content: "Add Project — Project TimeCapsule" },
      { property: "og:description", content: "Start preserving a new project's story." },
    ],
  }),
  component: NewProject,
});

function NewProject() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Add Project" description="Only the name is required — add details now or gradually later. Your draft autosaves in this browser." />
      <ProjectForm />
    </div>
  );
}
