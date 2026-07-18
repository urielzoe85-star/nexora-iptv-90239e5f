import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listGalleryPublic, type GalleryItem } from "@/lib/gallery.functions";
import { RatingBadge, RatingBadgeFloating } from "@/components/gallery/RatingBadge";

const BASE_URL = "https://nexora-iptv.com";

export const Route = createFileRoute("/galerie")({
  loader: async ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["gallery", "public"],
      queryFn: () => listGalleryPublic(),
    }) as Promise<GalleryItem[]>,
  head: ({ loaderData }) => {
    const items = (loaderData ?? []) as GalleryItem[];
    const first = items[0];
    const itemList = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: items.slice(0, 30).map((it, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          name: it.title,
          image: it.image_url,
          description: it.description ?? undefined,
          sku: it.sku ?? undefined,
          brand: it.brand ? { "@type": "Brand", name: it.brand } : undefined,
          offers: it.price != null ? {
            "@type": "Offer",
            price: it.price,
            priceCurrency: it.currency,
            availability: `https://schema.org/${it.availability === "in_stock" ? "InStock" : it.availability === "preorder" ? "PreOrder" : "OutOfStock"}`,
          } : undefined,
          aggregateRating: (it.rating_enabled && it.rating_avg && it.rating_count) ? {
            "@type": "AggregateRating",
            ratingValue: it.rating_avg,
            reviewCount: it.rating_count,
            bestRating: 5,
            worstRating: 1,
          } : undefined,
          url: it.product_slug ? `${BASE_URL}/produits/${it.product_slug}` : `${BASE_URL}/#pricing${it.plan_slug ? "-" + it.plan_slug : ""}`,
        },
      })),
    };
    return {
      meta: [
        { title: "Galerie produits IPTV Nexora — Photos et offres" },
        { name: "description", content: "Découvrez nos abonnements IPTV et produits en photos. Cliquez sur une image pour voir l'offre et son prix." },
        { property: "og:title", content: "Galerie produits IPTV Nexora" },
        { property: "og:description", content: "Photos de nos plans IPTV et produits — prix, offres et achat direct." },
        { property: "og:type", content: "website" },
        ...(first ? [{ property: "og:image", content: first.image_url }, { name: "twitter:image", content: first.image_url }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [
        { rel: "canonical", href: `${BASE_URL}/galerie` },
        { rel: "alternate", type: "application/xml", href: `${BASE_URL}/merchant-feed.xml`, title: "Google Merchant feed" },
      ],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(itemList) }],
    };
  },
  component: GalleryPage,
});

function itemHref(it: GalleryItem): string {
  if (it.link_type === "product_page" && it.product_slug) return `/produits/${it.product_slug}`;
  if (it.link_type === "external_url" && it.external_url) return it.external_url;
  if (it.link_type === "plan" && it.plan_slug) return `/#pricing-${it.plan_slug}`;
  return "/#pricing";
}

function GalleryPage() {
  const fetchList = useServerFn(listGalleryPublic);
  const { data: items = [] } = useQuery({ queryKey: ["gallery", "public"], queryFn: () => fetchList() });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="text-center mb-12">
          <p className="text-sm uppercase tracking-[0.2em] text-[color:var(--gold)] mb-3">Galerie</p>
          <h1 className="text-4xl md:text-5xl font-bold">Nos <span className="text-gradient-gold">produits en images</span></h1>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Chaque photo vous mène directement à l'offre correspondante. Prix, disponibilité et achat en un clic.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">La galerie sera bientôt disponible.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((it) => {
              const href = itemHref(it);
              const isExternal = it.link_type === "external_url";
              const inner = (
                <div className="group glass rounded-2xl overflow-hidden hover-scale transition h-full flex flex-col">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    {it.rating_enabled && it.rating_avg != null && it.rating_count != null && (
                      <RatingBadgeFloating avg={Number(it.rating_avg)} count={it.rating_count} />
                    )}
                    <img src={it.image_url} alt={it.title} loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition" />
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h2 className="font-semibold text-lg">{it.title}</h2>
                    {it.rating_enabled && it.rating_avg != null && it.rating_count != null && (
                      <div className="mt-1.5">
                        <RatingBadge avg={Number(it.rating_avg)} count={it.rating_count} size="sm" />
                      </div>
                    )}
                    {it.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{it.description}</p>}
                    <div className="mt-auto pt-4 flex items-center justify-between">
                      {it.price != null ? (
                        <span className="text-xl font-bold text-gradient-gold">${it.price}</span>
                      ) : <span />}
                      <span className="btn-gold btn-gold-hover px-4 py-2 rounded-full text-sm font-semibold">Voir l'offre</span>
                    </div>
                  </div>
                </div>
              );
              return isExternal ? (
                <a key={it.id} href={href} target="_blank" rel="noopener noreferrer">{inner}</a>
              ) : href.startsWith("/#") ? (
                <a key={it.id} href={href}>{inner}</a>
              ) : (
                <Link key={it.id} to={href}>{inner}</Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
