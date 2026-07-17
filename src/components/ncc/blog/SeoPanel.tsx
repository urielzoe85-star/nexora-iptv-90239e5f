import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function SeoPanel({
  seoTitle, setSeoTitle,
  seoDescription, setSeoDescription,
  slug, setSlug,
  canonicalUrl, setCanonicalUrl,
  ogImageUrl, setOgImageUrl,
  noindex, setNoindex,
  publicUrl,
}: {
  seoTitle: string; setSeoTitle: (v: string) => void;
  seoDescription: string; setSeoDescription: (v: string) => void;
  slug: string; setSlug: (v: string) => void;
  canonicalUrl: string; setCanonicalUrl: (v: string) => void;
  ogImageUrl: string; setOgImageUrl: (v: string) => void;
  noindex: boolean; setNoindex: (v: boolean) => void;
  publicUrl: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="rounded-md border p-3 bg-muted/20">
          <div className="text-xs text-muted-foreground">{publicUrl}</div>
          <div className="text-[#1a0dab] text-base leading-tight truncate">{seoTitle || "Titre SEO"}</div>
          <div className="text-sm text-muted-foreground line-clamp-2">{seoDescription || "Description SEO qui apparaîtra dans les résultats Google."}</div>
        </div>
      </div>
      <div className="space-y-1">
        <Label>Titre SEO <span className={`text-xs ${seoTitle.length > 60 ? "text-destructive" : "text-muted-foreground"}`}>{seoTitle.length}/60</span></Label>
        <Input value={seoTitle} maxLength={80} onChange={(e) => setSeoTitle(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Meta description <span className={`text-xs ${seoDescription.length > 160 ? "text-destructive" : "text-muted-foreground"}`}>{seoDescription.length}/160</span></Label>
        <Textarea rows={3} value={seoDescription} maxLength={200} onChange={(e) => setSeoDescription(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Slug</Label>
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="mon-article" />
      </div>
      <div className="space-y-1">
        <Label>Image sociale (OG)</Label>
        <Input value={ogImageUrl} onChange={(e) => setOgImageUrl(e.target.value)} placeholder="https://…" />
      </div>
      <div className="space-y-1">
        <Label>URL canonique</Label>
        <Input value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} placeholder="https://…" />
      </div>
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <div className="text-sm font-medium">Noindex</div>
          <div className="text-xs text-muted-foreground">Cacher cet article des moteurs de recherche.</div>
        </div>
        <Switch checked={noindex} onCheckedChange={setNoindex} />
      </div>
    </div>
  );
}