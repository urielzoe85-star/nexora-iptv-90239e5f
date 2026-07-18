import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { publicGetCategoryBySlug, publicListPosts } from "@/lib/blog.functions";
import { useQuery } from "@tanstack/react-query";
import { PostCard } from "@/components/blog/PostCard";
import { Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/blog/categorie/$slug")({
  loader: async ({ params }) => {
    const cat = await publicGetCategoryBySlug({ data: { slug: params.slug } });
    if (!cat) throw notFound();
    return { cat };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Catégorie introuvable" }, { name: "robots", content: "noindex" }] };
    const c = loaderData.cat;
    const url = `https://nexora-iptv.com/blog/categorie/${params.slug}`;
    const title = c.seo_title || `${c.name} — Blog Nexora`;
    const desc = c.seo_description || c.description || `Articles Nexora dans la catégorie ${c.name}.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-2">Catégorie introuvable</h1>
        <Link to="/blog" className="text-primary hover:underline">← Retour au blog</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-destructive mb-4">{error.message}</p>
        <button className="text-primary hover:underline" onClick={reset}>Réessayer</button>
      </div>
    </div>
  ),
  component: CategoryPage,
});

function CategoryPage() {
  const { cat } = Route.useLoaderData();
  const list = useServerFn(publicListPosts);
  const { data, isLoading } = useQuery({
    queryKey: ["blog","cat", cat.slug],
    queryFn: () => list({ data: { category_slug: cat.slug, page: 1, page_size: 24 } }),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    staleTime: 0,
  });
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6"><ArrowLeft className="h-4 w-4" /> Blog</Link>
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">{cat.name}</h1>
          {cat.description && <p className="mt-2 text-muted-foreground">{cat.description}</p>}
        </header>
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (data?.rows ?? []).length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">Aucun article dans cette catégorie.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(data?.rows ?? []).map((p: any) => <PostCard key={p.id} post={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}