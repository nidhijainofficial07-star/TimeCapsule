import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/tc/common";
import { RecordManager } from "@/features/records/RecordManager";

export const Route = createFileRoute("/_workspace/resources")({
  validateSearch: (s: Record<string, unknown>): { record?: string } => ({ record: typeof s.record === "string" ? s.record : undefined }),
  head: () => ({
    meta: [
      { title: "Resources — Project TimeCapsule" },
      { name: "description", content: "Repositories, deployments, documents and references across every project." },
      { property: "og:title", content: "Resources — Project TimeCapsule" },
      { property: "og:description", content: "Every link and file reference in one library." },
    ],
  }),
  component: ResourcesPage,
});

function ResourcesPage() {
  const { record } = Route.useSearch();
  const navigate = useNavigate({ from: "/resources" });
  return (
    <div>
      <PageHeader title="Resources" description="Links open in a new tab. File entries are references only — uploading files needs cloud storage, planned for the backend phase." />
      <RecordManager kind="resources" openId={record} onOpenIdChange={(id) => navigate({ search: { record: id }, replace: true })} />
    </div>
  );
}
