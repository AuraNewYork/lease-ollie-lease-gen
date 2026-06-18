
CREATE TABLE IF NOT EXISTS lease_signers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id uuid NOT NULL REFERENCES lease_documents(id) ON DELETE CASCADE,
  role text NOT NULL,
  signer_index integer NOT NULL DEFAULT 0,
  name text NOT NULL DEFAULT '',
  email text,
  token text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  signature_png text,
  signed_at timestamptz,
  declined_at timestamptz,
  decline_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lease_signers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_lease_signers" ON lease_signers FOR SELECT
  TO authenticated USING (
    lease_id IN (SELECT id FROM lease_documents WHERE created_by = auth.uid())
  );

CREATE POLICY "insert_lease_signers" ON lease_signers FOR INSERT
  TO authenticated WITH CHECK (
    lease_id IN (SELECT id FROM lease_documents WHERE created_by = auth.uid())
  );

CREATE POLICY "update_lease_signers" ON lease_signers FOR UPDATE
  TO authenticated USING (
    lease_id IN (SELECT id FROM lease_documents WHERE created_by = auth.uid())
  ) WITH CHECK (
    lease_id IN (SELECT id FROM lease_documents WHERE created_by = auth.uid())
  );

CREATE POLICY "delete_lease_signers" ON lease_signers FOR DELETE
  TO authenticated USING (
    lease_id IN (SELECT id FROM lease_documents WHERE created_by = auth.uid())
  );

-- Public token-based access for signers (no auth required)
CREATE POLICY "public_read_by_token" ON lease_signers FOR SELECT
  TO anon USING (token IS NOT NULL);

CREATE POLICY "public_update_by_token" ON lease_signers FOR UPDATE
  TO anon USING (token IS NOT NULL) WITH CHECK (token IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_lease_signers_lease_id ON lease_signers(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_signers_token ON lease_signers(token);
