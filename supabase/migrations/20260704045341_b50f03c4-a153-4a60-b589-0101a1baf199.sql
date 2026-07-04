DROP POLICY IF EXISTS "binance-proofs: no client read" ON storage.objects;
DROP POLICY IF EXISTS "binance-proofs: no client write" ON storage.objects;
CREATE POLICY "binance-proofs: deny all client access"
  ON storage.objects
  AS RESTRICTIVE
  FOR ALL
  TO public
  USING (bucket_id <> 'binance-proofs')
  WITH CHECK (bucket_id <> 'binance-proofs');