import { createFileRoute } from "@tanstack/react-router";
import { InboxThreadView } from "@/components/ncc/ai/InboxThreadView";

export const Route = createFileRoute("/ncc/ai/inbox/$threadId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { threadId } = Route.useParams();
  return <InboxThreadView threadId={threadId} />;
}