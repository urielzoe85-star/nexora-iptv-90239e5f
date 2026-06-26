import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { listNotifications, sendNotification } from "@/lib/ncc.functions";
import { NOTIFICATION_CHANNELS, type NotificationChannel } from "@/domain/types";
import { fmtDate, StatusBadge } from "@/components/ncc/ncc-ui";

export function NotificationsView({ channel, allowChannelSwitch = true }: { channel?: NotificationChannel; allowChannelSwitch?: boolean }) {
  const list = useServerFn(listNotifications);
  const send = useServerFn(sendNotification);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>(channel ?? "all");
  const effectiveChannel = channel ?? (filter === "all" ? undefined : (filter as NotificationChannel));

  const { data, isLoading } = useQuery({
    queryKey: ["ncc", "notifications", effectiveChannel ?? "all"],
    queryFn: () => list({ data: { channel: effectiveChannel } }),
  });

  const m = useMutation({
    mutationFn: (input: { channel: NotificationChannel; recipient: string; subject?: string; body?: string }) => send({ data: input }),
    onSuccess: () => { toast.success("Notification envoyée"); qc.invalidateQueries({ queryKey: ["ncc", "notifications"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <form
            className="grid sm:grid-cols-2 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              m.mutate({
                channel: (channel ?? (f.get("channel") as NotificationChannel)) ?? "email",
                recipient: String(f.get("recipient") ?? ""),
                subject: String(f.get("subject") ?? "") || undefined,
                body: String(f.get("body") ?? "") || undefined,
              });
              (e.currentTarget as HTMLFormElement).reset();
            }}
          >
            {!channel && (
              <div>
                <Label>Canal</Label>
                <Select name="channel" defaultValue="email">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className={channel ? "sm:col-span-2" : ""}>
              <Label>Destinataire</Label><Input name="recipient" required />
            </div>
            <div className="sm:col-span-2"><Label>Sujet</Label><Input name="subject" /></div>
            <div className="sm:col-span-2"><Label>Message</Label><Textarea name="body" rows={3} /></div>
            <div className="sm:col-span-2"><Button type="submit" disabled={m.isPending}><Send className="h-4 w-4 mr-1" /> Envoyer</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          {allowChannelSwitch && !channel && (
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les canaux</SelectItem>
                {NOTIFICATION_CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Table>
            <TableHeader><TableRow>
              <TableHead>Canal</TableHead><TableHead>Destinataire</TableHead><TableHead>Sujet</TableHead>
              <TableHead>Statut</TableHead><TableHead>Créée</TableHead><TableHead>Envoyée</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Chargement…</TableCell></TableRow>}
              {!isLoading && (data ?? []).length === 0 && <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Aucune notification.</TableCell></TableRow>}
              {(data ?? []).map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="text-xs uppercase">{n.channel}</TableCell>
                  <TableCell className="text-sm">{n.recipient}</TableCell>
                  <TableCell className="text-sm">{n.subject ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={n.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(n.created_at)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(n.sent_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}