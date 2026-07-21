
-- 1) Knowledge Base
CREATE TABLE public.ai_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_knowledge_base TO authenticated;
GRANT ALL ON public.ai_knowledge_base TO service_role;
ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_kb admin read"  ON public.ai_knowledge_base FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ai_kb admin write" ON public.ai_knowledge_base FOR ALL    TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER ai_kb_updated_at BEFORE UPDATE ON public.ai_knowledge_base FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX ai_kb_section_idx ON public.ai_knowledge_base(section);

-- 2) Actions log
CREATE TABLE public.ai_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  kind text NOT NULL,
  input jsonb,
  output jsonb,
  tokens_in int,
  tokens_out int,
  model text,
  status text NOT NULL DEFAULT 'ok',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ai_actions_log TO authenticated;
GRANT ALL ON public.ai_actions_log TO service_role;
ALTER TABLE public.ai_actions_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_log admin read"   ON public.ai_actions_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ai_log admin insert" ON public.ai_actions_log FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX ai_log_created_idx ON public.ai_actions_log(created_at DESC);
CREATE INDEX ai_log_kind_idx    ON public.ai_actions_log(kind);

-- 3) SEO suggestions
CREATE TABLE public.ai_seo_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_kind text NOT NULL,
  target_id text,
  keyword text,
  intent text,
  difficulty text,
  action text,
  score int,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_seo_suggestions TO authenticated;
GRANT ALL ON public.ai_seo_suggestions TO service_role;
ALTER TABLE public.ai_seo_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_seo admin read"  ON public.ai_seo_suggestions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ai_seo admin write" ON public.ai_seo_suggestions FOR ALL    TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER ai_seo_updated_at BEFORE UPDATE ON public.ai_seo_suggestions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX ai_seo_status_idx ON public.ai_seo_suggestions(status);
CREATE INDEX ai_seo_target_idx ON public.ai_seo_suggestions(target_kind, target_id);

-- 4) Seed KB
INSERT INTO public.ai_knowledge_base (section, title, content) VALUES
('brand', 'Identité Nexora',
'Nexora IPTV est un service premium de streaming IPTV francophone. Positionnement : fiabilité serveur, catalogue mondial (films, séries, sports, chaînes live 4K), support humain 24/7, compatibilité multi-device. Domaine : nexora-iptv.com. Ton : premium, rassurant, technique clair.'),
('products', 'Offres IPTV',
'Formules Nexora : abonnements 1, 3, 6, 12 mois. Options : mono-connexion, multi-connexion, connexions supplémentaires. Essai gratuit 24h. Livraison automatique après paiement (email + WhatsApp + Telegram). Compatibilité : Smart TV, Fire TV, Android TV, iOS, Android, box MAG, Enigma2, ordinateurs.'),
('pricing', 'Tarifs et paiement',
'Paiements : Mobile Money (Orange, MTN, Moov, Airtel), CamerPay, SebPay, Binance Pay QR, Stripe (CB), PayPal. Devises XAF/EUR/USD. Politique remboursement : essai gratuit 24h pour évaluer. Renouvellements avec rappels automatiques.'),
('tone', 'Ton & style de rédaction',
'Français clair, direct, orienté bénéfice client. Éviter le jargon technique inutile. Toujours mettre en avant : stabilité, qualité 4K, support 24/7, sécurité, prix compétitif. CTA clairs vers /produits, /essai-gratuit, /espace-client. Ne pas promettre du contenu illégal ; parler de "streaming premium" et "chaînes internationales".'),
('faq', 'FAQ récurrentes',
'- Compatible avec quels appareils ? Tous : Smart TV, Fire TV, Android/iOS, MAG, Enigma2.
- Combien de connexions simultanées ? Selon la formule choisie.
- Essai gratuit ? Oui, 24h.
- Support ? WhatsApp, Telegram, email, live chat.
- Paiement mobile money accepté ? Oui : Orange, MTN, Moov, Airtel.'),
('guides', 'Guides installation',
'Guides disponibles : installation Fire TV Stick, Smart TV Samsung/LG, Android TV Box, iOS (application dédiée), MAG box, Enigma2, VLC/PC. Chaque guide décrit : téléchargement app, saisie identifiants Xtream Codes (host/user/pass) ou M3U, activation.');
