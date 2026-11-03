import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/tc/common";
import { ProjectForm } from "@/features/projects/ProjectForm";
import { useDB } from "@/services/db";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_workspace/projects/$projectId_/edit")({
  head: () => ({
    meta: [
      { title: "Edit Project — Project TimeCapsule" },
      { name: "description", content: "Edit project details. Previous descriptions are kept in history." },
      { property: "og:title", content: "Edit Project — Project TimeCapsule" },
      { property: "og:description", content: "Edit project details." },
    ],
  }),
  component: EditProject,
});

function EditProject() {
  const { projectId } = Route.useParams();
  const p = useDB().projects.find((x) => x.id === projectId);
  if (!p) return <EmptyState title="Project not found" action={<Button asChild><Link to="/projects">All projects</Link></Button>} />;
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={`Edit ${p.name}`} description="Earlier versions of descriptive text are preserved in the project's history." />
      <ProjectForm project={p} />
    </div>
  );
}
