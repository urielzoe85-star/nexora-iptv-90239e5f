import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { adminListSettings, adminUpsertSetting } from "@/lib/admin.functions";
import type { SettingCard, SettingField } from "@/lib/ncc/settings-schema";

type ValueMap = Record<string, Record<string, unknown>>;

function coerceForSave(field: SettingField, raw: unknown): unknown {
  if (field.type === "switch") return Boolean(raw);
  if (field.type === "number") {
    if (raw === "" || raw === null || raw === undefined) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return typeof raw === "string" ? raw.trim() : (raw ?? null);
}

export function SettingsSectionForm({ cards }: { cards: SettingCard[] }) {
  const list = useServerFn(adminListSettings);
  const upsert = useServerFn(adminUpsertSetting);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["ncc", "settings"],
    queryFn: () => list(),
    staleTime: 30_000,
  });

  const initial = useMemo<ValueMap>(() => {
    const map: ValueMap = {};
    for (const card of cards) {
      const row = (data as any[] | undefined)?.find((s) => s.key === card.key);
      const values = (row?.value ?? {}) as Record<string, unknown>;
      map[card.key] = {};
      for (const f of card.fields) {
        const v = values[f.name];
        if (f.type === "switch") map[card.key][f.name] = Boolean(v);
        else map[card.key][f.name] = v ?? "";
      }
    }
    return map;
  }, [data, cards]);

  const [values, setValues] = useState<ValueMap>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => { setValues(initial); }, [initial]);

  function updateField(cardKey: string, name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [cardKey]: { ...(prev[cardKey] ?? {}), [name]: value } }));
  }

  function isDirty(cardKey: string): boolean {
    const a = values[cardKey] ?? {};
    const b = initial[cardKey] ?? {};
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) if ((a[k] ?? "") !== (b[k] ?? "")) return true;
    return false;
  }

  async function save(card: SettingCard) {
    setSavingKey(card.key);
    try {
      const raw = values[card.key] ?? {};
      const payload: Record<string, unknown> = {};
      for (const f of card.fields) payload[f.name] = coerceForSave(f, raw[f.name]);
      await upsert({ data: { key: card.key, value: payload } });
      toast.success("Enregistré");
      await qc.invalidateQueries({ queryKey: ["ncc", "settings"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur d'enregistrement");
    } finally {
      setSavingKey(null);
    }
  }

  function reset(card: SettingCard) {
    setValues((prev) => ({ ...prev, [card.key]: initial[card.key] ?? {} }));
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {cards.map((card) => {
        const dirty = isDirty(card.key);
        return (
          <Card key={card.key}>
            <CardHeader>
              <CardTitle className="text-base">{card.title}</CardTitle>
              {card.description && <CardDescription>{card.description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                {card.fields.map((f) => {
                  const val = values[card.key]?.[f.name];
                  const fullWidth = f.type === "textarea" || f.type === "switch";
                  return (
                    <div key={f.name} className={fullWidth ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}>
                      {f.type === "switch" ? (
                        <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-3 py-2.5">
                          <div className="flex flex-col">
                            <Label className="text-sm">{f.label}</Label>
                            {f.help && <span className="text-xs text-muted-foreground">{f.help}</span>}
                          </div>
                          <Switch checked={Boolean(val)} onCheckedChange={(c) => updateField(card.key, f.name, c)} />
                        </div>
                      ) : (
                        <>
                          <Label className="text-sm">{f.label}</Label>
                          {f.type === "textarea" ? (
                            <Textarea
                              rows={f.rows ?? 3}
                              value={String(val ?? "")}
                              placeholder={f.placeholder}
                              onChange={(e) => updateField(card.key, f.name, e.target.value)}
                            />
                          ) : (
                            <Input
                              type={f.type === "password" ? "password" : f.type === "number" ? "number" : f.type === "email" ? "email" : f.type === "url" ? "url" : "text"}
                              value={String(val ?? "")}
                              placeholder={f.placeholder}
                              onChange={(e) => updateField(card.key, f.name, e.target.value)}
                            />
                          )}
                          {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => reset(card)} disabled={!dirty || savingKey === card.key}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Annuler
                </Button>
                <Button size="sm" onClick={() => save(card)} disabled={!dirty || savingKey === card.key}>
                  {savingKey === card.key ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}