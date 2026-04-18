-- ============================================================
-- 002: Row Level Security Policies
-- ============================================================

-- ── ROOMS ──────────────────────────────────────────────────
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_rooms"
  ON rooms FOR SELECT TO anon USING (true);

CREATE POLICY "anon_update_rooms"
  ON rooms FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "service_all_rooms"
  ON rooms FOR ALL TO service_role USING (true);

-- ── RESERVATIONS ────────────────────────────────────────────
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_reservations"
  ON reservations FOR SELECT TO anon USING (true);

CREATE POLICY "anon_update_reservations"
  ON reservations FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "service_all_reservations"
  ON reservations FOR ALL TO service_role USING (true);

-- ── GUEST CHECKINS ──────────────────────────────────────────
ALTER TABLE guest_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_checkins"
  ON guest_checkins FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "public_read_checkins"
  ON guest_checkins FOR SELECT TO anon USING (true);

CREATE POLICY "public_delete_checkins"
  ON guest_checkins FOR DELETE TO anon USING (true);

CREATE POLICY "service_all_checkins"
  ON guest_checkins FOR ALL TO service_role USING (true);
