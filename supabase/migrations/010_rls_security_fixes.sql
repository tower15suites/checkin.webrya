-- ============================================================
-- 010: RLS Security Fixes
-- Αφαιρεί επικίνδυνα anon policies και τα αντικαθιστά με
-- ελάχιστα απαραίτητα permissions για τον guest portal.
-- ============================================================

-- ── ROOMS: Αφαίρεση anon UPDATE (κανείς δεν πρέπει να αλλάζει κωδικούς δωματίων) ──
DROP POLICY IF EXISTS "anon_update_rooms" ON rooms;
-- Η ανάγνωση δωματίων παραμένει OK (χρησιμοποιείται σε JOIN με reservations)

-- ── RESERVATIONS: Αντικατάσταση open UPDATE με περιορισμένο ──────────────────
DROP POLICY IF EXISTS "anon_update_reservations" ON reservations;

-- Ο guest portal χρειάζεται ΜΟΝΟ να θέσει status='checked_in' κατά το submit.
-- ΔΕΝ επιτρέπεται αλλαγή sent flags, emails, κωδικών κλπ.
CREATE POLICY "anon_checkin_only"
  ON reservations FOR UPDATE TO anon
  USING (status = 'pending')
  WITH CHECK (status = 'checked_in');

-- ── GUEST CHECKINS: Αφαίρεση anon DELETE (GDPR + data integrity) ─────────────
DROP POLICY IF EXISTS "public_delete_checkins" ON guest_checkins;
-- Οι διαγραφές γίνονται ΜΟΝΟ μέσω edge functions (service_role).

-- Επαλήθευση:
-- SELECT policyname, cmd, roles FROM pg_policies WHERE tablename IN ('rooms','reservations','guest_checkins') ORDER BY tablename, cmd;
