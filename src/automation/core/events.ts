// Catalogue typé des événements métier reconnus par le moteur d'automatisation.
// Étendre la liste = ajouter une clé ici. Aucun module ne doit utiliser de
// chaîne arbitraire : passer par BUSINESS_EVENTS garantit le typage.

export const BUSINESS_EVENTS = [
  "order.created",
  "payment.confirmed",
  "payment.failed",
  "customer.created",
  "subscription.created",
  "subscription.renewed",
  "subscription.expired",
  "subscription.activated",
  "subscription.suspended",
  "trial.requested",
  "support.ticket.created",
] as const;

export type BusinessEvent = (typeof BUSINESS_EVENTS)[number];

export function isBusinessEvent(v: string): v is BusinessEvent {
  return (BUSINESS_EVENTS as readonly string[]).includes(v);
}

export interface BusinessEventPayload {
  event: BusinessEvent;
  data: Record<string, unknown>;
  actorId?: string | null;
}