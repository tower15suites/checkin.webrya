-- ============================================================
-- 009: Checkout Reminder Tracking
-- Αποτρέπει διπλή αποστολή checkout reminder
-- ============================================================

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS checkout_reminder_sent    BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS checkout_reminder_sent_at TIMESTAMPTZ;

-- Index για γρήγορο lookup στο cron
CREATE INDEX IF NOT EXISTS idx_reservations_checkout_reminder
  ON reservations(check_out_date, checkout_reminder_sent);

-- Επαλήθευση:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'reservations' AND column_name LIKE 'checkout_reminder%';
