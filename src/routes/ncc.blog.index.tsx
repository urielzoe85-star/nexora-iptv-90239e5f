import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListPosts,
  adminDeletePost,
  adminChangePostStatus,
  adminListCategories,
} from "@/lib/blog.functions";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Loader2, Eye, Pencil, Trash2, Archive, Send } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/ncc/blog/")({ component: BlogListRoute });

function BlogListRoute() {
  const navigate = useNavigate();
  const list = useServerFn(adminListPosts);
  const del = useServerFn(adminDeletePost);
  const change = useServerFn(adminChangePostStatus);
  const listCats = useServerFn(adminListCategories);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");

  const { data: cats } = useQuery({ queryKey: ["ncc", "blog", "cats"], queryFn: () => listCats() });
  const { data, isLoading } = useQuery({
    queryKey: ["ncc", "blog", "posts", { search, status, category }],
    queryFn: () =>
      list({
        data: {
          search: search || undefined,
          status: status === "all" ? undefined : (status as any),
          category_id: category === "all" ? undefined : category,
          page: 1,
          page_size: 50,
        },
      }),
  });

  async function onDelete(id: string) {
    if (!confirm("Supprimer cet article ?")) return;
    try {
      await del({ data: { id } });
      toast.success("Article supprimé");
      qc.invalidateQueries({ queryKey: ["ncc", "blog", "posts"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  }
  async function onPublish(id: string) {
    try {
      await change({ data: { id, status: "published" } });
      toast.success("Publié");
      qc.invalidateQueries({ queryKey: ["ncc", "blog", "posts"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  }
  async function onArchive(id: string) {
    try {
      await change({ data: { id, status: "archived" } });
      toast.success("Archivé");
      qc.invalidateQueries({ queryKey: ["ncc", "blog", "posts"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    }
  }

  return (
    <div>
      <NccPageHeader
        icon={FileText}
        title="Blog"
        description="Rédiger, planifier et publier les articles du site."
        action={
          <Button onClick={() => navigate({ to: "/ncc/blog/new" })}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvel article
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Rechercher un titre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="scheduled">Planifié</SelectItem>
            <SelectItem value="published">Publié</SelectItem>
            <SelectItem value="archived">Archivé</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {(cats ?? []).map((c: any) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="p-3">Titre</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Vues</th>
                <th className="p-3">Publié le</th>
                <th className="p-3">Modifié</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rows ?? []).map((p: any) => (
                <tr key={p.id} className="border-t hover:bg-muted/20">
                  <td className="p-3">
                    <Link
                      to="/ncc/blog/$id"
                      params={{ id: p.id }}
                      className="font-medium hover:underline"
                    >
                      {p.title}
                    </Link>
                    <div className="text-xs text-muted-foreground">/{p.slug}</div>
                  </td>
                  <td className="p-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="p-3">{p.view_count ?? 0}</td>
                  <td className="p-3 text-muted-foreground">
                    {p.published_at ? new Date(p.published_at).toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(p.updated_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      {p.status === "published" && (
                        <Link
                          to="/blog/$slug"
                          params={{ slug: p.slug }}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button size="sm" variant="ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      <Link to="/ncc/blog/$id" params={{ id: p.id }}>
                        <Button size="sm" variant="ghost">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      {p.status !== "published" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onPublish(p.id)}
                          title="Publier"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      {p.status !== "archived" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onArchive(p.id)}
                          title="Archiver"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => onDelete(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {(data?.rows ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Aucun article. Créez votre premier !
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: any }> = {
    draft: { label: "Brouillon", variant: "secondary" },
    scheduled: { label: "Planifié", variant: "outline" },
    published: { label: "Publié", variant: "default" },
    archived: { label: "Archivé", variant: "outline" },
  };
  const m = map[status] ?? { label: status, variant: "secondary" };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
