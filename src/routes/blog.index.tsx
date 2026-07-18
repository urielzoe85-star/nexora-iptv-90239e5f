import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { publicListPosts, publicListCategories } from "@/lib/blog.functions";
import { useQuery } from "@tanstack/react-query";
import { PostCard } from "@/components/blog/PostCard";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, Loader2 } from "lucide-react";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog Nexora IPTV — Guides, tutoriels et actualités" },
      { name: "description", content: "Guides d'installation IPTV, tutoriels Smart TV, Fire TV, Android, iPhone, actualités et conseils pour tirer le meilleur de votre abonnement Nexora." },
      { property: "og:title", content: "Blog Nexora IPTV" },
      { property: "og:description", content: "Guides, tutoriels et actualités IPTV." },
      { property: "og:url", content: "https://nexora-iptv.com/blog" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://nexora-iptv.com/blog" }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const list = useServerFn(publicListPosts);
  const listCats = useServerFn(publicListCategories);
  const [search, setSearch] = useState("");
  const { data: cats } = useQuery({
    queryKey: ["blog","cats"],
    queryFn: () => listCats(),
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const { data, isLoading } = useQuery({
    queryKey: ["blog","posts", search],
    queryFn: () => list({ data: { search: search || undefined, page: 1, page_size: 24 } }),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    staleTime: 0,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <header className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Blog Nexora</h1>
          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Guides, tutoriels et actualités pour profiter au maximum de votre abonnement IPTV.
          </p>
        </header>

        <div className="flex flex-wrap gap-3 justify-between items-center mb-8">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un article…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <nav className="flex flex-wrap gap-2">
            {(cats ?? []).slice(0, 8).map((c: any) => (
              <Link key={c.id} to="/blog/categorie/$slug" params={{ slug: c.slug }} className="text-xs px-3 py-1.5 rounded-full border hover:bg-primary hover:text-primary-foreground transition">
                {c.name}
              </Link>
            ))}
          </nav>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (data?.rows ?? []).length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">Aucun article publié pour le moment.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(data?.rows ?? []).map((p: any) => <PostCard key={p.id} post={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}