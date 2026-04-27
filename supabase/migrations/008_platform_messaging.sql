-- ============================================================
-- 008: Platform Messaging Fields + Cleanup Support
-- ============================================================

-- Νέα fields για tracking platform messages (send-checkin-link)
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS platform_message_sent      BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS platform_message_sent_at   TIMESTAMPTZ;

-- GDPR consent fields (έλειπαν από το 001 schema)
ALTER TABLE guest_checkins
  ADD COLUMN IF NOT EXISTS gdpr_consent    BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gdpr_consent_at TIMESTAMPTZ;

-- Index για γρήγορη εύρεση ολοκληρωμένων κρατήσεων (για cleanup tab)
CREATE INDEX IF NOT EXISTS idx_reservations_checkout ON reservations(check_out_date);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

-- Επαλήθευση:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'reservations' AND column_name LIKE 'platform%';
