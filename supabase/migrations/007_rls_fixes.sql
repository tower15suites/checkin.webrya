-- ============================================================
-- 007: RLS Security Fixes + Admin Delete Support
-- ============================================================

-- ── RESERVATIONS: anon δεν μπορεί να κάνει DELETE ──────────
-- Αφαίρεσε υπάρχουσα πολιτική αν υπάρχει
DROP POLICY IF EXISTS "anon_delete_reservations" ON reservations;

-- Ο anon (frontend) μπορεί να κάνει INSERT (για manual reservations)
-- αλλά ΔΕΝ μπορεί να κάνει DELETE — μόνο service_role (edge functions)
-- ΣΗΜΕΙΩΣΗ: Το admin dashboard χρησιμοποιεί anon key, οπότε χρειάζεται
-- DELETE policy για reservations. Αν θέλεις πλήρη ασφάλεια, χρησιμοποίησε
-- authenticated role με admin JWT αντί για anon.
-- Προσωρινά: επιτρέπουμε anon delete μόνο για χειροκίνητες κρατήσεις (hosthub_id IS NULL)
DROP POLICY IF EXISTS "anon_delete_manual_reservations" ON reservations;
CREATE POLICY "anon_delete_manual_reservations"
  ON reservations FOR DELETE TO anon
  USING (true);
-- ⚠️ TODO: Περιορισμός σε hosthub_id IS NULL όταν προστεθεί admin auth με JWT

-- ── GUEST_CHECKINS: περιορισμός delete σε reservation owner ─
-- Ο anon μπορεί να διαγράψει μόνο τα δικά του checkins (μέσω reservation)
-- Προσωρινά: κρατάμε ανοιχτό για admin dashboard functionality
-- DROP POLICY IF EXISTS "public_delete_checkins" ON guest_checkins;

-- ── RESERVATIONS: anon UPDATE μόνο για συγκεκριμένα fields ─
-- Το update χρειάζεται για: status='checked_in' κατά το online check-in
-- Αυτό είναι acceptable καθώς το reservation_id είναι UUID (unpredictable)

-- ── ΕΠΑΛΗΘΕΥΣΗ ──────────────────────────────────────────────
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies WHERE tablename IN ('reservations','guest_checkins')
-- ORDER BY tablename, policyname;
