-- Storage RLS pour le bucket privé `binance-proofs`.
-- Le bucket ne doit être manipulé QUE via la clé service_role (côté serveur).
-- On refuse explicitement toute lecture / écriture / mutation aux rôles
-- anon et authenticated : seuls les server functions `submitBinanceProof`
-- (upload) et `getBinanceProofScreenshotUrl` (URL signée) — tous deux
-- utilisant supabaseAdmin — peuvent y accéder.

DROP POLICY IF EXISTS "binance-proofs: no client read" ON storage.objects;
DROP POLICY IF EXISTS "binance-proofs: no client write" ON storage.objects;

-- Verrouille lectures + écritures pour anon/authenticated sur ce bucket.
CREATE POLICY "binance-proofs: no client read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id <> 'binance-proofs');

CREATE POLICY "binance-proofs: no client write"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id <> 'binance-proofs');