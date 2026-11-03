import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/tc/common";
import { TimelineList } from "@/features/timeline/TimelineList";

export const Route = createFileRoute("/_workspace/timeline")({
  head: () => ({
    meta: [
      { title: "Development Timeline — Project TimeCapsule" },
      { name: "description", content: "A chronological record of everything you've done across all projects." },
      { property: "og:title", content: "Development Timeline — Project TimeCapsule" },
      { property: "og:description", content: "Every recorded event, in order." },
    ],
  }),
  component: () => (
    <div>
      <PageHeader title="Development Timeline" description="Built only from events you actually recorded. Select an event to open its record." />
      <TimelineList />
    </div>
  ),
});
