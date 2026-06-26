import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Package, Plus } from "lucide-react";
import { NccPageHeader } from "@/components/ncc/NccPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { listProducts, createProduct } from "@/lib/ncc.functions";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/domain/types";
import { fmtMoney, StatusBadge } from "@/components/ncc/ncc-ui";

export const Route = createFileRoute("/ncc/products")({
  component: ProductsPage,
});

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  iptv: "IPTV",
  digital: "Produits numériques",
  service: "Services",
  license: "Licences",
  subscription: "Abonnements",
};

function ProductsPage() {
  const list = useServerFn(listProducts);
  const create = useServerFn(createProduct);
  const qc = useQueryClient();
  const [category, setCategory] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["ncc", "products", { category, status }],
    queryFn: () => list({
      data: {
        category: category === "all" ? undefined : (category as ProductCategory),
        status: status === "all" ? undefined : (status as "active" | "archived"),
      },
    }),
  });

  const m = useMutation({
    mutationFn: (input: {
      sku: string; name: string; description?: string; price: number;
      currency: string; category: ProductCategory; status?: "active" | "archived";
      image_url?: string;
    }) => create({ data: input }),
    onSuccess: () => { toast.success("Produit créé"); setOpen(false); qc.invalidateQueries({ queryKey: ["ncc", "products"] }); qc.invalidateQueries({ queryKey: ["ncc", "kpis"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div>
      <NccPageHeader
        icon={Package}
        title="Produits"
        description="Catalogue multi-catégories : IPTV, numériques, services, licences, abonnements."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nouveau produit</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouveau produit</DialogTitle></DialogHeader>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  m.mutate({
                    sku: String(f.get("sku")).trim(),
                    name: String(f.get("name")).trim(),
                    description: String(f.get("description") ?? "").trim() || undefined,
                    price: Number(f.get("price") ?? 0),
                    currency: String(f.get("currency") ?? "USD").trim().toUpperCase(),
                    category: String(f.get("category")) as ProductCategory,
                    status: "active",
                    image_url: String(f.get("image_url") ?? "").trim() || undefined,
                  });
                }}
              >
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>SKU</Label><Input name="sku" required /></div>
                  <div>
                    <Label>Catégorie</Label>
                    <Select name="category" defaultValue="iptv">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRODUCT_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Nom</Label><Input name="name" required /></div>
                <div><Label>Description</Label><Textarea name="description" rows={2} /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>Prix</Label><Input name="price" type="number" step="0.01" min="0" defaultValue="0" /></div>
                  <div><Label>Devise</Label><Input name="currency" defaultValue="USD" maxLength={3} /></div>
                  <div><Label>Image URL</Label><Input name="image_url" type="url" /></div>
                </div>
                <DialogFooter><Button type="submit" disabled={m.isPending}>{m.isPending ? "Création…" : "Créer"}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {PRODUCT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="archived">Archivé</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isLoading && <div className="text-sm text-muted-foreground">Chargement…</div>}
      {!isLoading && (data ?? []).length === 0 && <div className="text-sm text-muted-foreground">Aucun produit.</div>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((p) => (
          <Card key={p.id} className="overflow-hidden">
            {p.image_url && <img src={p.image_url} alt={p.name} loading="lazy" className="h-32 w-full object-cover" />}
            <CardContent className="pt-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{CATEGORY_LABELS[p.category as ProductCategory] ?? p.category}</span>
                <StatusBadge status={p.status} />
              </div>
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-muted-foreground font-mono">{p.sku}</div>
              <div className="text-sm">{fmtMoney(Number(p.price), p.currency)}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
