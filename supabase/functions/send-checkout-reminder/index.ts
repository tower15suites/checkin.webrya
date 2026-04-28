import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL     = 'info@tower15suites.gr'
const FROM_NAME      = 'Tower 15 Suites'

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

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `${FROM_NAME} <${FROM_EMAIL}>`, to: [to], subject, html, text }),
  })
  if (!res.ok) throw new Error(`Resend error: ${await res.text()}`)
  return res.json()
}

// ── Plain text checkout reminder (bilingual) ──────────────────────────────────
function buildPlainText(guestName: string, roomNumber: string, lang: 'el' | 'en'): string {
  if (lang === 'el') {
    return `Αγαπητέ/ή ${guestName},

Ευχόμαστε η διαμονή σας στο Tower 15 Suites να ήταν ευχάριστη!

Σήμερα είναι η ημέρα αναχώρησής σας.

━━━━━━━━━━━━━━━━━━━━━━━
🏨 ΩΡΑ ΑΝΑΧΩΡΗΣΗΣ: 11:00
🏠 Δωμάτιο: ${roomNumber}
━━━━━━━━━━━━━━━━━━━━━━━

ΟΔΗΓΙΕΣ ΑΝΑΧΩΡΗΣΗΣ:
1. Αφήστε το κλειδί μέσα στο δωμάτιο ή επιστρέψτε το στον keylocker
2. Κλείστε καλά την πόρτα του δωματίου
3. Δεν χρειάζεται reception — η αποχώρηση είναι αυτόματη

Χρειάζεστε late check-out; Επικοινωνήστε μαζί μας:
📞 +30 6949655349

Σας ευχαριστούμε για την επιλογή σας!
Tower 15 Suites`
  } else {
    return `Dear ${guestName},

We hope you enjoyed your stay at Tower 15 Suites!

Today is your check-out day.

━━━━━━━━━━━━━━━━━━━━━━━
🏨 CHECK-OUT TIME: 11:00
🏠 Room: ${roomNumber}
━━━━━━━━━━━━━━━━━━━━━━━

CHECK-OUT INSTRUCTIONS:
1. Leave the key inside the room or return it to the keylocker
2. Make sure to close your room door properly
3. No reception needed — check-out is automatic

Need a late check-out? Contact us:
📞 +30 6949655349

Thank you for choosing us!
Tower 15 Suites`
  }
}

// ── HTML checkout reminder (bilingual) ───────────────────────────────────────
function buildCheckoutEmail(guestName: string, room: any, lang: 'el' | 'en'): string {
  const isGreek = lang === 'el'

  const L = isGreek ? {
    subtitle:    'Υπενθύμιση Αναχώρησης',
    greeting:    `Αγαπητέ/ή ${guestName},`,
    body:        'Ευχόμαστε η διαμονή σας στο Tower 15 Suites να ήταν ευχάριστη! Σας υπενθυμίζουμε ότι σήμερα είναι η ημέρα αναχώρησής σας.',
    timeLabel:   'Ώρα Αναχώρησης',
    timeNote:    'Παρακαλούμε αποχωρήστε έως τις 11:00',
    instrLabel:  'Οδηγίες Αναχώρησης',
    step1:       'Αφήστε το κλειδί μέσα στο δωμάτιο ή επιστρέψτε το στον keylocker',
    step2:       'Κλείστε καλά την πόρτα του δωματίου',
    step3:       'Δεν χρειάζεται reception — η αποχώρηση είναι αυτόματη',
    lateLabel:   'Χρειάζεστε',
    lateKey:     'late check-out',
    lateSuffix:  '; Επικοινωνήστε μαζί μας άμεσα στο',
    lateEnd:     'και θα κάνουμε ό,τι μπορούμε ανάλογα με διαθεσιμότητα.',
    roomLabel:   'Δωμάτιο',
    thankTitle:  'Σας ευχαριστούμε για την επιλογή σας!',
    thankBody:   'Ελπίζουμε να σας ξανασυναντήσουμε σύντομα στη Θεσσαλονίκη.',
    subject:     '🏨 Καλή Αναχώρηση — Check-out έως 11:00 | Tower 15 Suites',
  } : {
    subtitle:    'Check-out Reminder',
    greeting:    `Dear ${guestName},`,
    body:        'We hope you enjoyed your stay at Tower 15 Suites! This is a reminder that today is your check-out day.',
    timeLabel:   'Check-out Time',
    timeNote:    'Please check out by 11:00',
    instrLabel:  'Check-out Instructions',
    step1:       'Leave the key inside your room or return it to the keylocker',
    step2:       'Make sure to close your room door properly',
    step3:       'No reception needed — check-out is automatic',
    lateLabel:   'Need a',
    lateKey:     'late check-out',
    lateSuffix:  '? Contact us at',
    lateEnd:     'and we\'ll do our best based on availability.',
    roomLabel:   'Room',
    thankTitle:  'Thank you for choosing us!',
    thankBody:   'We hope to welcome you back to Thessaloniki soon.',
    subject:     '🏨 Check-out Today — By 11:00 | Tower 15 Suites',
  }

  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f0e0d;font-family:'Georgia',serif;color:#f5f0e8;">
<div style="max-width:560px;margin:0 auto;padding:20px;">
  <div style="text-align:center;padding:40px 0 30px;border-bottom:1px solid #3d3935;">
    <img src="https://checkin.webrya.com/logo-tower15suites.png" alt="Tower 15 Suites" width="80" height="80" style="display:block;margin:0 auto;border-radius:8px;" />
    <h1 style="font-size:28px;font-weight:300;color:#f5f0e8;margin:16px 0 4px;">Tower 15 Suites</h1>
    <p style="color:#6b6460;font-size:13px;margin:0;font-family:sans-serif;text-transform:uppercase;letter-spacing:0.1em;">${L.subtitle}</p>
  </div>
  <div style="padding:32px 0 20px;">
    <p style="font-size:17px;color:#d4bc98;margin:0 0 16px;font-weight:300;">${L.greeting}</p>
    <p style="font-size:14px;color:#8a7f78;line-height:1.8;margin:0;font-family:sans-serif;">${L.body}</p>
  </div>
  <div style="background:#1a1816;border:1px solid #3d3935;padding:32px;margin:8px 0 24px;text-align:center;">
    <div style="font-family:sans-serif;font-size:11px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:12px;">${L.timeLabel}</div>
    <div style="font-family:monospace;font-size:52px;color:#f5f0e8;font-weight:bold;line-height:1;">11:00</div>
    <div style="font-family:sans-serif;font-size:12px;color:#8a7f78;margin-top:8px;">${L.timeNote}</div>
  </div>
  <div style="background:#1a1816;border:1px solid #2d2b29;padding:24px;margin-bottom:24px;">
    <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:16px;">${L.instrLabel}</div>
    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;">
      <div style="background:#8B5E2A;color:white;font-family:monospace;font-size:11px;font-weight:bold;width:20px;height:20px;min-width:20px;line-height:20px;text-align:center;">1</div>
      <div style="font-family:sans-serif;font-size:13px;color:#8a7f78;line-height:1.6;">${L.step1}</div>
    </div>
    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;">
      <div style="background:#8B5E2A;color:white;font-family:monospace;font-size:11px;font-weight:bold;width:20px;height:20px;min-width:20px;line-height:20px;text-align:center;">2</div>
      <div style="font-family:sans-serif;font-size:13px;color:#8a7f78;line-height:1.6;">${L.step2}</div>
    </div>
    <div style="display:flex;align-items:flex-start;gap:12px;">
      <div style="background:#8B5E2A;color:white;font-family:monospace;font-size:11px;font-weight:bold;width:20px;height:20px;min-width:20px;line-height:20px;text-align:center;">3</div>
      <div style="font-family:sans-serif;font-size:13px;color:#8a7f78;line-height:1.6;">${L.step3}</div>
    </div>
  </div>
  <div style="background:#1a1410;border:1px solid #3d2e1e;padding:16px;margin-bottom:24px;">
    <p style="font-family:sans-serif;font-size:12px;color:#8a7060;margin:0;line-height:1.8;">
      🕐 ${L.lateLabel} <strong style="color:#c09a68;">${L.lateKey}</strong>${L.lateSuffix}
      <a href="tel:+306949655349" style="color:#c09a68;text-decoration:none;font-weight:bold;">+30 6949655349</a>
      ${L.lateEnd}
    </p>
  </div>
  ${room ? `
  <div style="background:#1a1816;border:1px solid #2d2b29;padding:16px;margin-bottom:24px;">
    <div style="display:flex;justify-content:space-between;">
      <span style="font-family:sans-serif;font-size:11px;color:#6b6460;">${L.roomLabel}</span>
      <span style="font-family:monospace;font-size:14px;color:#f5f0e8;">${room.room_number}</span>
    </div>
  </div>
  ` : ''}
  <div style="text-align:center;padding:20px 0 28px;">
    <p style="font-family:'Georgia',serif;font-size:16px;color:#d4bc98;font-weight:300;margin:0 0 8px;">${L.thankTitle}</p>
    <p style="font-family:sans-serif;font-size:13px;color:#6b6460;margin:0;">${L.thankBody}</p>
  </div>
  <div style="text-align:center;padding-top:24px;border-top:1px solid #2d2b29;">
    <p style="font-family:sans-serif;font-size:11px;color:#3d3a38;margin:0;">Tower 15 Suites · Ιωάννου Φαρμάκη 15, Θεσσαλονίκη</p>
    <p style="font-family:sans-serif;font-size:10px;color:#2e2c2a;margin:6px 0 0;letter-spacing:0.05em;">Designed &amp; Developed by <a href="https://webrya.com" style="color:#4a3f35;text-decoration:none;font-weight:bold;">Webrya</a></p>
  </div>
</div>
</body>
</html>`
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const today = new Date().toISOString().split('T')[0]

    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('*, rooms(*), guest_checkins(*)')
      .eq('check_out_date', today)
      .eq('checkout_reminder_sent', false)

    if (error) throw new Error(`Query error: ${JSON.stringify(error)}`)

    let sent = 0, errors = 0

    for (const reservation of reservations || []) {
      try {
        const checkin = reservation.guest_checkins?.[0]
        const email   = checkin?.email || reservation.guest_email
        if (!email) continue

        const firstName = checkin?.first_name || reservation.guest_first_name || ''
        const lastName  = checkin?.last_name  || reservation.guest_last_name  || ''
        const lang      = detectLanguage(firstName, lastName)
        const guestName = firstName || (lang === 'el' ? 'Επισκέπτη' : 'Guest')
        const roomNum   = reservation.rooms?.room_number || ''

        const subject  = lang === 'el'
          ? '🏨 Καλή Αναχώρηση — Check-out έως 11:00 | Tower 15 Suites'
          : '🏨 Check-out Today — By 11:00 | Tower 15 Suites'

        const html = buildCheckoutEmail(guestName, reservation.rooms, lang)
        const text = buildPlainText(guestName, roomNum, lang)

        await sendEmail(email, subject, html, text)

        // Πάντα σημειώνουμε το reminder ως αποσταλμένο (αποτρέπει duplicates)
        // Αν ήταν checked_in, το μεταβάλλουμε σε checked_out
        await supabase
          .from('reservations')
          .update({ checkout_reminder_sent: true, checkout_reminder_sent_at: new Date().toISOString() })
          .eq('id', reservation.id)

        await supabase
          .from('reservations')
          .update({ status: 'checked_out' })
          .eq('id', reservation.id)
          .eq('status', 'checked_in')

        sent++
      } catch (e: any) {
        console.error(`Error for ${reservation.id}:`, e.message)
        errors++
      }
    }

    return new Response(
      JSON.stringify({ message: `✓ Checkout reminders: ${sent} | Errors: ${errors}`, checkout_date: today, sent, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
