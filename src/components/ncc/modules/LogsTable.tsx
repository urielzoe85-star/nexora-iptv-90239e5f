import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollText } from "lucide-react";

export function LogsTable() {
  return (
    <Card className="border-border/60">
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input placeholder="Rechercher dans les évènements…" className="flex-1" disabled />
          <Select disabled><SelectTrigger className="sm:w-40"><SelectValue placeholder="Niveau" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select disabled><SelectTrigger className="sm:w-40"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="auth">Auth</SelectItem>
              <SelectItem value="payment">Paiement</SelectItem>
              <SelectItem value="iptv">IPTV</SelectItem>
              <SelectItem value="bot">Bot</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" disabled>Exporter</Button>
        </div>
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Date</TableHead>
                <TableHead className="w-20">Niveau</TableHead>
                <TableHead className="w-28">Source</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="w-40">Acteur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="py-16 text-center">
                  <ScrollText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">Aucun évènement enregistré.</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Le journal collectera les évènements système dès la prochaine phase.
                  </p>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
