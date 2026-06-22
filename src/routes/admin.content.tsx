import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListSettings, adminUpsertSetting } from "@/lib/admin.functions";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/content")({ component: ContentPage });

const GROUPS: { key: string; title: string; description: string; fields: { name: string; label: string; multi?: boolean }[] }[] = [
  {
    key: "hero", title: "Section Hero", description: "Bannière principale de la page d'accueil.",
    fields: [
      { name: "badge", label: "Badge" },
      { name: "title", label: "Titre" },
      { name: "subtitle", label: "Sous-titre", multi: true },
    ],
  },
  {
    key: "contact", title: "Coordonnées", description: "Comment les clients vous contactent.",
    fields: [
      { name: "email", label: "Email support" },
      { name: "whatsapp", label: "WhatsApp" },
      { name: "telegram", label: "Telegram" },
    ],
  },
  {
    key: "social", title: "Réseaux sociaux", description: "Liens vers vos profils.",
    fields: [
      { name: "facebook", label: "Facebook" },
      { name: "instagram", label: "Instagram" },
      { name: "twitter", label: "X / Twitter" },
      { name: "youtube", label: "YouTube" },
    ],
  },
];

function ContentPage() {
  const list = useServerFn(adminListSettings);
  const upsert = useServerFn(adminUpsertSetting);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "settings"], queryFn: () => list() });
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    const map: Record<string, Record<string, string>> = {};
    for (const g of GROUPS) {
      const row = (data as any[]).find((s) => s.key === g.key);
      map[g.key] = {};
      for (const f of g.fields) map[g.key][f.name] = String(row?.value?.[f.name] ?? "");
    }
    setValues(map);
  }, [data]);

  async function save(key: string) {
    setSavingKey(key);
    try {
      await upsert({ data: { key, value: values[key] ?? {} } });
      toast.success("Enregistré");
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    } catch (e: any) { toast.error(e?.message ?? "Erreur"); }
    finally { setSavingKey(null); }
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Contenu du site</h1>
        <p className="text-sm text-muted-foreground">Modifiez les textes et coordonnées affichés sur le site public.</p>
      </div>

      {GROUPS.map((g) => (
        <Card key={g.key}>
          <CardHeader>
            <CardTitle>{g.title}</CardTitle>
            <CardDescription>{g.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {g.fields.map((f) => (
              <div key={f.name} className="space-y-1">
                <Label>{f.label}</Label>
                {f.multi ? (
                  <Textarea rows={3} value={values[g.key]?.[f.name] ?? ""}
                    onChange={(e) => setValues({ ...values, [g.key]: { ...values[g.key], [f.name]: e.target.value } })} />
                ) : (
                  <Input value={values[g.key]?.[f.name] ?? ""}
                    onChange={(e) => setValues({ ...values, [g.key]: { ...values[g.key], [f.name]: e.target.value } })} />
                )}
              </div>
            ))}
            <div className="flex justify-end">
              <Button onClick={() => save(g.key)} disabled={savingKey === g.key}>
                {savingKey === g.key && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}