import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { publicGetCategoryBySlug, publicListPosts } from "@/lib/blog.functions";
import { queryOptions, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { PostCard } from "@/components/blog/PostCard";
import { ArrowLeft } from "lucide-react";

const catPostsQO = (slug: string) =>
  queryOptions({
    queryKey: ["blog", "cat", slug],
    queryFn: () => publicListPosts({ data: { category_slug: slug, page: 1, page_size: 24 } }),
    staleTime: 0,
  });

export const Route = createFileRoute("/blog/categorie/$slug")({
  loader: async ({ params, context }) => {
    const cat = await publicGetCategoryBySlug({ data: { slug: params.slug } });
    if (!cat) throw notFound();
    await context.queryClient.ensureQueryData(catPostsQO(params.slug));
    return { cat };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Catégorie introuvable" }, { name: "robots", content: "noindex" }] };
    const c: any = loaderData.cat;
    const url = `https://nexora-iptv.com/blog/categorie/${params.slug}`;
    const title = c.seo_title || `${c.name} — Blog Nexora`;
    const desc = c.seo_description || c.description || `Articles Nexora dans la catégorie ${c.name}.`;
    const collectionPage = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": url,
      name: title,
      description: desc,
      url,
      inLanguage: "fr-FR",
      isPartOf: { "@type": "Blog", "@id": "https://nexora-iptv.com/blog", name: "Blog Nexora IPTV" },
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
        { "@type": "ListItem", position: 2, name: "Blog", item: "https://nexora-iptv.com/blog" },
        { "@type": "ListItem", position: 3, name: c.name, item: url },
      ],
    };
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
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(collectionPage) },
        { type: "application/ld+json", children: JSON.stringify(breadcrumbs) },
      ],
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
  const { data } = useSuspenseQuery(catPostsQO(cat.slug));
  useQuery({ ...catPostsQO(cat.slug), refetchInterval: 60_000, refetchOnWindowFocus: true });
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6"><ArrowLeft className="h-4 w-4" /> Blog</Link>
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">{cat.name}</h1>
          {cat.description && <p className="mt-2 text-muted-foreground">{cat.description}</p>}
        </header>
        {(data?.rows ?? []).length === 0 ? (
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