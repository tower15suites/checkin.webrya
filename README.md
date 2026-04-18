# Webrya Check-In Portal — Tower 15 Suites

Online self check-in portal με admin dashboard, Hosthub sync, και αυτόματη αποστολή κωδικών μέσω email.

---

## ΤΕΧΝΟΛΟΓΙΕΣ

- **Frontend**: React + Vite + Tailwind CSS → Cloudflare Pages
- **Backend**: Supabase (PostgreSQL + Edge Functions Deno)
- **Email**: Resend API
- **Hosthub API**: `https://app.hosthub.com/api/2019-03-01`
- **PWA**: manifest.json για mobile install

---

## DEPLOY CHECKLIST (με τη σειρά)

### 1. Supabase SQL Editor — Migrations

Τρέξε τα migrations **με τη σειρά** στο Supabase SQL Editor:

```
001_initial_schema.sql   ← Tables + seed data
002_rls_policies.sql     ← Row Level Security
003_storage.sql          ← guest-photos bucket
004_app_settings.sql     ← Admin settings table
```

### 2. Supabase Storage

Το bucket `guest-photos` δημιουργείται αυτόματα από το migration 003. Επαλήθευσε ότι είναι **private** στο Supabase Dashboard → Storage.

### 3. GitHub

Push τον φάκελο `webrya-checkin-portal/` στο **root** του repo (όχι nested μέσα σε άλλο φάκελο).

### 4. Cloudflare Pages

- Connect GitHub repo
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: *(κενό)*
- **Environment variables**:
  ```
  VITE_SUPABASE_URL=https://fbknscgkjdsxnaugyzaq.supabase.co
  VITE_SUPABASE_ANON_KEY=<anon_key>
  ```

### 5. Supabase CLI — Deploy Edge Functions

```powershell
supabase login
supabase link --project-ref fbknscgkjdsxnaugyzaq
supabase functions deploy sync-hosthub
supabase functions deploy send-codes
supabase functions deploy send-checkin-link
supabase functions deploy send-checkout-reminder
supabase secrets set HOSTHUB_API_KEY=<value>
supabase secrets set RESEND_API_KEY=<value>
supabase secrets set SERVICE_ROLE_KEY=<value>
supabase secrets set CHECKIN_PORTAL_URL=https://checkin.tower15suites.gr
```

> ⚠️ **PowerShell**: Δώσε εντολές μία-μία (το `&&` δεν δουλεύει).  
> ⚠️ **Χωρίς `SUPABASE_` prefix** στα custom secrets — το Supabase το απαγορεύει.

### 6. Supabase SQL Editor — Cron Jobs

Πρώτα ενημέρωσε τα credentials στο migration:

```sql
-- Στο αρχείο 005_cron_jobs.sql, αντικατέστησε:
-- '__SUPABASE_URL__' → 'https://fbknscgkjdsxnaugyzaq.supabase.co'
-- '__SUPABASE_ANON_KEY__' → την anon key σου
```

Τότε τρέξε `005_cron_jobs.sql` στο Supabase SQL Editor.

Επαλήθευσε:
```sql
SELECT jobname, schedule FROM cron.job ORDER BY jobname;
```

---

## ADMIN LOGIN

- URL: `https://checkin.tower15suites.gr/admin`
- Username: `alexmanel`
- Password: `Devilakos1992!`

---

## CRON SCHEDULE

| Job | Ώρα (Athens) | Ώρα (UTC) | Περιγραφή |
|-----|-------------|-----------|-----------|
| sync-hosthub-auto | κάθε 30 λεπτά | */30 * * * * | Sync κρατήσεων από Hosthub |
| send-checkin-link-2days | 10:00 | 07:00 | Check-in link 2 μέρες πριν |
| send-checkin-codes-14h | 14:00 | 11:00 | Αποστολή κωδικών (μόνο online check-in) |
| send-checkout-reminder | 08:30 | 05:30 | Υπενθύμιση αναχώρησης |

---

## EMAIL FLOW

1. **D-2**: Guest λαμβάνει email με link για online check-in
2. **Ημέρα άφιξης, 14:00**: Guest λαμβάνει κωδικούς (door, keylocker, WiFi) — **ΜΟΝΟ αν έχει κάνει online check-in**
3. **Ημέρα αναχώρησης, 08:30**: Guest λαμβάνει υπενθύμιση checkout (έως 11:30)

Αν ο guest κάνει online check-in **την ημέρα της άφιξης**, οι κωδικοί στέλνονται **αμέσως** (δεν περιμένει το 14:00 cron).

---

## ΣΗΜΑΝΤΙΚΕΣ ΑΠΟΦΑΣΕΙΣ ΣΧΕΔΙΑΣΜΟΥ

- `reservation_code` **δεν είναι UNIQUE** — multi-room bookings (πχ. 4 δωμάτια από Booking.com) έχουν τον ίδιο κωδικό.
- Room matching με **longest-prefix-first** — αποφεύγει το "01" να ταιριάξει με "101", "201", "401".
- Hosthub API calls γίνονται **παράλληλα** (Promise.all) για να αποφύγουμε timeout.
- Κωδικοί **δεν εμφανίζονται** στη success page — μόνο μέσω email.
- Auto send codes **μόνο σε checked_in** status — αν ο πελάτης δεν έχει κάνει online check-in, ο admin στέλνει χειροκίνητα.

---

## PROJECT STRUCTURE

```
webrya-checkin-portal/
├── .env.local                    ← VITE_ variables για local dev (μη commit)
├── .gitignore
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js
├── public/
│   ├── _redirects               ← SPA routing για Cloudflare
│   ├── favicon.svg
│   ├── logo-tower15.jpg
│   └── manifest.json            ← PWA
├── src/
│   ├── App.jsx                  ← Router + ProtectedRoute
│   ├── main.jsx
│   ├── index.css                ← Tailwind + custom components
│   ├── lib/supabase.js
│   ├── hooks/useAdminAuth.jsx
│   └── pages/
│       ├── CheckInPortal.jsx    ← Guest self check-in (4 βήματα)
│       ├── AdminLogin.jsx
│       └── AdminDashboard.jsx   ← 5 tabs: Ημερολόγιο, Κρατήσεις, Δωμάτια, Check-ins, Ρυθμίσεις
└── supabase/
    ├── config.toml
    ├── functions/
    │   ├── sync-hosthub/        ← Sync από Hosthub API
    │   ├── send-codes/          ← Αποστολή κωδικών
    │   ├── send-checkin-link/   ← Αποστολή check-in link
    │   └── send-checkout-reminder/
    └── migrations/
        ├── 001_initial_schema.sql
        ├── 002_rls_policies.sql
        ├── 003_storage.sql
        ├── 004_app_settings.sql
        └── 005_cron_jobs.sql    ← Τρέξε ΤΕΛΕΥΤΑΙΟ
```

---

Designed & Developed by [Webrya](https://webrya.com)
