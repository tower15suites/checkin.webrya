import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY     = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL         = 'info@tower15suites.gr'
const FROM_NAME          = 'Tower 15 Suites'
const CHECKIN_PORTAL_URL = Deno.env.get('CHECKIN_PORTAL_URL') || 'https://checkin.tower15suites.gr'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!
)

// ── Language detection ─────────────────────────────────────────────────────────
function detectLanguage(firstName: string, lastName: string): 'el' | 'en' {
  const name = `${firstName} ${lastName}`.toLowerCase()
  if (/[α-ωάέήίόύώϊϋΐΰ]/.test(name)) return 'el'
  const greekNames = new Set([
    'alexandros','alex','nikos','nikolaos','giorgos','georgios','george','dimitris','dimitrios',
    'kostas','konstantinos','yannis','ioannis','john','petros','stavros','apostolos','michalis',
    'michael','vasilis','vasileios','panagiotis','thanasis','athanasios','christos','spyros',
    'antonis','antonios','katerina','maria','elena','eleni','sofia','anna','ioanna','georgia',
    'angeliki','angelos','andreas','evangelia','evangelos','stavroula','despina','fotini',
    'theodoros','thanos','lefteris','manolis','stratos','giannis','tasos','manos','makis',
    'kosmas','pavlos','paul','stelios','kyriakos','panos','takis','vaggelis','vangelis',
    'zoe','zoi','filippos','marios','charalampos','haris','fotis','koulouris','papadopoulos',
    'papageorgiou','nikolaidis','georgiou','alexandrou','karamanlis','stefanidis','dimitriou',
    'konstantinidis','papadimitriou','kougioumtzi','michaloglou','stamos','karagianni',
    'papaioannou','vasileiou','christodoulou','oikonomou','petrou','andreou','theodorou','ioannou',
  ])
  return name.split(/\s+/).some(p => greekNames.has(p)) ? 'el' : 'en'
}

// ── ΚΡΙΣΙΜΟ: Atomic lock για αποφυγή race condition / duplicate sends ──────────
async function acquireSendLock(reservationId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('reservations')
    .update({ checkin_link_sent: true, checkin_link_sent_at: new Date().toISOString() })
    .eq('id', reservationId)
    .eq('checkin_link_sent', false)  // UPDATE μόνο αν είναι ακόμα false — atomic!
    .select('id')
    .single()
  return !error && !!data
}

// ── Email HTML ─────────────────────────────────────────────────────────────────
function emailWrapper(content: string, lang: 'el' | 'en'): string {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f0e0d;font-family:'Georgia',serif;color:#f5f0e8;">
<div style="max-width:580px;margin:0 auto;padding:24px;">

  <div style="text-align:center;padding:40px 0 30px;border-bottom:1px solid #3d3935;">
    <img src="https://checkin.webrya.com/logo-tower15suites.png" alt="Tower 15 Suites"
         width="80" height="80"
         style="display:block;margin:0 auto;border-radius:8px;background:#1a1816;" />
    <p style="color:#6b6460;font-size:12px;margin:12px 0 0;font-family:sans-serif;text-transform:uppercase;letter-spacing:0.12em;">Tower 15 Suites · Thessaloniki, Greece</p>
  </div>

  ${content}

  <div style="text-align:center;padding-top:28px;border-top:1px solid #2d2b29;margin-top:32px;">
    <p style="font-family:sans-serif;font-size:12px;color:#4a4744;margin:0 0 4px;">Tower 15 Suites · Ιωάννου Φαρμάκη 15, Θεσσαλονίκη 546 29</p>
    <p style="font-family:sans-serif;font-size:11px;color:#3d3a38;margin:4px 0;">
      <a href="tel:+306949655349" style="color:#6b5c4a;text-decoration:none;">+30 6949655349</a>
    </p>
    <p style="font-family:sans-serif;font-size:10px;color:#2e2c2a;margin:8px 0 0;">
      Designed &amp; Developed by <a href="https://webrya.com" style="color:#4a3f35;text-decoration:none;font-weight:bold;">Webrya</a>
    </p>
  </div>
</div>
</body>
</html>`
}

function buildEmailContent(
  lang: 'el' | 'en',
  name: string, ci: string, co: string,
  url: string, code: string, roomNote?: string
): string {
  const isEl = lang === 'el'
  return emailWrapper(`
  <div style="padding:32px 0 8px;">
    <p style="font-size:18px;color:#d4bc98;margin:0 0 6px;font-weight:300;">${isEl ? `Αγαπητέ/ή ${name},` : `Dear ${name},`}</p>
    <p style="font-size:14px;color:#8a7f78;line-height:1.9;margin:0;font-family:sans-serif;">
      ${isEl
        ? `Σας ευχαριστούμε που επιλέξατε το <strong style="color:#c09a68;">Tower 15 Suites</strong> για την επερχόμενη διαμονή σας!`
        : `Thank you for choosing <strong style="color:#c09a68;">Tower 15 Suites</strong> for your upcoming stay!`}
    </p>
  </div>

  <div style="display:flex;gap:12px;margin:20px 0;">
    <div style="flex:1;background:#1a1816;border:1px solid #3d3935;padding:16px;text-align:center;">
      <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">Check-in</div>
      <div style="font-family:sans-serif;font-size:13px;color:#f5f0e8;line-height:1.4;">${ci}</div>
      <div style="font-family:monospace;font-size:11px;color:#8B5E2A;margin-top:6px;">${isEl ? 'από 15:00' : 'from 15:00'}</div>
    </div>
    <div style="flex:1;background:#1a1816;border:1px solid #3d3935;padding:16px;text-align:center;">
      <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">Check-out</div>
      <div style="font-family:sans-serif;font-size:13px;color:#f5f0e8;line-height:1.4;">${co}</div>
      <div style="font-family:monospace;font-size:11px;color:#8B5E2A;margin-top:6px;">${isEl ? 'έως 11:00' : 'by 11:00'}</div>
    </div>
  </div>

  <div style="background:#1a1816;border:1px solid #2d2b29;padding:16px 20px;margin-bottom:20px;">
    <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">📍 ${isEl ? 'Διεύθυνση' : 'Address'}</div>
    <div style="font-family:sans-serif;font-size:13px;color:#d4bc98;">Ιωάννου Φαρμάκη 15, Θεσσαλονίκη 546 29</div>
  </div>

  ${roomNote ? `<div style="background:#1a1816;border:1px solid #c09a68;padding:12px 20px;margin-bottom:20px;"><div style="font-family:sans-serif;font-size:13px;color:#c09a68;">${roomNote}</div></div>` : ''}

  <div style="background:#1a1410;border:1px solid #3d2e1e;padding:20px 24px;margin-bottom:20px;">
    <div style="font-family:sans-serif;font-size:12px;color:#a07040;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;font-weight:bold;">🔑 Online Check-In</div>
    <p style="font-family:sans-serif;font-size:13px;color:#8a7f78;line-height:1.8;margin:0 0 16px;">
      ${isEl
        ? `Ολοκληρώστε το online check-in πριν την άφιξή σας. Θα λάβετε αυτόματα στις <strong style="color:#c09a68;">14:00</strong> της ημέρας άφιξής σας τους κωδικούς εισόδου (keylocker &amp; WiFi).`
        : `Complete your online check-in before you arrive. You will automatically receive your access codes (keylocker &amp; WiFi) at <strong style="color:#c09a68;">14:00</strong> on your arrival day.`}
    </p>
    <div style="font-family:sans-serif;font-size:13px;color:#8a7f78;line-height:2.0;margin-bottom:20px;">
      🪪 &nbsp;${isEl ? 'Αστυνομική ταυτότητα ή διαβατήριο' : 'National ID card or passport'}<br>
      ⏱️ &nbsp;${isEl ? 'Διαρκεί μόνο 2–3 λεπτά' : 'Only takes 2–3 minutes'}
    </div>
    <div style="text-align:center;padding:4px 0 8px;">
      <a href="${url}" style="display:inline-block;background:#8B5E2A;color:white;text-decoration:none;padding:15px 44px;font-family:sans-serif;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">
        ${isEl ? 'Έναρξη Online Check-In →' : 'Start Online Check-In →'}
      </a>
    </div>
  </div>

  <div style="background:#1a1816;border:1px solid #2d2b29;padding:12px 18px;margin-bottom:20px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span style="font-family:sans-serif;font-size:11px;color:#6b6460;text-transform:uppercase;letter-spacing:0.1em;">${isEl ? 'Αριθμός Κράτησης' : 'Reservation Number'}</span>
      <span style="font-family:monospace;font-size:15px;color:#c09a68;font-weight:bold;">${code}</span>
    </div>
  </div>

  <div style="padding:0 4px 8px;">
    <p style="font-family:sans-serif;font-size:12px;color:#6b6460;line-height:1.8;margin:0;">
      📞 <a href="tel:+306949655349" style="color:#c09a68;text-decoration:none;font-weight:bold;">+30 6949655349</a>
    </p>
  </div>`, lang)
}

// ── Platform plain-text (Hosthub inbox — χωρίς link, δεν κόβεται) ─────────────
function buildPlatformMessage(reservation: any, lang: 'el' | 'en'): string {
  const name   = reservation.guest_first_name || ''
  const locale = lang === 'el' ? 'el-GR' : 'en-GB'
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  const ci = new Date(reservation.check_in_date).toLocaleDateString(locale, opts)
  const co = new Date(reservation.check_out_date).toLocaleDateString(locale, opts)

  if (lang === 'el') return `Αγαπητέ/ή ${name},

Σας ευχαριστούμε για την κράτησή σας στο Tower 15 Suites!

━━━━━━━━━━━━━━━━━━
📅 CHECK-IN:  ${ci} από 15:00
📅 CHECK-OUT: ${co} έως 11:00
📍 Ιωάννου Φαρμάκη 15, Θεσσαλονίκη 546 29
━━━━━━━━━━━━━━━━━━

Σας έχουμε στείλει email με σύνδεσμο online check-in. Παρακαλούμε ελέγξτε τα εισερχόμενά σας (και τον φάκελο SPAM).

Μόλις ολοκληρώσετε το online check-in, θα λάβετε αυτόματα στις 14:00 της ημέρας άφιξής σας τους κωδικούς εισόδου (keylocker & WiFi).

❓ Εάν δεν επιθυμείτε να ολοκληρώσετε το online check-in, απαντήστε σε αυτό το μήνυμα με:
• Ονοματεπώνυμο
• Αριθμό ταυτότητας ή διαβατηρίου

📞 +30 6949655349
Tower 15 Suites`

  return `Dear ${name},

Thank you for choosing Tower 15 Suites!

━━━━━━━━━━━━━━━━━━
📅 CHECK-IN:  ${ci} from 15:00
📅 CHECK-OUT: ${co} by 11:00
📍 Ioannou Farmaki 15, Thessaloniki 546 29
━━━━━━━━━━━━━━━━━━

We have sent you an email with your online check-in link. Please check your inbox (and your SPAM folder).

Once you complete the online check-in, you will automatically receive your access codes (keylocker & WiFi) at 14:00 on your arrival day.

❓ If you prefer not to complete the online check-in, please reply to this message with:
• Full name
• ID card or passport number

📞 +30 6949655349
Tower 15 Suites`
}

// ── Send email via Resend ──────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `${FROM_NAME} <${FROM_EMAIL}>`, to: [to], subject, html }),
  })
  if (!res.ok) throw new Error(`Resend error: ${await res.text()}`)
  return res.json()
}

// ── Send platform message via Hosthub ─────────────────────────────────────────
// Hosthub API: POST /calendar-events/{id}/notes (μόνο αυτό υπάρχει στο swagger)
async function sendPlatformMessage(hosthubId: string, message: string): Promise<boolean> {
  const HOSTHUB_API_KEY = Deno.env.get('HOSTHUB_API_KEY')
  if (!HOSTHUB_API_KEY || !hosthubId) return false
  try {
    // Δοκιμάζουμε notes endpoint (μόνο αυτό υπάρχει στο HostHub API)
    const res = await fetch(`https://app.hosthub.com/api/2019-03-01/calendar-events/${hosthubId}/notes`, {
      method: 'POST',
      headers: { 'Authorization': HOSTHUB_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: message }),
    })
    if (res.ok) {
      console.log(`Platform note sent for hosthub_id=${hosthubId}`)
      return true
    }
    console.warn(`Platform note failed ${hosthubId}: ${res.status} ${await res.text()}`)
    return false
  } catch (e: any) {
    console.error(`sendPlatformMessage exception: ${e.message}`)
    return false
  }
}

// ── Core: process single reservation ──────────────────────────────────────────
async function processOne(reservation: any, force = false): Promise<{ email: boolean; platform: boolean }> {
  const result = { email: false, platform: false }

  if (!force) {
    // ATOMIC LOCK: prevents race condition / duplicate sends
    const locked = await acquireSendLock(reservation.id)
    if (!locked) {
      console.log(`Skipped ${reservation.id} — already sent or race condition`)
      return result
    }
  } else {
    // Force resend: reset flag first
    await supabase.from('reservations')
      .update({ checkin_link_sent: false })
      .eq('id', reservation.id)
    const locked = await acquireSendLock(reservation.id)
    if (!locked) return result
  }

  const lang     = detectLanguage(reservation.guest_first_name || '', reservation.guest_last_name || '')
  const name     = reservation.guest_first_name || (lang === 'el' ? 'Επισκέπτη' : 'Guest')
  const lastName = reservation.guest_last_name || ''
  const locale   = lang === 'el' ? 'el-GR' : 'en-GB'
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  const ci       = new Date(reservation.check_in_date).toLocaleDateString(locale, opts)
  const co       = new Date(reservation.check_out_date).toLocaleDateString(locale, opts)
  const code     = reservation.reservation_code
  const url      = `${CHECKIN_PORTAL_URL}?reservation=${encodeURIComponent(code)}&lastname=${encodeURIComponent(lastName)}`
  const subject  = lang === 'el'
    ? 'Επιβεβαίωση Κράτησης & Online Check-In — Tower 15 Suites'
    : 'Booking Confirmation & Online Check-In — Tower 15 Suites'

  // 1. Email
  if (reservation.guest_email) {
    const html = buildEmailContent(lang, name, ci, co, url, code)
    await sendEmail(reservation.guest_email, subject, html)
    result.email = true
  }

  // 2. Platform message
  if (reservation.hosthub_id) {
    const msg = buildPlatformMessage(reservation, lang)
    result.platform = await sendPlatformMessage(reservation.hosthub_id, msg)
  }

  // 3. Update platform flags (checkin_link_sent already set by acquireSendLock)
  await supabase.from('reservations').update({
    platform_message_sent:    result.platform,
    platform_message_sent_at: result.platform ? new Date().toISOString() : null,
  }).eq('id', reservation.id)

  return result
}

// ── Multi-room: 1 email με όλα τα δωμάτια ─────────────────────────────────────
async function processMultiRoom(reservations: any[], force = false): Promise<{ email: boolean; platform: boolean }> {
  const result = { email: false, platform: false }
  const first = reservations[0]

  if (!force) {
    // Lock πρώτο — αν αποτύχει, κάποιος άλλος έστειλε ήδη
    const locked = await acquireSendLock(first.id)
    if (!locked) return result
    // Mark υπόλοιπα
    await supabase.from('reservations')
      .update({ checkin_link_sent: true, checkin_link_sent_at: new Date().toISOString() })
      .in('id', reservations.slice(1).map((r: any) => r.id))
      .eq('checkin_link_sent', false)
  } else {
    await supabase.from('reservations')
      .update({ checkin_link_sent: false })
      .in('id', reservations.map((r: any) => r.id))
    const locked = await acquireSendLock(first.id)
    if (!locked) return result
    await supabase.from('reservations')
      .update({ checkin_link_sent: true, checkin_link_sent_at: new Date().toISOString() })
      .in('id', reservations.slice(1).map((r: any) => r.id))
  }

  const lang     = detectLanguage(first.guest_first_name || '', first.guest_last_name || '')
  const name     = first.guest_first_name || (lang === 'el' ? 'Επισκέπτη' : 'Guest')
  const lastName = first.guest_last_name || ''
  const locale   = lang === 'el' ? 'el-GR' : 'en-GB'
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  const ci       = new Date(first.check_in_date).toLocaleDateString(locale, opts)
  const co       = new Date(first.check_out_date).toLocaleDateString(locale, opts)
  const code     = first.reservation_code
  const url      = `${CHECKIN_PORTAL_URL}?reservation=${encodeURIComponent(code)}&lastname=${encodeURIComponent(lastName)}`
  const subject  = lang === 'el'
    ? 'Επιβεβαίωση Κράτησης & Online Check-In — Tower 15 Suites'
    : 'Booking Confirmation & Online Check-In — Tower 15 Suites'

  const roomNumbers = reservations.map((r: any) => r.rooms?.room_number).filter(Boolean).join(', ')
  const roomNote = roomNumbers ? (lang === 'el' ? `🏠 Δωμάτια: ${roomNumbers}` : `🏠 Rooms: ${roomNumbers}`) : undefined

  if (first.guest_email) {
    const html = buildEmailContent(lang, name, ci, co, url, code, roomNote)
    await sendEmail(first.guest_email, subject, html)
    result.email = true
  }

  if (first.hosthub_id) {
    const msg = buildPlatformMessage(first, lang)
    result.platform = await sendPlatformMessage(first.hosthub_id, msg)
  }

  const now = new Date().toISOString()
  await supabase.from('reservations')
    .update({ platform_message_sent: result.platform, platform_message_sent_at: result.platform ? now : null })
    .in('id', reservations.map((r: any) => r.id))

  return result
}

// ── Main handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const body  = await req.json().catch(() => ({}))
    const force = body.force === true
    const json  = (data: any) => new Response(JSON.stringify(data), { headers: { ...cors, 'Content-Type': 'application/json' } })

    // ── Multi-room (από sync-hosthub) ──────────────────────────────────────────
    if (body.reservationIds && Array.isArray(body.reservationIds) && body.reservationIds.length > 1) {
      const { data, error } = await supabase
        .from('reservations')
        .select('*, rooms(room_number)')
        .in('id', body.reservationIds)
      if (error || !data?.length) return json({ error: 'Not found' })
      const r = await processMultiRoom(data, force)
      return json({ message: `Multi-room | email:${r.email} | platform:${r.platform}`, ...r })
    }

    // ── Single reservation ──────────────────────────────────────────────────────
    if (body.reservationId) {
      const { data, error } = await supabase.from('reservations').select('*').eq('id', body.reservationId).single()
      if (error || !data) return json({ error: 'Not found' })
      const r = await processOne(data, force)
      return json({ message: `Single | email:${r.email} | platform:${r.platform}`, ...r })
    }

    // ── CRON D-2 fallback (μόνο για κρατήσεις χωρίς link ακόμα) ───────────────
    const target = new Date(); target.setDate(target.getDate() + 2)
    const targetStr = `${target.getFullYear()}-${String(target.getMonth()+1).padStart(2,'0')}-${String(target.getDate()).padStart(2,'0')}`
    const { data: pending } = await supabase
      .from('reservations')
      .select('*')
      .eq('check_in_date', targetStr)
      .eq('checkin_link_sent', false)
      .not('guest_email', 'is', null)

    let emails = 0, platforms = 0, errors = 0
    for (const res of (pending || [])) {
      try {
        const r = await processOne(res, false)
        if (r.email) emails++
        if (r.platform) platforms++
      } catch (e: any) { console.error(e.message); errors++ }
    }

    return json({ message: `CRON D-2 | emails:${emails} | platform:${platforms} | errors:${errors}` })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
