-- ============================================================
-- 003: Storage Bucket & Policies
-- ============================================================

-- Create the guest-photos bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('guest-photos', 'guest-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Allow anon (guests) to upload photos
CREATE POLICY "anon_upload_guest_photos"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'guest-photos');

-- Allow anon to read photos (for check-in portal preview)
CREATE POLICY "anon_read_guest_photos"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'guest-photos');

-- Service role has full access
CREATE POLICY "service_role_all_photos"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'guest-photos');
