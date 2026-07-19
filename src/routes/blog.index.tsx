import { createFileRoute, Link } from "@tanstack/react-router";
import { publicListPosts, publicListCategories } from "@/lib/blog.functions";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { PostCard } from "@/components/blog/PostCard";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search } from "lucide-react";

const postsQO = (search: string) =>
  queryOptions({
    queryKey: ["blog", "posts", search],
    queryFn: () => publicListPosts({ data: { search: search || undefined, page: 1, page_size: 24 } }),
    staleTime: 0,
  });
const catsQO = queryOptions({
  queryKey: ["blog", "cats"],
  queryFn: () => publicListCategories(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/blog/")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(postsQO("")),
      context.queryClient.ensureQueryData(catsQO),
    ]);
  },
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-destructive mb-4">{error.message}</p>
        <button className="text-primary hover:underline" onClick={reset}>Réessayer</button>
      </div>
    </div>
  ),
  head: () => {
    const url = "https://nexora-iptv.com/blog";
    const blog = {
      "@context": "https://schema.org",
      "@type": "Blog",
      "@id": url,
      name: "Blog Nexora IPTV",
      description: "Guides d'installation IPTV, tutoriels Smart TV, Fire TV, Android, iPhone, actualités et conseils.",
      url,
      inLanguage: "fr-FR",
      publisher: {
        "@type": "Organization",
        name: "Nexora IPTV",
        logo: { "@type": "ImageObject", url: "https://nexora-iptv.com/icon-512.png", width: 512, height: 512 },
      },
    };
    const breadcrumbs = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: "https://nexora-iptv.com/" },
        { "@type": "ListItem", position: 2, name: "Blog", item: url },
      ],
    };
    return {
      meta: [
        { title: "Blog Nexora IPTV — Guides, tutoriels et actualités" },
        { name: "description", content: "Guides d'installation IPTV, tutoriels Smart TV, Fire TV, Android, iPhone, actualités et conseils pour tirer le meilleur de votre abonnement Nexora." },
        { property: "og:title", content: "Blog Nexora IPTV" },
        { property: "og:description", content: "Guides, tutoriels et actualités IPTV." },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(blog) },
        { type: "application/ld+json", children: JSON.stringify(breadcrumbs) },
      ],
    };
  },
  component: BlogIndex,
});

function BlogIndex() {
  const [search, setSearch] = useState("");
  // SSR-primed initial data (search=""). Search filters use client-only query.
  const { data: initial } = useSuspenseQuery(postsQO(""));
  const { data: cats } = useSuspenseQuery(catsQO);
  const { data: filtered } = useQuery({
    ...postsQO(search),
    enabled: search.length > 0,
    refetchOnWindowFocus: true,
  });
  // Keep list fresh: refetch base list on window focus / 60s.
  useQuery({
    ...postsQO(""),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const data = search ? filtered : initial;

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

        {(data?.rows ?? []).length === 0 ? (
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
