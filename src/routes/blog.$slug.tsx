import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { publicGetPost, publicRelatedPosts } from "@/lib/blog.functions";
import { useQuery } from "@tanstack/react-query";
import { PostCard } from "@/components/blog/PostCard";
import { Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await publicGetPost({ data: { slug: params.slug } });
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Article introuvable" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.post;
    const url = `https://nexora-iptv.com/blog/${params.slug}`;
    const title = p.seo_title || p.title;
    const desc = p.seo_description || p.excerpt || "";
    const img = p.og_image_url || p.cover_image_url;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        ...(p.noindex ? [{ name: "robots", content: "noindex, nofollow" }] : []),
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
        { name: "twitter:card", content: p.twitter_card || "summary_large_image" },
        { property: "article:published_time", content: p.published_at ?? "" },
        { property: "article:modified_time", content: p.updated_at ?? "" },
        ...(p.author_name ? [{ name: "author", content: p.author_name }] : []),
      ],
      links: [{ rel: "canonical", href: p.canonical_url || url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: p.title,
            description: desc,
            image: img ? [img] : undefined,
            datePublished: p.published_at,
            dateModified: p.updated_at,
            author: p.author_name ? { "@type": "Person", name: p.author_name } : undefined,
            publisher: {
              "@type": "Organization",
              name: "Nexora IPTV",
              logo: { "@type": "ImageObject", url: "https://nexora-iptv.com/icon-512.png" },
            },
            mainEntityOfPage: url,
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-2">Article introuvable</h1>
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
  component: PostPage,
});

function PostPage() {
  const { post } = Route.useLoaderData();
  const related = useServerFn(publicRelatedPosts);
  const { data: relatedPosts } = useQuery({
    queryKey: ["blog","related", post.id],
    queryFn: () => related({ data: { post_id: post.id, limit: 3 } }),
  });

  return (
    <article className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-6">
          <ArrowLeft className="h-4 w-4" /> Retour au blog
        </Link>

        <header className="mb-8">
          {post.category && (
            <Link to="/blog/categorie/$slug" params={{ slug: post.category.slug }} className="text-xs uppercase tracking-wider text-primary font-medium">
              {post.category.name}
            </Link>
          )}
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mt-2 mb-4">{post.title}</h1>
          {post.excerpt && <p className="text-lg text-muted-foreground">{post.excerpt}</p>}
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-4">
            {post.author_name && <span>Par <strong className="text-foreground">{post.author_name}</strong></span>}
            {post.published_at && <time>· {new Date(post.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</time>}
            {post.reading_time_min && <span>· {post.reading_time_min} min de lecture</span>}
          </div>
        </header>

        {post.cover_image_url && (
          <img src={post.cover_image_url} alt={post.cover_image_alt ?? post.title} className="w-full rounded-lg mb-8 aspect-video object-cover" />
        )}

        <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-primary prose-img:rounded-lg" dangerouslySetInnerHTML={{ __html: post.content_html }} />

        {post.tags?.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2">
            {post.tags.map((t: any) => (
              <span key={t.id} className="text-xs px-3 py-1 rounded-full bg-muted">#{t.name}</span>
            ))}
          </div>
        )}

        <div className="mt-12 p-6 rounded-lg border bg-gradient-to-br from-primary/10 to-primary/5 text-center">
          <h3 className="text-xl font-semibold mb-2">Prêt à profiter de Nexora IPTV ?</h3>
          <p className="text-muted-foreground mb-4">Plus de 20 000 chaînes, 80 000 VOD, activation immédiate.</p>
          <Link to="/catalog" className="inline-block px-6 py-2.5 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90">Voir les offres</Link>
        </div>

        {relatedPosts && relatedPosts.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-semibold mb-6">Articles similaires</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedPosts.map((r: any) => <PostCard key={r.id} post={r} />)}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}