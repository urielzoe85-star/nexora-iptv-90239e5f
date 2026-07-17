import { createFileRoute } from "@tanstack/react-router";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { BlogEditor } from "@/components/ncc/blog/BlogEditor";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/ncc/blog/new")({
  component: () => (
    <div>
      <NccPageHeader icon={FileText} title="Nouvel article" description="Créer un article de blog." />
      <BlogEditor />
    </div>
  ),
});