-- ============================================================
-- 001: Initial Schema — Webrya Check-In Portal (Tower 15 Suites)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ROOMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS rooms (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_number     TEXT NOT NULL UNIQUE,
  floor           INTEGER NOT NULL,
  wifi_ssid       TEXT NOT NULL,
  wifi_password   TEXT NOT NULL DEFAULT 'TOWER15!!!',
  door_code       TEXT,
  keylocker_code  TEXT,
  hosthub_name    TEXT,          -- Πλήρες όνομα όπως εμφανίζεται στο Hosthub (πχ. "401 Standard Στούντιο")
  is_ready        BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RESERVATIONS TABLE
-- ⚠️ reservation_code ΔΕΝ είναι UNIQUE — multi-room bookings
--    (πχ. 4 δωμάτια από Booking.com) έχουν τον ίδιο κωδικό.
-- ============================================================
CREATE TABLE IF NOT EXISTS reservations (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hosthub_id              TEXT UNIQUE,
  reservation_code        TEXT NOT NULL,   -- ΟΧΙ UNIQUE: multi-room bookings έχουν ίδιο κωδικό
  room_id                 UUID REFERENCES rooms(id),
  guest_first_name        TEXT,
  guest_last_name         TEXT,
  guest_email             TEXT,
  guest_phone             TEXT,
  check_in_date           DATE NOT NULL,
  check_out_date          DATE NOT NULL,
  platform                TEXT,            -- airbnb, booking.com, vrbo, direct, hosthub...
  status                  TEXT DEFAULT 'pending',  -- pending | checked_in | checked_out
  checkin_link_sent       BOOLEAN DEFAULT FALSE,
  checkin_link_sent_at    TIMESTAMPTZ,
  codes_sent              BOOLEAN DEFAULT FALSE,
  codes_sent_at           TIMESTAMPTZ,
  notes                   TEXT,
  raw_data                JSONB,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GUEST CHECKINS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS guest_checkins (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id  UUID REFERENCES reservations(id),
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  phone           TEXT NOT NULL,
  email           TEXT NOT NULL,
  id_type         TEXT NOT NULL,  -- national_id | passport | afm
  id_number       TEXT NOT NULL,
  afm             TEXT,
  nationality     TEXT,
  photo_url       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rooms_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED: ROOMS DATA (Tower 15 Suites)
-- ============================================================
INSERT INTO rooms (room_number, floor, wifi_ssid, wifi_password, door_code, keylocker_code) VALUES
  ('01',  0, '0TOWER15', 'TOWER15!!!',
   E'Step 1: Press the Key Symbol (🗝️) at the bottom left.\nStep 2: Enter the code: 2021\nStep 3: Press the Key Symbol (🗝️) again to confirm.',
   '0219'),
  ('101', 1, '1TOWER15', 'TOWER15!!!',
   E'Step 1: Press the Key Symbol (🗝️) at the bottom left.\nStep 2: Enter the code: 2021\nStep 3: Press the Key Symbol (🗝️) again to confirm.',
   '2934'),
  ('102', 1, '1TOWER15', 'TOWER15!!!',
   E'Step 1: Press the Key Symbol (🗝️) at the bottom left.\nStep 2: Enter the code: 2021\nStep 3: Press the Key Symbol (🗝️) again to confirm.',
   '2945'),
  ('103', 1, '1TOWER15', 'TOWER15!!!',
   E'Step 1: Press the Key Symbol (🗝️) at the bottom left.\nStep 2: Enter the code: 2021\nStep 3: Press the Key Symbol (🗝️) again to confirm.',
   '2991'),
  ('201', 2, '2TOWER15', 'TOWER15!!!',
   E'Step 1: Press the Key Symbol (🗝️) at the bottom left.\nStep 2: Enter the code: 2021\nStep 3: Press the Key Symbol (🗝️) again to confirm.',
   '4918'),
  ('202', 2, '2TOWER15', 'TOWER15!!!',
   E'Step 1: Press the Key Symbol (🗝️) at the bottom left.\nStep 2: Enter the code: 2021\nStep 3: Press the Key Symbol (🗝️) again to confirm.',
   '2113'),
  ('203', 2, '2TOWER15', 'TOWER15!!!',
   E'Step 1: Press the Key Symbol (🗝️) at the bottom left.\nStep 2: Enter the code: 2021\nStep 3: Press the Key Symbol (🗝️) again to confirm.',
   '2530'),
  ('301', 3, '3TOWER15', 'TOWER15!!!',
   E'Step 1: Press the Key Symbol (🗝️) at the bottom left.\nStep 2: Enter the code: 2021\nStep 3: Press the Key Symbol (🗝️) again to confirm.',
   '2132'),
  ('302', 3, '3TOWER15', 'TOWER15!!!',
   E'Step 1: Press the Key Symbol (🗝️) at the bottom left.\nStep 2: Enter the code: 2021\nStep 3: Press the Key Symbol (🗝️) again to confirm.',
   '2119'),
  ('303', 3, '3TOWER15', 'TOWER15!!!',
   E'Step 1: Press the Key Symbol (🗝️) at the bottom left.\nStep 2: Enter the code: 2021\nStep 3: Press the Key Symbol (🗝️) again to confirm.',
   '2140'),
  ('401', 4, '4TOWER15', 'TOWER15!!!',
   E'Step 1: Press the Key Symbol (🗝️) at the bottom left.\nStep 2: Enter the code: 2021\nStep 3: Press the Key Symbol (🗝️) again to confirm.',
   '1823'),
  ('402', 4, '4TOWER15', 'TOWER15!!!',
   E'Step 1: Press the Key Symbol (🗝️) at the bottom left.\nStep 2: Enter the code: 2021\nStep 3: Press the Key Symbol (🗝️) again to confirm.',
   '1812'),
  ('403', 4, '4TOWER15', 'TOWER15!!!',
   E'Step 1: Press the Key Symbol (🗝️) at the bottom left.\nStep 2: Enter the code: 2021\nStep 3: Press the Key Symbol (🗝️) again to confirm.',
   '1875'),
  ('501', 5, '5TOWER15', 'TOWER15!!!',
   E'Step 1: Press the Key Symbol (🗝️) at the bottom left.\nStep 2: Enter the code: 2021\nStep 3: Press the Key Symbol (🗝️) again to confirm.',
   '2235'),
  ('502', 5, '5TOWER15', 'TOWER15!!!',
   E'Step 1: Press the Key Symbol (🗝️) at the bottom left.\nStep 2: Enter the code: 2021\nStep 3: Press the Key Symbol (🗝️) again to confirm.',
   '1232'),
  ('601', 6, '6TOWER15', 'TOWER15!!!',
   E'Step 1: Press the Key Symbol (🗝️) at the bottom left.\nStep 2: Enter the code: 2021\nStep 3: Press the Key Symbol (🗝️) again to confirm.',
   '2333'),
  ('701', 7, '7TOWER15', 'TOWER15!!!',
   E'Step 1: Press the Key Symbol (🗝️) at the bottom left.\nStep 2: Enter the code: 2021\nStep 3: Press the Key Symbol (🗝️) again to confirm.',
   '1365')
ON CONFLICT (room_number) DO NOTHING;
