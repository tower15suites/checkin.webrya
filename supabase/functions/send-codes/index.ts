import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY')!
const HOSTHUB_API_KEY = Deno.env.get('HOSTHUB_API_KEY')!
const HOSTHUB_BASE    = 'https://app.hosthub.com/api/2019-03-01'
const FROM_EMAIL      = 'info@tower15suites.gr'
const FROM_NAME       = 'Tower 15 Suites'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!
)

// ── Language detection ────────────────────────────────────────────────────────
function detectLanguage(firstName: string, lastName: string): 'el' | 'en' {
  const name = `${firstName} ${lastName}`.toLowerCase()
  if (/[α-ωάέήίόύώϊϋΐΰ]/.test(name)) return 'el'
  const greekNames = new Set([
    'alexandros','alex','nikos','nikolaos','giorgos','georgios','george','dimitris','dimitrios',
    'kostas','konstantinos','yannis','ioannis','john','petros','stavros','apostolos','michalis',
    'michael','vasilis','vasileios','panagiotis','thanasis','athanasios','christos','spyros',
    'antonis','antonios','katerina','aikaterini','maria','elena','eleni','sofia','anna','ioanna',
    'georgia','angeliki','angelos','andreas','evangelia','evangelos','lefteris','manolis',
    'giannis','tasos','manos','makis','pavlos','paul','stelios','kyriakos','panos','vaggelis',
    'zoe','zoi','marios','charalampos','haris','fotis','koulouris','papadopoulos','papageorgiou',
    'nikolaidis','georgiou','alexandrou','karamanlis','stefanidis','dimitriou','karagianni',
    'bervinova','papaioannou','vasileiou','christodoulou','oikonomou','makris','antonopoulos',
    'stavropoulos','petrou','andreou','theodorou','ioannou',
  ])
  const parts = name.split(/\s+/)
  return parts.some(p => greekNames.has(p)) ? 'el' : 'en'
}

// ── HTML email για κωδικούς (bilingual) ──────────────────────────────────────
function buildEmailHtml(guest: any, room: any, reservation: any, lang: 'el' | 'en'): string {
  const locale   = lang === 'el' ? 'el-GR' : 'en-GB'
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  const ciFmt    = new Date(reservation.check_in_date).toLocaleDateString(locale, opts)
  const coFmt    = new Date(reservation.check_out_date).toLocaleDateString(locale, opts)
  const doorHtml = (room.door_code || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')
  const isGreek  = lang === 'el'

  const L = isGreek ? {
    greeting:      `Αγαπητέ/ή ${guest.first_name} ${guest.last_name},`,
    welcome:       `Σας καλωσορίζουμε στο Tower 15 Suites! Παρακάτω θα βρείτε όλα τα στοιχεία πρόσβασης για τη διαμονή σας.`,
    room:          'Δωμάτιο',
    floor:         `Όροφος ${room.floor}`,
    resNum:        'Αριθμός Κράτησης',
    doorLabel:     '🔒 Κωδικός Εισόδου — Εξώπορτα Κτιρίου',
    keylockerLabel:'🗝️ Κωδικός Keylocker',
    wifiLabel:     '📶 WiFi',
    network:       'Δίκτυο',
    pass:          'Κωδικός',
    ciLabel:       'Check-in',
    coLabel:       'Check-out',
    ciTime:        'από 15:00',
    coTime:        'έως 11:00',
    help:          'Χρειάζεστε βοήθεια;',
    accessCodes:   'Κωδικοί Πρόσβασης',
  } : {
    greeting:      `Dear ${guest.first_name} ${guest.last_name},`,
    welcome:       `Welcome to Tower 15 Suites! Below you will find all the access details for your stay.`,
    room:          'Room',
    floor:         `Floor ${room.floor}`,
    resNum:        'Reservation Number',
    doorLabel:     '🔒 Building Entry Code',
    keylockerLabel:'🗝️ Keylocker Code',
    wifiLabel:     '📶 WiFi',
    network:       'Network',
    pass:          'Password',
    ciLabel:       'Check-in',
    coLabel:       'Check-out',
    ciTime:        'from 15:00',
    coTime:        'by 11:00',
    help:          'Need help?',
    accessCodes:   'Access Codes',
  }

  return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f0e0d;font-family:'Georgia',serif;color:#f5f0e8;">
<div style="max-width:560px;margin:0 auto;padding:20px;">
  <div style="text-align:center;padding:40px 0 30px;border-bottom:1px solid #3d3935;">
    <img src="https://checkin.webrya.com/logo-tower15suites.png" alt="Tower 15 Suites" width="80" height="80" style="display:block;margin:0 auto;border-radius:8px;" />
    <h1 style="font-size:28px;font-weight:300;color:#f5f0e8;margin:16px 0 4px;">Tower 15 Suites</h1>
    <p style="color:#6b6460;font-size:13px;margin:0;font-family:sans-serif;text-transform:uppercase;letter-spacing:0.1em;">${L.accessCodes}</p>
  </div>
  <div style="padding:32px 0 20px;">
    <p style="font-size:17px;color:#d4bc98;margin:0 0 12px;font-weight:300;">${L.greeting}</p>
    <p style="font-size:14px;color:#8a7f78;line-height:1.8;margin:0;font-family:sans-serif;">${L.welcome}</p>
  </div>
  <div style="background:#1a1816;border:1px solid #3d3935;padding:28px;margin:8px 0 24px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #2d2b29;">
      <div>
        <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px;">${L.room}</div>
        <div style="font-family:monospace;font-size:38px;color:#f5f0e8;font-weight:bold;line-height:1;">${room.room_number}</div>
        <div style="font-family:sans-serif;font-size:11px;color:#8a7f78;margin-top:4px;">${L.floor}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px;">${L.resNum}</div>
        <div style="font-family:monospace;font-size:14px;color:#c09a68;">${reservation.reservation_code}</div>
      </div>
    </div>
    <div style="margin-bottom:16px;padding:16px;background:#0f0e0d;border-left:3px solid #8B5E2A;">
      <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:10px;">${L.doorLabel}</div>
      <div style="font-family:sans-serif;font-size:14px;color:#d4bc98;line-height:2.0;">${doorHtml}</div>
    </div>
    <div style="margin-bottom:16px;padding:16px;background:#0f0e0d;border-left:3px solid #8B5E2A;">
      <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">${L.keylockerLabel}</div>
      <div style="font-family:monospace;font-size:34px;color:#f5f0e8;font-weight:bold;letter-spacing:0.25em;">${room.keylocker_code}</div>
    </div>
    <div style="padding:16px;background:#0f0e0d;border-left:3px solid #3d3935;">
      <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:10px;">${L.wifiLabel}</div>
      <div><span style="font-family:sans-serif;font-size:11px;color:#6b6460;">${L.network}: </span><span style="font-family:monospace;font-size:15px;color:#c09a68;font-weight:bold;">${room.wifi_ssid}</span></div>
      <div><span style="font-family:sans-serif;font-size:11px;color:#6b6460;">${L.pass}: </span><span style="font-family:monospace;font-size:15px;color:#c09a68;font-weight:bold;">${room.wifi_password}</span></div>
    </div>
  </div>
  <div style="display:flex;gap:12px;margin-bottom:24px;">
    <div style="flex:1;background:#1a1816;border:1px solid #2d2b29;padding:16px;text-align:center;">
      <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;margin-bottom:6px;">${L.ciLabel}</div>
      <div style="font-family:sans-serif;font-size:13px;color:#f5f0e8;">${ciFmt}</div>
      <div style="font-family:monospace;font-size:11px;color:#8B5E2A;margin-top:4px;">${L.ciTime}</div>
    </div>
    <div style="flex:1;background:#1a1816;border:1px solid #2d2b29;padding:16px;text-align:center;">
      <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;margin-bottom:6px;">${L.coLabel}</div>
      <div style="font-family:sans-serif;font-size:13px;color:#f5f0e8;">${coFmt}</div>
      <div style="font-family:monospace;font-size:11px;color:#8B5E2A;margin-top:4px;">${L.coTime}</div>
    </div>
  </div>
  <div style="background:#1a1816;border:1px solid #2d2b29;padding:16px;margin-bottom:28px;text-align:center;">
    <p style="font-family:sans-serif;font-size:12px;color:#6b6460;margin:0 0 8px;">${L.help}</p>
    <a href="tel:+306949655349" style="font-family:monospace;font-size:16px;color:#c09a68;text-decoration:none;font-weight:bold;">+30 6949655349</a>
  </div>
  <div style="text-align:center;padding-top:24px;border-top:1px solid #2d2b29;">
    <p style="font-family:sans-serif;font-size:12px;color:#4a4744;margin:0 0 4px;">Tower 15 Suites — Ιωάννου Φαρμάκη 15, Θεσσαλονίκη 546 29</p>
    <p style="font-family:sans-serif;font-size:10px;color:#2e2c2a;margin:0;">Designed &amp; Developed by <a href="https://webrya.com" style="color:#4a3f35;text-decoration:none;font-weight:bold;">Webrya</a></p>
  </div>
</div></body></html>`
}

// ── Plain text για κωδικούς (bilingual) ──────────────────────────────────────
function buildPlainTextCodes(guest: any, room: any, reservation: any, lang: 'el' | 'en'): string {
  if (lang === 'el') {
    return `Αγαπητέ/ή ${guest.first_name} ${guest.last_name},

Σας καλωσορίζουμε στο Tower 15 Suites!

🏠 ΔΩΜΑΤΙΟ: ${room.room_number} (Όροφος ${room.floor})
📋 Αριθμός Κράτησης: ${reservation.reservation_code}

━━━━━━━━━━━━━━━━━━━━━━━
🔒 ΚΩΔΙΚΟΣ ΕΙΣΟΔΟΥ (Εξώπορτα):
${room.door_code || '-'}

🗝️ ΚΩΔΙΚΟΣ KEYLOCKER: ${room.keylocker_code}

📶 WiFi
Δίκτυο: ${room.wifi_ssid}
Κωδικός: ${room.wifi_password}
━━━━━━━━━━━━━━━━━━━━━━━

📞 Βοήθεια: +30 6949655349

Καλή διαμονή!
Tower 15 Suites`
  } else {
    return `Dear ${guest.first_name} ${guest.last_name},

Welcome to Tower 15 Suites!

🏠 ROOM: ${room.room_number} (Floor ${room.floor})
📋 Reservation Number: ${reservation.reservation_code}

━━━━━━━━━━━━━━━━━━━━━━━
🔒 BUILDING ENTRY CODE:
${room.door_code || '-'}

🗝️ KEYLOCKER CODE: ${room.keylocker_code}

📶 WiFi
Network: ${room.wifi_ssid}
Password: ${room.wifi_password}
━━━━━━━━━━━━━━━━━━━━━━━

📞 Help: +30 6949655349

Enjoy your stay!
Tower 15 Suites`
  }
}

// ── Platform message αφού σταλούν οι κωδικοί (bilingual) ─────────────────────
// ΣΗΜΑΝΤΙΚΟ: Δεν στέλνουμε τους κωδικούς στην πλατφόρμα — μόνο επιβεβαίωση.
// Οι κωδικοί είναι ευαίσθητα δεδομένα και στέλνονται ΜΟΝΟ στο email.
function buildCodesConfirmMessage(room: any, lang: 'el' | 'en'): string {
  if (lang === 'el') {
    return `✅ Κωδικοί Πρόσβασης Απεστάλησαν

Αγαπητέ/ή επισκέπτη,

Οι κωδικοί πρόσβασης για τη διαμονή σας στο Tower 15 Suites έχουν αποσταλεί στο email σας.

🏠 Δωμάτιο: ${room.room_number}
📧 Ελέγξτε τα εισερχόμενά σας για τους κωδικούς keylocker, εισόδου και WiFi.

Για οποιαδήποτε βοήθεια:
📞 +30 6949655349

Καλή διαμονή!
Tower 15 Suites`
  } else {
    return `✅ Access Codes Sent

Dear guest,

Your access codes for Tower 15 Suites have been sent to your email address.

🏠 Room: ${room.room_number}
📧 Please check your inbox for your keylocker, entry and WiFi codes.

For any assistance:
📞 +30 6949655349

Enjoy your stay!
Tower 15 Suites`
  }
}

// ── Send platform message via Hosthub API ─────────────────────────────────────
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

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `${FROM_NAME} <${FROM_EMAIL}>`, to: [to], subject, html, text }),
  })
  if (!res.ok) throw new Error(`Resend error: ${await res.text()}`)
  return res.json()
}

function isAfter1400Athens(): boolean {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Athens' }))
  return now.getHours() >= 14
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const forceResend = body.force === true
    let reservationIds: string[] = []

    if (body.reservationId) {
      // Manual trigger: επιτρέπεται μόνο μετά τις 14:00 ή με force=true
      if (forceResend || isAfter1400Athens()) {
        reservationIds = [body.reservationId]
      } else {
        return new Response(
          JSON.stringify({ message: 'Deferred — check-in before 14:00 Athens', deferred: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // CRON 14:00: σήμερα, checked_in, codes_sent=false
      // ΔΕΝ στέλνει αν codes_sent=true — αυτό προστατεύει από duplicates ακόμα κι αν τρέξει ξανά
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('reservations')
        .select('id')
        .eq('check_in_date', today)
        .eq('codes_sent', false)
        .eq('status', 'checked_in')
      if (error) throw new Error(`Query error: ${JSON.stringify(error)}`)
      reservationIds = (data || []).map((r: any) => r.id)
    }

    let sent = 0, errors = 0, skipped = 0
    const results: any[] = []

    for (const resId of reservationIds) {
      try {
        const { data: reservation, error: fetchErr } = await supabase
          .from('reservations')
          .select('*, rooms(*), guest_checkins(*)')
          .eq('id', resId)
          .single()

        if (fetchErr || !reservation) { skipped++; continue }

        // ΚΛΕΙΔΙ ΑΣΦΑΛΕΙΑΣ: αν codes_sent=true και δεν είναι force, παρακάμπτουμε
        // Αυτό εξασφαλίζει ότι ακόμα κι αν ο admin έστειλε χειροκίνητα, δεν θα ξαναστείλει
        if (!forceResend && reservation.codes_sent) { skipped++; continue }
        if (reservation.status !== 'checked_in') { skipped++; continue }

        const room = reservation.rooms
        if (!room) { errors++; continue }

        const checkin = reservation.guest_checkins?.[0]
        if (!checkin?.email) { errors++; continue }

        const lang    = detectLanguage(checkin.first_name || '', checkin.last_name || '')
        const subject = lang === 'el'
          ? `🗝️ Κωδικοί Δωματίου ${room.room_number} — Tower 15 Suites`
          : `🗝️ Room ${room.room_number} Access Codes — Tower 15 Suites`

        const guestData = { first_name: checkin.first_name, last_name: checkin.last_name }
        const htmlBody  = buildEmailHtml(guestData, room, reservation, lang)
        const textBody  = buildPlainTextCodes(guestData, room, reservation, lang)

        // 1. Email με κωδικούς (μέσω Resend)
        await sendEmail(checkin.email, subject, htmlBody, textBody)

        // 2. Platform επιβεβαίωση (Booking.com + Airbnb) — χωρίς τους κωδικούς
        const platformLower = (reservation.platform || '').toLowerCase()
        if (reservation.hosthub_id && (platformLower.includes('booking') || platformLower.includes('airbnb'))) {
          const confirmMsg = buildCodesConfirmMessage(room, lang)
          await sendPlatformMessage(reservation.hosthub_id, confirmMsg)
        }

        // 3. Update DB — codes_sent=true
        await supabase.from('reservations').update({
          codes_sent:    true,
          codes_sent_at: new Date().toISOString(),
        }).eq('id', resId)

        sent++
        results.push({ id: resId, email: checkin.email, room: room.room_number })
      } catch (e: any) {
        console.error(`Error for ${resId}:`, e.message)
        errors++
      }
    }

    return new Response(
      JSON.stringify({ message: `✓ Κωδικοί: ${sent} | Παραλείφθηκαν: ${skipped} | Σφάλματα: ${errors}`, sent, skipped, errors, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
