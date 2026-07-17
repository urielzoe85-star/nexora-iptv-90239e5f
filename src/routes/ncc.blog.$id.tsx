import { createFileRoute } from "@tanstack/react-router";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { BlogEditor } from "@/components/ncc/blog/BlogEditor";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/ncc/blog/$id")({
  component: EditRoute,
});

function EditRoute() {
  const { id } = Route.useParams();
  return (
    <div>
      <NccPageHeader icon={FileText} title="Modifier l'article" />
      <BlogEditor postId={id} />
    </div>
  );
}