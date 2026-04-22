-- ============================================================
-- 005: Cron Jobs (pg_cron)
-- Τρέξε στο Supabase SQL Editor ΤΕΛΕΥΤΑΙΟ, αφού:
--   1. Κάνεις deploy τα Edge Functions
--   2. Αντικαταστήσεις SUPABASE_URL και SUPABASE_ANON_KEY παρακάτω
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- Βοηθητική function: ασφαλές unschedule
-- ============================================================
CREATE OR REPLACE FUNCTION safe_unschedule(jobname TEXT) RETURNS VOID AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE cron.job.jobname = safe_unschedule.jobname) THEN
    PERFORM cron.unschedule(safe_unschedule.jobname);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- App settings για cron
-- ⚠️ ΑΝΤΙΚΑΤΕΣΤΗΣΕ ΤΙΣ ΤΙΜΕΣ ΠΑΡΑΚΑΤΩ πριν τρέξεις!
-- ============================================================
CREATE TABLE IF NOT EXISTS app_cron_settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- ΣΗΜΑΝΤΙΚΟ: Αντικατάστησε https://xxxx.supabase.co και το anon key
INSERT INTO app_cron_settings (key, value) VALUES
  ('supabase_url',      'https://fbknscgkjdsxnaugyzaq.supabase.co'),
  ('supabase_anon_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZia25zY2dramRzeG5hdWd5emFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NzI0NDYsImV4cCI6MjA5MTM0ODQ0Nn0.J-tNm4ndoJcdxdava201YHMDHqGwAPYdepgLhQyXTuo')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================
-- 1. SYNC HOSTHUB — κάθε 30 λεπτά (αυτόματος sync)
-- ============================================================
SELECT safe_unschedule('sync-hosthub-auto');
SELECT cron.schedule(
  'sync-hosthub-auto',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url     := (SELECT value FROM app_cron_settings WHERE key = 'supabase_url') || '/functions/v1/sync-hosthub',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM app_cron_settings WHERE key = 'supabase_anon_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- 2. CHECK-IN LINK — 10:00 Athens (07:00 UTC)
--    Στέλνει link 2 μέρες πριν την άφιξη
-- ============================================================
SELECT safe_unschedule('send-checkin-link-2days');
SELECT cron.schedule(
  'send-checkin-link-2days',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url     := (SELECT value FROM app_cron_settings WHERE key = 'supabase_url') || '/functions/v1/send-checkin-link',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM app_cron_settings WHERE key = 'supabase_anon_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- 3. SEND CODES — 14:00 Athens (11:00 UTC)
--    Στέλνει κωδικούς ΜΟΝΟ σε guests με online check-in
-- ============================================================
SELECT safe_unschedule('send-checkin-codes-14h');
SELECT cron.schedule(
  'send-checkin-codes-14h',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url     := (SELECT value FROM app_cron_settings WHERE key = 'supabase_url') || '/functions/v1/send-codes',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM app_cron_settings WHERE key = 'supabase_anon_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ============================================================
-- 4. CHECKOUT REMINDER — 08:30 Athens (05:30 UTC)
-- ============================================================
SELECT safe_unschedule('send-checkout-reminder');
SELECT cron.schedule(
  'send-checkout-reminder',
  '30 5 * * *',
  $$
  SELECT net.http_post(
    url     := (SELECT value FROM app_cron_settings WHERE key = 'supabase_url') || '/functions/v1/send-checkout-reminder',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM app_cron_settings WHERE key = 'supabase_anon_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Επαλήθευση:
-- SELECT jobname, schedule FROM cron.job ORDER BY jobname;
