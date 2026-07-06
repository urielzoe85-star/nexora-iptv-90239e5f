import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getGalleryItemBySlug, type GalleryItem } from "@/lib/gallery.functions";

const BASE_URL = "https://nexora-iptv.com";

export const Route = createFileRoute("/produits/$slug")({
  loader: async ({ params }) => {
    const item = await getGalleryItemBySlug({ data: { slug: params.slug } });
    if (!item) throw notFound();
    return item as GalleryItem;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Produit introuvable — Nexora IPTV" }] };
    const it = loaderData as GalleryItem;
    const url = `${BASE_URL}/produits/${params.slug}`;
    const product = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: it.title,
      description: it.description ?? it.title,
      image: [it.image_url],
      sku: it.sku ?? undefined,
      brand: it.brand ? { "@type": "Brand", name: it.brand } : { "@type": "Brand", name: "Nexora IPTV" },
      offers: it.price != null ? {
        "@type": "Offer",
        url,
        price: it.price,
        priceCurrency: it.currency,
        availability: `https://schema.org/${it.availability === "in_stock" ? "InStock" : it.availability === "preorder" ? "PreOrder" : "OutOfStock"}`,
      } : undefined,
    };
    return {
      meta: [
        { title: `${it.title} — Nexora IPTV` },
        { name: "description", content: it.description ?? `${it.title} — Achetez directement sur Nexora IPTV.` },
        { property: "og:title", content: it.title },
        { property: "og:description", content: it.description ?? it.title },
        { property: "og:type", content: "product" },
        { property: "og:image", content: it.image_url },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: it.image_url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(product) }],
    };
  },
  notFoundComponent: () => (
    <main className="min-h-screen grid place-items-center bg-background text-foreground p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Produit introuvable</h1>
        <p className="text-muted-foreground mt-2">Cette page produit n'existe pas ou a été retirée.</p>
        <Link to="/galerie" className="btn-gold btn-gold-hover mt-6 inline-block px-6 py-3 rounded-full font-semibold">Voir la galerie</Link>
      </div>
    </main>
  ),
  errorComponent: ({ error, reset }) => (
    <main className="min-h-screen grid place-items-center bg-background text-foreground p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Erreur</h1>
        <p className="text-muted-foreground mt-2">{error.message}</p>
        <button className="btn-gold btn-gold-hover mt-6 px-6 py-3 rounded-full font-semibold" onClick={() => reset()}>Réessayer</button>
      </div>
    </main>
  ),
  component: ProductPage,
});

function ProductPage() {
  const it = Route.useLoaderData() as GalleryItem;
  const planLink = it.plan_slug ? `/#pricing-${it.plan_slug}` : "/#pricing";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <nav className="text-sm text-muted-foreground mb-6">
          <Link to="/galerie" className="hover:text-foreground">← Retour à la galerie</Link>
        </nav>
        <div className="grid md:grid-cols-2 gap-10 items-start">
          <div className="glass rounded-2xl overflow-hidden">
            <img src={it.image_url} alt={it.title} className="w-full aspect-square object-cover" />
          </div>
          <div>
            {it.brand && <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-2">{it.brand}</p>}
            <h1 className="text-4xl font-bold">{it.title}</h1>
            {it.price != null && (
              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-5xl font-bold text-gradient-gold">${it.price}</span>
                <span className="text-muted-foreground">{it.currency}</span>
              </div>
            )}
            <p className="mt-4 text-sm text-muted-foreground">
              {it.availability === "in_stock" ? "En stock" : it.availability === "preorder" ? "Précommande" : "Rupture"}
              {it.sku && ` · SKU ${it.sku}`}
            </p>
            {it.description && <p className="mt-6 text-muted-foreground whitespace-pre-line">{it.description}</p>}

            <div className="mt-8 flex flex-wrap gap-3">
              {it.plan_slug ? (
                <a href={`/checkout?plan=${encodeURIComponent(it.plan_slug)}`} className="btn-gold btn-gold-hover px-7 py-3.5 rounded-full font-semibold">
                  Acheter maintenant
                </a>
              ) : (
                <a href={planLink} className="btn-gold btn-gold-hover px-7 py-3.5 rounded-full font-semibold">
                  Voir les offres
                </a>
              )}
              <Link to="/galerie" className="glass px-7 py-3.5 rounded-full font-semibold hover:border-[color:var(--gold)]/40 transition">
                Autres produits
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
