-- ============================================================
-- 004: app_settings — admin-editable configuration
-- ============================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  label       TEXT,
  description TEXT,
  is_secret   BOOLEAN DEFAULT FALSE,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Anon μπορεί να διαβάσει (χρειάζεται για admin frontend με anon key)
CREATE POLICY "anon_read_settings"
  ON app_settings FOR SELECT TO anon USING (true);

-- Anon μπορεί να κάνει update (admin frontend χρησιμοποιεί anon key)
CREATE POLICY "anon_update_settings"
  ON app_settings FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Service role full access
CREATE POLICY "service_all_settings"
  ON app_settings FOR ALL TO service_role USING (true);

-- Default values
INSERT INTO app_settings (key, value, label, description, is_secret) VALUES
  ('hosthub_api_key',          '',                                'HostHub API Key',             'API Key για HostHub',                          TRUE),
  ('resend_api_key',           '',                                'Resend API Key',               'API Key για αποστολή email',                   TRUE),
  ('from_email',               'info@tower15suites.gr',           'From Email',                  'Email αποστολέα',                              FALSE),
  ('from_name',                'Tower 15 Suites',                 'From Name',                   'Όνομα αποστολέα',                              FALSE),
  ('contact_phone',            '+30 6949655349',                  'Τηλέφωνο Επικοινωνίας',       'Τηλέφωνο στα emails',                          FALSE),
  ('contact_email',            'info@tower15suites.gr',           'Email Επικοινωνίας',          'Email στα emails',                             FALSE),
  ('checkin_portal_url',       'https://checkin.tower15suites.gr','Check-In Portal URL',         'URL του portal',                               FALSE),
  ('checkin_time',             '15:00',                           'Ώρα Check-In',                'Ώρα διαθεσιμότητας δωματίων',                  FALSE),
  ('checkout_time',            '11:30',                           'Ώρα Check-Out',               'Ώρα αναχώρησης',                               FALSE),
  ('checkin_link_days_before', '2',                               'Ημέρες πριν για link',        'Πόσες μέρες πριν την άφιξη στέλνουμε link',   FALSE)
ON CONFLICT (key) DO NOTHING;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_app_settings_ts()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS app_settings_updated_at ON app_settings;
CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_app_settings_ts();
