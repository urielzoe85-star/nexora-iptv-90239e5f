export const mockKpis = [
  { label: "Revenu (MRR)", value: "$12 480", delta: "+8.2%", trend: "up" as const },
  { label: "Clients actifs", value: "1 284", delta: "+34", trend: "up" as const },
  { label: "Commandes (24h)", value: "47", delta: "+5", trend: "up" as const },
  { label: "Taux de conversion", value: "3.6%", delta: "-0.2%", trend: "down" as const },
];

export const mockRevenueSeries = Array.from({ length: 30 }, (_, i) => {
  const base = 320 + Math.sin(i / 3) * 60 + i * 4;
  return {
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10),
    revenue: Math.round(base + Math.random() * 40),
  };
});

export const mockActivity = [
  { id: 1, who: "Marie K.", what: "a souscrit au plan Premium", when: "il y a 2 min", kind: "order" as const },
  { id: 2, who: "Système", what: "Paiement SebPay confirmé · #ORD-2934", when: "il y a 7 min", kind: "payment" as const },
  { id: 3, who: "Jean P.", what: "a ouvert un ticket support", when: "il y a 18 min", kind: "support" as const },
  { id: 4, who: "Bot WhatsApp", what: "a répondu à 12 conversations", when: "il y a 32 min", kind: "bot" as const },
  { id: 5, who: "Système", what: "Renouvellement automatique · 23 lignes", when: "il y a 1 h", kind: "iptv" as const },
  { id: 6, who: "Aïcha L.", what: "a démarré un essai gratuit", when: "il y a 2 h", kind: "trial" as const },
];
