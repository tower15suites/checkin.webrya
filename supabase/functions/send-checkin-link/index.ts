import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY     = Deno.env.get('RESEND_API_KEY')!
const HOSTHUB_API_KEY    = Deno.env.get('HOSTHUB_API_KEY')!
const HOSTHUB_BASE       = 'https://app.hosthub.com/api/2019-03-01'
const FROM_EMAIL         = 'info@tower15suites.gr'
const FROM_NAME          = 'Tower 15 Suites'
const CHECKIN_PORTAL_URL = Deno.env.get('CHECKIN_PORTAL_URL') || 'https://checkin.tower15suites.gr'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!
)

// ── Language detection ────────────────────────────────────────────────────────
function detectLanguage(firstName: string, lastName: string): 'el' | 'en' {
  const name = `${firstName} ${lastName}`.toLowerCase()
  if (/[α-ωάέήίόύώϊϋΐΰ]/.test(name)) return 'el'
  const greekFirstNames = new Set([
    'alexandros','alex','nikos','nikolaos','giorgos','georgios','george','dimitris','dimitrios',
    'kostas','konstantinos','yannis','ioannis','john','petros','stavros','apostolos','apostolis',
    'michalis','michael','vasilis','vasileios','panagiotis','panagis','thanasis','athanasios',
    'christos','christ','spyros','spyridon','antonis','antonios','katerina','aikaterini','maria',
    'elena','eleni','sofia','sofi','anna','ioanna','georgia','angeliki','angelos','andreas',
    'evangelia','evangelos','stavroula','despina','fotini','theodoros','theodore','thanos',
    'lefteris','eleftherios','manolis','emmanouel','stratos','efstratios','giannis','tasos',
    'manos','makis','lakis','babis','kosmas','pavlos','paul','stelios','stylianos',
    'kyriakos','kyriaki','panos','takis','vaggelis','vangelis','zoe','zoi',
    'dimos','theofilos','arsenios','filippos','philip','marios','nektarios',
    'charalampos','haris','harris','fotis','fotios',
  ])
  const greekLastNames = new Set([
    'koulouris','papadopoulos','papageorgiou','nikolaidis','georgiou','alexandrou',
    'karamanlis','stefanidis','dimitriou','konstantinidis','papadimitriou','kougioumtzi',
    'michaloglou','stamos','karagianni','bervinova','papaioannou','vasileiou',
    'christodoulou','oikonomou','makris','antonopoulos','stavropoulos','tsakiris',
    'petrou','andreou','theodorou','ioannou',
  ])
  const parts = name.split(/\s+/)
  if (parts.some(p => greekFirstNames.has(p) || greekLastNames.has(p))) return 'el'
  return 'en'
}

// ── Platform message (plain text, χωρίς link — οι πλατφόρμες τα αφαιρούν) ───
function buildPlatformMessage(reservation: any, lang: 'el' | 'en'): string {
  const firstName = reservation.guest_first_name || ''
  const checkIn   = new Date(reservation.check_in_date)
  const checkOut  = new Date(reservation.check_out_date)
  const locale    = lang === 'el' ? 'el-GR' : 'en-GB'
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  const ciFmt     = checkIn.toLocaleDateString(locale, opts)
  const coFmt     = checkOut.toLocaleDateString(locale, opts)

  if (lang === 'el') {
    return `Αγαπητέ/ή ${firstName},

Σας ευχαριστούμε για την κράτησή σας στο Tower 15 Suites!

━━━━━━━━━━━━━━━━━━━━━━━
📅 CHECK-IN:   ${ciFmt} από 15:00
📅 CHECK-OUT:  ${coFmt} έως 11:00
📍 ΔΙΕΥΘΥΝΣΗ: Ιωάννου Φαρμάκη 15, Θεσσαλονίκη 546 29
━━━━━━━━━━━━━━━━━━━━━━━

📧 ONLINE CHECK-IN

Σας έχουμε στείλει email στη διεύθυνση που δηλώσατε κατά την κράτηση με τον σύνδεσμο online check-in. Παρακαλούμε ελέγξτε τα εισερχόμενά σας (και τον φάκελο SPAM).

Μόλις ολοκληρώσετε το online check-in, θα λάβετε αυτόματα στις 14:00 της ημέρας άφιξής σας τους κωδικούς εισόδου (keylocker & WiFi). Διαρκεί μόνο 2–3 λεπτά.

━━━━━━━━━━━━━━━━━━━━━━━

❓ Εάν δεν επιθυμείτε να ολοκληρώσετε το online check-in, απαντήστε σε αυτό το μήνυμα με τα στοιχεία σας (όνομα, επίθετο, αριθμό ταυτότητας ή διαβατηρίου) και θα σας εξυπηρετήσουμε άμεσα.

📞 +30 6949655349

Ανυπομονούμε να σας υποδεχτούμε!
Tower 15 Suites`
  } else {
    return `Dear ${firstName},

Thank you for choosing Tower 15 Suites!

━━━━━━━━━━━━━━━━━━━━━━━
📅 CHECK-IN:   ${ciFmt} from 15:00
📅 CHECK-OUT:  ${coFmt} by 11:00
📍 ADDRESS:    Ioannou Farmaki 15, Thessaloniki 546 29
━━━━━━━━━━━━━━━━━━━━━━━

📧 ONLINE CHECK-IN

We have sent you an email with your online check-in link. Please check your inbox (and your SPAM folder).

Once you complete the online check-in, you will automatically receive your access codes (keylocker & WiFi) at 14:00 on your arrival day. It only takes 2–3 minutes.

━━━━━━━━━━━━━━━━━━━━━━━

❓ If you prefer not to complete the online check-in, simply reply to this message with your details (full name, ID or passport number) and we will assist you personally.

📞 +30 6949655349

We look forward to welcoming you!
Tower 15 Suites`
  }
}

// ── Send via Hosthub Messages API (Booking.com + Airbnb) ─────────────────────
async function sendPlatformMessage(hosthubBookingId: string, message: string): Promise<boolean> {
  if (!HOSTHUB_API_KEY || !hosthubBookingId) return false
  try {
    const res = await fetch(`${HOSTHUB_BASE}/bookings/${hosthubBookingId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': HOSTHUB_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    })
    if (!res.ok) {
      console.error(`Hosthub msg error booking=${hosthubBookingId}: ${res.status} ${await res.text()}`)
      return false
    }
    return true
  } catch (e: any) {
    console.error(`sendPlatformMessage exception: ${e.message}`)
    return false
  }
}

// ── Email plain text fallback ─────────────────────────────────────────────────
function buildPlainText(reservation: any, checkinUrl: string, lang: 'el' | 'en', roomNote?: string): string {
  const firstName = reservation.guest_first_name || ''
  const locale = lang === 'el' ? 'el-GR' : 'en-GB'
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  const ciFmt = new Date(reservation.check_in_date).toLocaleDateString(locale, opts)
  const coFmt = new Date(reservation.check_out_date).toLocaleDateString(locale, opts)

  if (lang === 'el') {
    return `Αγαπητέ/ή ${firstName},\n\nΣας ευχαριστούμε που επιλέξατε το Tower 15 Suites!\n\n📅 Check-in: ${ciFmt} από 15:00\n📅 Check-out: ${coFmt} έως 11:00\n📍 Ιωάννου Φαρμάκη 15, Θεσσαλονίκη 546 29\n\n🔗 Σύνδεσμος Online Check-In:\n${checkinUrl}\n\nΑριθμός Κράτησης: ${reservation.reservation_code}\n\nΕπικοινωνία: +30 6949655349\n\nTower 15 Suites`
  } else {
    return `Dear ${firstName},\n\nThank you for choosing Tower 15 Suites!\n\n📅 Check-in: ${ciFmt} from 15:00\n📅 Check-out: ${coFmt} by 11:00\n📍 Ioannou Farmaki 15, Thessaloniki 546 29\n\n🔗 Online Check-In Link:\n${checkinUrl}\n\nReservation Number: ${reservation.reservation_code}\n\nContact: +30 6949655349\n\nTower 15 Suites`
  }
}

// ── HTML email wrapper ────────────────────────────────────────────────────────
function emailWrapper(content: string, langAttr = 'el'): string {
  return `<!DOCTYPE html><html lang="${langAttr}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f0e0d;font-family:'Georgia',serif;color:#f5f0e8;">
<div style="max-width:580px;margin:0 auto;padding:24px;">
  <div style="text-align:center;padding:40px 0 30px;border-bottom:1px solid #3d3935;">
    <img src="https://checkin.webrya.com/logo-tower15suites.png" alt="Tower 15 Suites" width="80" height="80" style="display:block;margin:0 auto;border-radius:8px;" />
    <h1 style="font-size:26px;font-weight:300;color:#f5f0e8;margin:14px 0 4px;letter-spacing:0.05em;">Tower 15 Suites</h1>
    <p style="color:#6b6460;font-size:12px;margin:0;font-family:sans-serif;text-transform:uppercase;letter-spacing:0.12em;">Thessaloniki, Greece</p>
  </div>
  ${content}
  <div style="text-align:center;padding-top:28px;border-top:1px solid #2d2b29;margin-top:32px;">
    <p style="font-family:sans-serif;font-size:12px;color:#4a4744;margin:0 0 4px;">Tower 15 Suites · Ιωάννου Φαρμάκη 15, Θεσσαλονίκη 546 29</p>
    <p style="font-family:sans-serif;font-size:11px;color:#3d3a38;margin:4px 0;"><a href="tel:+306949655349" style="color:#6b5c4a;text-decoration:none;">+30 6949655349</a></p>
    <p style="font-family:sans-serif;font-size:10px;color:#2e2c2a;margin:8px 0 0;">Designed &amp; Developed by <a href="https://webrya.com" style="color:#4a3f35;text-decoration:none;font-weight:bold;">Webrya</a></p>
  </div>
</div></body></html>`
}

function buildGreekEmail(name: string, ci: string, co: string, url: string, code: string, roomNote?: string): string {
  return emailWrapper(`
  <div style="padding:32px 0 8px;">
    <p style="font-size:18px;color:#d4bc98;margin:0 0 6px;font-weight:300;">Αγαπητέ/ή ${name},</p>
    <p style="font-size:14px;color:#8a7f78;line-height:1.9;margin:0;font-family:sans-serif;">Σας ευχαριστούμε που επιλέξατε το <strong style="color:#c09a68;">Tower 15 Suites</strong> για την επερχόμενη διαμονή σας!</p>
  </div>
  <div style="display:flex;gap:12px;margin:20px 0;">
    <div style="flex:1;background:#1a1816;border:1px solid #3d3935;padding:16px;text-align:center;">
      <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">Check-in</div>
      <div style="font-family:sans-serif;font-size:13px;color:#f5f0e8;line-height:1.4;">${ci}</div>
      <div style="font-family:monospace;font-size:11px;color:#8B5E2A;margin-top:6px;">από 15:00</div>
    </div>
    <div style="flex:1;background:#1a1816;border:1px solid #3d3935;padding:16px;text-align:center;">
      <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">Check-out</div>
      <div style="font-family:sans-serif;font-size:13px;color:#f5f0e8;line-height:1.4;">${co}</div>
      <div style="font-family:monospace;font-size:11px;color:#8B5E2A;margin-top:6px;">έως 11:00</div>
    </div>
  </div>
  <div style="background:#1a1816;border:1px solid #2d2b29;padding:16px 20px;margin-bottom:20px;">
    <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">📍 Διεύθυνση</div>
    <div style="font-family:sans-serif;font-size:13px;color:#d4bc98;">Ιωάννου Φαρμάκη 15, Θεσσαλονίκη 546 29</div>
  </div>
  ${roomNote ? `<div style="background:#1a1816;border:1px solid #2d2b29;padding:12px 20px;margin-bottom:20px;"><div style="font-family:sans-serif;font-size:13px;color:#c09a68;">${roomNote}</div></div>` : ''}
  <div style="background:#1a1410;border:1px solid #3d2e1e;padding:20px 24px;margin-bottom:20px;">
    <div style="font-family:sans-serif;font-size:12px;color:#a07040;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;font-weight:bold;">🔑 Online Check-In</div>
    <p style="font-family:sans-serif;font-size:13px;color:#8a7f78;line-height:1.8;margin:0 0 16px;">Ολοκληρώστε το online check-in πριν την άφιξή σας. Θα λάβετε αυτόματα στις <strong style="color:#c09a68;">14:00</strong> της ημέρας άφιξής σας τους κωδικούς εισόδου.</p>
    <div style="font-family:sans-serif;font-size:13px;color:#8a7f78;line-height:2.0;margin-bottom:20px;">🪪 &nbsp;Αστυνομική ταυτότητα ή διαβατήριο<br>⏱️ &nbsp;Διαρκεί μόνο 2–3 λεπτά</div>
    <div style="text-align:center;padding:4px 0 8px;">
      <a href="${url}" style="display:inline-block;background:#8B5E2A;color:white;text-decoration:none;padding:15px 44px;font-family:sans-serif;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Έναρξη Online Check-In →</a>
    </div>
  </div>
  <div style="background:#1a1816;border:1px solid #2d2b29;padding:12px 18px;margin-bottom:20px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span style="font-family:sans-serif;font-size:11px;color:#6b6460;text-transform:uppercase;letter-spacing:0.1em;">Αριθμός Κράτησης</span>
      <span style="font-family:monospace;font-size:15px;color:#c09a68;font-weight:bold;">${code}</span>
    </div>
  </div>
  <div style="padding:0 4px;margin-bottom:8px;">
    <p style="font-family:sans-serif;font-size:12px;color:#6b6460;line-height:1.8;margin:0;">Επικοινωνία: 📞 <a href="tel:+306949655349" style="color:#c09a68;text-decoration:none;font-weight:bold;">+30 6949655349</a></p>
  </div>`, 'el')
}

function buildEnglishEmail(name: string, ci: string, co: string, url: string, code: string, roomNote?: string): string {
  return emailWrapper(`
  <div style="padding:32px 0 8px;">
    <p style="font-size:18px;color:#d4bc98;margin:0 0 6px;font-weight:300;">Dear ${name},</p>
    <p style="font-size:14px;color:#8a7f78;line-height:1.9;margin:0;font-family:sans-serif;">Thank you for choosing <strong style="color:#c09a68;">Tower 15 Suites</strong> for your upcoming stay!</p>
  </div>
  <div style="display:flex;gap:12px;margin:20px 0;">
    <div style="flex:1;background:#1a1816;border:1px solid #3d3935;padding:16px;text-align:center;">
      <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">Check-in</div>
      <div style="font-family:sans-serif;font-size:13px;color:#f5f0e8;line-height:1.4;">${ci}</div>
      <div style="font-family:monospace;font-size:11px;color:#8B5E2A;margin-top:6px;">from 15:00</div>
    </div>
    <div style="flex:1;background:#1a1816;border:1px solid #3d3935;padding:16px;text-align:center;">
      <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">Check-out</div>
      <div style="font-family:sans-serif;font-size:13px;color:#f5f0e8;line-height:1.4;">${co}</div>
      <div style="font-family:monospace;font-size:11px;color:#8B5E2A;margin-top:6px;">by 11:00</div>
    </div>
  </div>
  <div style="background:#1a1816;border:1px solid #2d2b29;padding:16px 20px;margin-bottom:20px;">
    <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">📍 Address</div>
    <div style="font-family:sans-serif;font-size:13px;color:#d4bc98;">Ioannou Farmaki 15, Thessaloniki 546 29</div>
  </div>
  ${roomNote ? `<div style="background:#1a1816;border:1px solid #2d2b29;padding:12px 20px;margin-bottom:20px;"><div style="font-family:sans-serif;font-size:13px;color:#c09a68;">${roomNote}</div></div>` : ''}
  <div style="background:#1a1410;border:1px solid #3d2e1e;padding:20px 24px;margin-bottom:20px;">
    <div style="font-family:sans-serif;font-size:12px;color:#a07040;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;font-weight:bold;">🔑 Online Check-In</div>
    <p style="font-family:sans-serif;font-size:13px;color:#8a7f78;line-height:1.8;margin:0 0 16px;">Complete your online check-in before you arrive. You will automatically receive your access codes at <strong style="color:#c09a68;">14:00</strong> on your arrival day.</p>
    <div style="font-family:sans-serif;font-size:13px;color:#8a7f78;line-height:2.0;margin-bottom:20px;">🪪 &nbsp;National ID card or passport<br>⏱️ &nbsp;Only takes 2–3 minutes</div>
    <div style="text-align:center;padding:4px 0 8px;">
      <a href="${url}" style="display:inline-block;background:#8B5E2A;color:white;text-decoration:none;padding:15px 44px;font-family:sans-serif;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Start Online Check-In →</a>
    </div>
  </div>
  <div style="background:#1a1816;border:1px solid #2d2b29;padding:12px 18px;margin-bottom:20px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span style="font-family:sans-serif;font-size:11px;color:#6b6460;text-transform:uppercase;letter-spacing:0.1em;">Reservation Number</span>
      <span style="font-family:monospace;font-size:15px;color:#c09a68;font-weight:bold;">${code}</span>
    </div>
  </div>
  <div style="padding:0 4px;margin-bottom:8px;">
    <p style="font-family:sans-serif;font-size:12px;color:#6b6460;line-height:1.8;margin:0;">Contact: 📞 <a href="tel:+306949655349" style="color:#c09a68;text-decoration:none;font-weight:bold;">+30 6949655349</a></p>
  </div>`, 'en')
}

function buildEmail(reservation: any, checkinUrl: string): { subject: string; html: string; text: string } {
  const lang    = detectLanguage(reservation.guest_first_name || '', reservation.guest_last_name || '')
  const name    = reservation.guest_first_name || (lang === 'el' ? 'Επισκέπτη' : 'Guest')
  const locale  = lang === 'el' ? 'el-GR' : 'en-GB'
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  const ci      = new Date(reservation.check_in_date).toLocaleDateString(locale, opts)
  const co      = new Date(reservation.check_out_date).toLocaleDateString(locale, opts)
  const text    = buildPlainText(reservation, checkinUrl, lang)
  return lang === 'el'
    ? { subject: `Επιβεβαίωση Κράτησης & Online Check-In — Tower 15 Suites`, html: buildGreekEmail(name, ci, co, checkinUrl, reservation.reservation_code, undefined), text }
    : { subject: `Booking Confirmation & Online Check-In — Tower 15 Suites`, html: buildEnglishEmail(name, ci, co, checkinUrl, reservation.reservation_code, undefined), text }
}

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `${FROM_NAME} <${FROM_EMAIL}>`, to: [to], subject, html, text }),
  })
  if (!res.ok) throw new Error(`Resend error: ${await res.text()}`)
  return res.json()
}

async function processReservation(reservation: any): Promise<{ emailSent: boolean; platformSent: boolean }> {
  const result = { emailSent: false, platformSent: false }

  // ΚΛΕΙΔΙ ΑΣΦΑΛΕΙΑΣ: αν checkin_link_sent=true, σταματάμε εδώ — ΠΟΤΕ duplicate
  if (reservation.checkin_link_sent) return result

  const lang     = detectLanguage(reservation.guest_first_name || '', reservation.guest_last_name || '')
  const lastName = reservation.guest_last_name || ''

  // 1. Email με link — μόνο μέσω Resend
  if (reservation.guest_email) {
    const url = `${CHECKIN_PORTAL_URL}?reservation=${encodeURIComponent(reservation.reservation_code)}&lastname=${encodeURIComponent(lastName)}`
    const { subject, html, text } = buildEmail(reservation, url)
    await sendEmail(reservation.guest_email, subject, html, text)
    result.emailSent = true
  }

  // 2. Platform message (χωρίς link) — Booking.com ΚΑΙ Airbnb μέσω Hosthub
  const platformLower = (reservation.platform || '').toLowerCase()
  const supportsPlatformMsg = reservation.hosthub_id &&
    (platformLower.includes('booking') || platformLower.includes('airbnb'))

  if (supportsPlatformMsg) {
    const msg = buildPlatformMessage(reservation, lang)
    result.platformSent = await sendPlatformMessage(reservation.hosthub_id, msg)
  }

  // 3. Update DB — checkin_link_sent=true ΜΕΤΑ από επιτυχή αποστολή
  await supabase.from('reservations').update({
    checkin_link_sent:        true,
    checkin_link_sent_at:     new Date().toISOString(),
    platform_message_sent:    result.platformSent,
    platform_message_sent_at: result.platformSent ? new Date().toISOString() : null,
  }).eq('id', reservation.id)

  return result
}

// ── Multi-room email: 1 email με όλα τα δωμάτια ─────────────────────────────
async function processMultiRoomReservations(reservations: any[], force = false): Promise<{ platformSent: boolean }> {
  const result = { platformSent: false }
  const first = reservations[0]

  // Guard: αν το πρώτο δωμάτιο έχει ήδη σταλεί και δεν είναι force, skip
  if (!force && first.checkin_link_sent) return result

  const lang     = detectLanguage(first.guest_first_name || '', first.guest_last_name || '')
  const name     = first.guest_first_name || (lang === 'el' ? 'Επισκέπτη' : 'Guest')
  const lastName = first.guest_last_name || ''
  const email    = first.guest_email

  if (!email) return result

  const locale = lang === 'el' ? 'el-GR' : 'en-GB'
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  const ci = new Date(first.check_in_date).toLocaleDateString(locale, opts)
  const co = new Date(first.check_out_date).toLocaleDateString(locale, opts)

  // Κωδικός check-in — χρησιμοποιούμε τον κοινό reservation_code
  const code = first.reservation_code

  // Link — 1 link που αφορά όλη την κράτηση (χρησιμοποιεί reservation_code)
  const url = `${CHECKIN_PORTAL_URL}?reservation=${encodeURIComponent(code)}&lastname=${encodeURIComponent(lastName)}`

  // Δωμάτια για εμφάνιση στο email
  const roomList = reservations
    .map((r: any) => r.rooms?.room_number || '—')
    .filter(Boolean)
    .join(', ')

  // Build email με mention πολλαπλών δωματίων
  const subject = lang === 'el'
    ? `Επιβεβαίωση Κράτησης & Online Check-In — Tower 15 Suites`
    : `Booking Confirmation & Online Check-In — Tower 15 Suites`

  const roomNote = lang === 'el'
    ? `🏠 Δωμάτια: ${roomList}`
    : `🏠 Rooms: ${roomList}`

  const html = lang === 'el'
    ? buildGreekEmail(name, ci, co, url, code, roomNote)
    : buildEnglishEmail(name, ci, co, url, code, roomNote)
  const text = buildPlainText(first, url, lang, roomNote)

  await sendEmail(email, subject, html, text)

  // Platform message — μόνο 1 φορά (για το πρώτο δωμάτιο)
  const platformLower = (first.platform || '').toLowerCase()
  if (first.hosthub_id && (platformLower.includes('booking') || platformLower.includes('airbnb'))) {
    const msg = buildPlatformMessage(first, lang)
    result.platformSent = await sendPlatformMessage(first.hosthub_id, msg)
  }

  // Mark όλα τα δωμάτια ως sent
  const now = new Date().toISOString()
  await supabase.from('reservations')
    .update({
      checkin_link_sent:        true,
      checkin_link_sent_at:     now,
      platform_message_sent:    result.platformSent,
      platform_message_sent_at: result.platformSent ? now : null,
    })
    .in('id', reservations.map((r: any) => r.id))

  return result
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    let reservations: any[] = []

    if (body.reservationIds && Array.isArray(body.reservationIds) && body.reservationIds.length > 1) {
      // Multi-room: φόρτωσε όλες τις κρατήσεις και στείλε 1 email με όλα τα δωμάτια
      const { data, error } = await supabase
        .from('reservations')
        .select('*, rooms(room_number, floor)')
        .in('id', body.reservationIds)
      if (error || !data?.length) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      // Guard: αν ΌΛΑ έχουν ήδη link, skip
      if (data.every((r: any) => r.checkin_link_sent)) {
        return new Response(JSON.stringify({ message: 'All rooms already sent', skipped: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const result = await processMultiRoomReservations(data, body.force)
      return new Response(
        JSON.stringify({ message: `✓ Multi-room email sent | Rooms: ${data.length} | Platform: ${result.platformSent}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else if (body.reservationId) {
      // Single reservation — από sync-hosthub ή manual admin trigger
      const { data, error } = await supabase.from('reservations').select('*').eq('id', body.reservationId).single()
      if (error || !data) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      if (body.force) data.checkin_link_sent = false  // Admin force-resend
      reservations = [data]
    } else {
      // CRON D-2: Στέλνει μόνο σε κρατήσεις που δεν έχουν λάβει link ακόμα
      // Αυτό καλύπτει edge cases: κρατήσεις που μπήκαν χωρίς email και μόλις απέκτησαν
      const target = new Date(); target.setDate(target.getDate() + 2)
      const targetStr = target.toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('check_in_date', targetStr)
        .eq('checkin_link_sent', false)
        .not('guest_email', 'is', null)
      if (error) throw new Error(`Query error: ${JSON.stringify(error)}`)
      reservations = data || []
    }

    let emailsSent = 0, platformSent = 0, errors = 0
    for (const res of reservations) {
      try {
        const r = await processReservation(res)
        if (r.emailSent) emailsSent++
        if (r.platformSent) platformSent++
      } catch (e: any) { console.error(`Error ${res.id}:`, e.message); errors++ }
    }

    return new Response(
      JSON.stringify({ message: `✓ Emails: ${emailsSent} | Platform: ${platformSent} | Errors: ${errors}`, emailsSent, platformSent, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})