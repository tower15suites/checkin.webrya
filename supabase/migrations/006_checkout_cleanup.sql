-- ============================================================
-- 006: Checkout Cleanup Fixes
-- Τρέξε στο Supabase SQL Editor
-- ============================================================

-- 1. Fix FK: προσθήκη ON DELETE CASCADE
--    Επιτρέπει τη διαγραφή reservation να σβήνει τα guest_checkins
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'guest_checkins_reservation_id_fkey'
    AND table_name = 'guest_checkins'
  ) THEN
    ALTER TABLE guest_checkins DROP CONSTRAINT guest_checkins_reservation_id_fkey;
  END IF;

  ALTER TABLE guest_checkins
    ADD CONSTRAINT guest_checkins_reservation_id_fkey
    FOREIGN KEY (reservation_id)
    REFERENCES reservations(id)
    ON DELETE CASCADE;
END $$;

-- 2. Αφαίρεσε archived_at column αν υπάρχει (δεν χρησιμοποιείται πλέον)
ALTER TABLE reservations DROP COLUMN IF EXISTS archived_at;

-- 3. Καθάρισε ΤΩΡΑ όλες τις κρατήσεις που έχουν ήδη κάνει checkout
--    (χθες και παλαιότερες)
DELETE FROM reservations
WHERE check_out_date < CURRENT_DATE
  AND hosthub_id IS NOT NULL;

-- Επαλήθευση
SELECT
  COUNT(*) as total,
  MIN(check_in_date) as earliest_checkin,
  MAX(check_out_date) as latest_checkout
FROM reservations;
