import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminCreatePost, adminUpdatePost, adminGetPost, adminListCategories,
  adminListTags, adminUpsertTag, adminUploadBlogImage,
} from "@/lib/blog.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TipTapEditor } from "./TipTapEditor";
import { SeoPanel } from "./SeoPanel";
import { Loader2, Save, X, Upload } from "lucide-react";
import { toast } from "sonner";

function slugifyClient(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 120);
}

export function BlogEditor({ postId }: { postId?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(adminCreatePost);
  const update = useServerFn(adminUpdatePost);
  const getPost = useServerFn(adminGetPost);
  const listCats = useServerFn(adminListCategories);
  const listTags = useServerFn(adminListTags);
  const upsertTag = useServerFn(adminUpsertTag);
  const upload = useServerFn(adminUploadBlogImage);

  const { data: cats } = useQuery({ queryKey: ["ncc","blog","cats"], queryFn: () => listCats() });
  const { data: tags } = useQuery({ queryKey: ["ncc","blog","tags"], queryFn: () => listTags() });
  const { data: existing, isLoading } = useQuery({
    queryKey: ["ncc","blog","post", postId],
    queryFn: () => getPost({ data: { id: postId! } }),
    enabled: !!postId,
  });

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("<p></p>");
  const [cover, setCover] = useState("");
  const [coverAlt, setCoverAlt] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [authorName, setAuthorName] = useState("Nexora");
  const [status, setStatus] = useState<"draft"|"scheduled"|"published"|"archived">("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [canonical, setCanonical] = useState("");
  const [noindex, setNoindex] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setSlug(existing.slug);
    setExcerpt(existing.excerpt ?? "");
    setContent(existing.content_html || "<p></p>");
    setCover(existing.cover_image_url ?? "");
    setCoverAlt(existing.cover_image_alt ?? "");
    setCategoryId(existing.category_id ?? "");
    setTagIds((existing as any).tag_ids ?? []);
    setAuthorName(existing.author_name ?? "Nexora");
    setStatus(existing.status);
    setScheduledAt(existing.scheduled_at ? existing.scheduled_at.slice(0, 16) : "");
    setSeoTitle(existing.seo_title ?? "");
    setSeoDesc(existing.seo_description ?? "");
    setOgImage(existing.og_image_url ?? "");
    setCanonical(existing.canonical_url ?? "");
    setNoindex(existing.noindex);
    setSlugTouched(true);
  }, [existing]);

  useEffect(() => {
    if (!slugTouched && title) setSlug(slugifyClient(title));
  }, [title, slugTouched]);

  async function uploadCover() {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = async () => {
      const f = input.files?.[0]; if (!f) return;
      if (f.size > 8 * 1024 * 1024) return toast.error("Image trop lourde (max 8 Mo)");
      const tId = toast.loading("Envoi de l'image…");
      try {
        const b64 = await fileToBase64(f);
        const { url } = await upload({ data: { filename: f.name, content_type: f.type || "image/jpeg", data_base64: b64 } });
        setCover(url);
        toast.success("Image téléversée", { id: tId });
      } catch (e: any) { toast.error(e?.message ?? "Erreur d'upload", { id: tId }); }
    };
    input.click();
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const s = r.result as string;
        resolve(s.split(",")[1] ?? "");
      };
      r.onerror = () => reject(r.error ?? new Error("Lecture du fichier impossible"));
      r.readAsDataURL(file);
    });
  }

  async function addTag() {
    const name = newTag.trim();
    if (!name) return;
    try {
      const { id } = await upsertTag({ data: { name } });
      if (!tagIds.includes(id)) setTagIds([...tagIds, id]);
      setNewTag("");
      qc.invalidateQueries({ queryKey: ["ncc","blog","tags"] });
    } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
  }

  async function save(overrideStatus?: typeof status) {
    if (!title.trim()) return toast.error("Le titre est requis");
    setSaving(true);
    const payload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      locale: "fr",
      excerpt: excerpt || null,
      content_html: content,
      content_json: {},
      cover_image_url: cover || null,
      cover_image_alt: coverAlt || null,
      category_id: categoryId || null,
      tag_ids: tagIds,
      author_name: authorName || null,
      seo_title: seoTitle || null,
      seo_description: seoDesc || null,
      og_image_url: ogImage || null,
      canonical_url: canonical || null,
      noindex,
      twitter_card: "summary_large_image",
      status: overrideStatus ?? status,
      published_at: null,
      scheduled_at: (overrideStatus ?? status) === "scheduled" && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      comments_enabled: false,
    } as any;
    try {
      if (postId) {
        await update({ data: { ...payload, id: postId } });
        toast.success("Article mis à jour");
      } else {
        const { id } = await create({ data: payload });
        toast.success("Article créé");
        navigate({ to: "/ncc/blog/$id", params: { id } });
      }
      qc.invalidateQueries({ queryKey: ["ncc","blog","posts"] });
    } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    finally { setSaving(false); }
  }

  if (postId && isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Input placeholder="Titre de l'article" value={title} onChange={(e) => setTitle(e.target.value)} className="text-xl font-semibold" />
        <Input placeholder="slug-url" value={slug} onChange={(e) => { setSlug(slugifyClient(e.target.value)); setSlugTouched(true); }} />
        <Textarea placeholder="Extrait (facultatif — généré automatiquement si vide)" rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        <TipTapEditor value={content} onChange={setContent} />
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Publication</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Statut</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="scheduled">Planifié</SelectItem>
                  <SelectItem value="published">Publié</SelectItem>
                  <SelectItem value="archived">Archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {status === "scheduled" && (
              <div className="space-y-1">
                <Label>Date de publication</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Button onClick={() => save()} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Enregistrer
              </Button>
              {status !== "published" && (
                <Button variant="outline" onClick={() => save("published")} disabled={saving}>Publier maintenant</Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Image de couverture</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {cover && <img src={cover} alt={coverAlt} className="w-full rounded border object-cover aspect-video" />}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={uploadCover}><Upload className="h-4 w-4 mr-2" />Téléverser</Button>
              {cover && <Button variant="ghost" size="sm" onClick={() => setCover("")}><X className="h-4 w-4" /></Button>}
            </div>
            <Input placeholder="Texte alternatif (accessibilité + SEO)" value={coverAlt} onChange={(e) => setCoverAlt(e.target.value)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Classement</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Catégorie</Label>
              <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {(cats ?? []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {tagIds.map((id) => {
                  const t = (tags ?? []).find((x: any) => x.id === id);
                  return t ? (
                    <Badge key={id} variant="secondary" className="cursor-pointer" onClick={() => setTagIds(tagIds.filter((x) => x !== id))}>
                      {t.name} ×
                    </Badge>
                  ) : null;
                })}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Nouveau tag…" value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} />
                <Button size="sm" variant="outline" onClick={addTag}>Ajouter</Button>
              </div>
              <Select value="" onValueChange={(id) => { if (id && !tagIds.includes(id)) setTagIds([...tagIds, id]); }}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Ajouter un tag existant" /></SelectTrigger>
                <SelectContent>
                  {(tags ?? []).filter((t: any) => !tagIds.includes(t.id)).map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Auteur</Label>
              <Input value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">SEO</CardTitle></CardHeader>
          <CardContent>
            <SeoPanel
              seoTitle={seoTitle} setSeoTitle={setSeoTitle}
              seoDescription={seoDesc} setSeoDescription={setSeoDesc}
              slug={slug} setSlug={(v) => { setSlug(slugifyClient(v)); setSlugTouched(true); }}
              canonicalUrl={canonical} setCanonicalUrl={setCanonical}
              ogImageUrl={ogImage} setOgImageUrl={setOgImage}
              noindex={noindex} setNoindex={setNoindex}
              publicUrl={`https://nexora-iptv.com/blog/${slug || "…"}`}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}