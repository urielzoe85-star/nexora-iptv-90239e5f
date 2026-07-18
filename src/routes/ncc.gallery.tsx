import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Images, Plus, Pencil, Trash2, Upload, Link as LinkIcon, Loader2 } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  adminListGallery, adminUpsertGalleryItem, adminDeleteGalleryItem, adminUploadGalleryImage,
  type GalleryItem,
} from "@/lib/gallery.functions";
import { getPublicPlans } from "@/lib/plans.functions";

export const Route = createFileRoute("/ncc/gallery")({ component: GalleryAdmin });

type FormState = Partial<GalleryItem> & { image_url: string };

const EMPTY: FormState = {
  title: "", description: "", image_url: "", image_source: "external",
  link_type: "plan", plan_slug: "", product_slug: "", external_url: "",
  price: null, currency: "USD", sku: "", brand: "", availability: "in_stock",
  sort_order: 0, active: true,
};

function GalleryAdmin() {
  const list = useServerFn(adminListGallery);
  const upsert = useServerFn(adminUpsertGalleryItem);
  const del = useServerFn(adminDeleteGalleryItem);
  const upload = useServerFn(adminUploadGalleryImage);
  const plansFn = useServerFn(getPublicPlans);
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({ queryKey: ["ncc", "gallery"], queryFn: () => list() });
  const { data: plans = [] } = useQuery({ queryKey: ["public-plans"], queryFn: () => plansFn() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [uploading, setUploading] = useState(false);

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      return upsert({ data: {
        id: f.id,
        title: f.title ?? "",
        description: f.description ?? null,
        image_url: f.image_url,
        image_source: (f.image_source ?? "external") as "upload" | "external",
        link_type: (f.link_type ?? "plan") as "plan" | "product_page" | "external_url",
        plan_slug: f.plan_slug || null,
        product_slug: f.product_slug || null,
        external_url: f.external_url || null,
        price: f.price ?? null,
        currency: (f.currency ?? "USD").toUpperCase(),
        sku: f.sku || null,
        brand: f.brand || null,
        availability: (f.availability ?? "in_stock") as "in_stock" | "out_of_stock" | "preorder",
        sort_order: Number(f.sort_order ?? 0),
        active: f.active ?? true,
        rating_avg: f.rating_avg == null || (f.rating_avg as any) === "" ? null : Number(f.rating_avg),
        rating_count: f.rating_count == null || (f.rating_count as any) === "" ? null : Number(f.rating_count),
        rating_enabled: f.rating_enabled ?? true,
      } });
    },
    onSuccess: () => {
      toast.success("Enregistré");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["ncc", "gallery"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success("Supprimé"); qc.invalidateQueries({ queryKey: ["ncc", "gallery"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  async function onPickFile(file: File) {
    setUploading(true);
    try {
      const buf = await file.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
      const b64 = btoa(bin);
      const res = await upload({ data: { filename: file.name, contentType: file.type || "image/jpeg", base64: b64 } });
      setForm((f) => ({ ...f, image_url: res.url, image_source: "upload" }));
      toast.success("Image envoyée");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <NccPageHeader
        icon={Images}
        title="Galerie photos"
        description="Photos produits liées à vos plans IPTV ou pages produit dédiées. Optimisé Google Merchant."
        action={
          <Button size="sm" onClick={() => { setForm(EMPTY); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Nouvelle photo
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin mr-2" />Chargement…</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Aucune photo. Ajoutez-en une pour commencer.</div>
          ) : (
            <div className="divide-y">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-4 p-3">
                  <img src={it.image_url} alt={it.title} className="h-16 w-16 rounded object-cover bg-muted" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{it.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {it.link_type === "plan" && `→ Plan #pricing-${it.plan_slug}`}
                      {it.link_type === "product_page" && `→ /produits/${it.product_slug}`}
                      {it.link_type === "external_url" && `→ ${it.external_url}`}
                      {it.price != null && ` · ${it.price} ${it.currency}`}
                      {!it.active && " · inactif"}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { setForm(it); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Supprimer ?")) remove.mutate(it.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Modifier la photo" : "Nouvelle photo"}</DialogTitle></DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Image</Label>
              <Tabs value={form.image_source ?? "external"} onValueChange={(v) => setForm((f) => ({ ...f, image_source: v as "upload" | "external" }))}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="upload"><Upload className="h-4 w-4 mr-1" />Upload</TabsTrigger>
                  <TabsTrigger value="external"><LinkIcon className="h-4 w-4 mr-1" />URL externe</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="space-y-2">
                  <Input type="file" accept="image/*" disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickFile(f); }} />
                  {uploading && <p className="text-xs text-muted-foreground"><Loader2 className="inline h-3 w-3 animate-spin mr-1" />Envoi…</p>}
                </TabsContent>
                <TabsContent value="external">
                  <Input placeholder="https://…/image.jpg" value={form.image_url}
                    onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value, image_source: "external" }))} />
                </TabsContent>
              </Tabs>
              {form.image_url && <img src={form.image_url} alt="" className="mt-2 h-32 rounded object-cover bg-muted" />}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Titre</Label>
                <Input value={form.title ?? ""} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <Label>Cible du clic</Label>
                <Select value={form.link_type ?? "plan"} onValueChange={(v) => setForm((f) => ({ ...f, link_type: v as FormState["link_type"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plan">Plan IPTV (ancre #pricing)</SelectItem>
                    <SelectItem value="product_page">Page produit dédiée /produits/…</SelectItem>
                    <SelectItem value="external_url">URL externe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.link_type === "plan" && (
                <div className="col-span-2">
                  <Label>Plan lié</Label>
                  <Select value={form.plan_slug ?? ""} onValueChange={(v) => setForm((f) => ({ ...f, plan_slug: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un plan" /></SelectTrigger>
                    <SelectContent>
                      {plans.map((p) => <SelectItem key={p.slug} value={p.slug}>{p.name} — {p.price} {p.currency}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {form.link_type === "product_page" && (
                <div className="col-span-2">
                  <Label>Slug produit (URL)</Label>
                  <Input placeholder="mon-produit" value={form.product_slug ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, product_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))} />
                  <p className="text-xs text-muted-foreground mt-1">Accessible sur /produits/{form.product_slug || "…"}</p>
                </div>
              )}
              {form.link_type === "external_url" && (
                <div className="col-span-2">
                  <Label>URL externe</Label>
                  <Input placeholder="https://…" value={form.external_url ?? ""} onChange={(e) => setForm((f) => ({ ...f, external_url: e.target.value }))} />
                </div>
              )}

              <div>
                <Label>Prix</Label>
                <Input type="number" step="0.01" value={form.price ?? ""} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value === "" ? null : Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Devise</Label>
                <Input value={form.currency ?? "USD"} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} />
              </div>
              <div>
                <Label>SKU</Label>
                <Input value={form.sku ?? ""} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
              </div>
              <div>
                <Label>Marque</Label>
                <Input value={form.brand ?? ""} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
              </div>
              <div>
                <Label>Disponibilité</Label>
                <Select value={form.availability ?? "in_stock"} onValueChange={(v) => setForm((f) => ({ ...f, availability: v as FormState["availability"] }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_stock">En stock</SelectItem>
                    <SelectItem value="out_of_stock">Rupture</SelectItem>
                    <SelectItem value="preorder">Précommande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ordre d'affichage</Label>
                <Input type="number" value={form.sort_order ?? 0} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Note (0–5, vide = auto)</Label>
                <Input type="number" step="0.1" min="0" max="5" placeholder="auto"
                  value={form.rating_avg ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, rating_avg: e.target.value === "" ? null : Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Nombre d'avis (vide = auto)</Label>
                <Input type="number" min="0" placeholder="auto"
                  value={form.rating_count ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, rating_count: e.target.value === "" ? null : Number(e.target.value) }))} />
              </div>
              <div className="col-span-2 flex items-center justify-between rounded border p-3">
                <Label>Afficher la note sur le site</Label>
                <Switch checked={form.rating_enabled ?? true} onCheckedChange={(v) => setForm((f) => ({ ...f, rating_enabled: v }))} />
              </div>
              <div className="col-span-2 flex items-center justify-between rounded border p-3">
                <Label>Actif (visible sur le site)</Label>
                <Switch checked={form.active ?? true} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.title || !form.image_url}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
