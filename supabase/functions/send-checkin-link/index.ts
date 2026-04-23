import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY     = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL         = 'info@tower15suites.gr'
const FROM_NAME          = 'Tower 15 Suites'
const CHECKIN_PORTAL_URL = Deno.env.get('CHECKIN_PORTAL_URL') || 'https://checkin.tower15suites.gr'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!
)

// ── Εκτίμηση γλώσσας από όνομα ───────────────────────────────────────────────
// Ελληνικοί χαρακτήρες ή γνωστά ελληνικά ονόματα → ελληνικά
function detectLanguage(firstName: string, lastName: string): 'el' | 'en' {
  const name = `${firstName} ${lastName}`.toLowerCase()
  // Ελληνικοί χαρακτήρες
  if (/[α-ωάέήίόύώϊϋΐΰ]/.test(name)) return 'el'
  // Γνωστά ελληνικά ονόματα σε λατινικούς χαρακτήρες
  const greekNames = [
    'alexandros','alex','nikos','nikolaos','giorgos','georgios','george','dimitris','dimitrios',
    'kostas','konstantinos','yannis','ioannis','john','petros','stavros','apostolos','apostolis',
    'michalis','michael','vasilis','vasileios','panagiotis','panagis','thanasis','athanasios',
    'christos','christ','spyros','spyridon','antonis','antonios','katerina','aikaterini','maria',
    'elena','eleni','sofia','sofi','anna','ioanna','georgia','angeliki','angelos','andreas',
    'evangelia','evangelos','stavroula','despina','fotini','theodoros','theodore','thanos',
    'lefteris','eleftherios','manolis','emmanouel','stratos','efstratios','giannis','tasos',
    'manos','makis','lakis','babis','kosmas','pavlos','paul','stelios','stylianos',
    'kyriakos','kyriaki','panos','panagiotis','tolis','takis','vaggelis','vangelis',
    'evangelos','zoe','zoi','dimos','dhmhtrios','theofilos','arsenios','filippos','philip',
    'marios','mario','nektarios','charalampos','haris','harris','fotis','fotios',
    'koulouris','papadopoulos','papageorgiou','nikolaidis','georgiou','alexandrou',
    'karamanlis','stefanidis','dimitriou','konstantinidis','papadimitriou','kougioumtzi',
    'michaloglou','stamos','stanojevic'
  ]
  const parts = name.split(/\s+/)
  return parts.some(p => greekNames.includes(p)) ? 'el' : 'en'
}

// ── Email templates ───────────────────────────────────────────────────────────
function buildEmail(reservation: any, checkinUrl: string): { subject: string; html: string } {
  const firstName  = reservation.guest_first_name || ''
  const lastName   = reservation.guest_last_name  || ''
  const lang       = detectLanguage(firstName, lastName)
  const isGreek    = lang === 'el'

  const checkInDate  = new Date(reservation.check_in_date)
  const checkOutDate = new Date(reservation.check_out_date)

  const checkInFormatted  = checkInDate.toLocaleDateString(isGreek ? 'el-GR' : 'en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const checkOutFormatted = checkOutDate.toLocaleDateString(isGreek ? 'el-GR' : 'en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const guestName = firstName || (isGreek ? 'Επισκέπτη' : 'Guest')

  if (isGreek) {
    return {
      subject: `Επιβεβαίωση Κράτησης & Online Check-In — Tower 15 Suites`,
      html: buildGreekEmail(guestName, checkInFormatted, checkOutFormatted, checkinUrl, reservation.reservation_code),
    }
  } else {
    return {
      subject: `Booking Confirmation & Online Check-In — Tower 15 Suites`,
      html: buildEnglishEmail(guestName, checkInFormatted, checkOutFormatted, checkinUrl, reservation.reservation_code),
    }
  }
}

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="el">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0f0e0d;font-family:'Georgia',serif;color:#f5f0e8;">
<div style="max-width:580px;margin:0 auto;padding:24px;">

  <!-- Header -->
  <div style="text-align:center;padding:40px 0 30px;border-bottom:1px solid #3d3935;">
    <div style="display:inline-block;background:#8B5E2A;width:52px;height:52px;line-height:52px;text-align:center;font-family:monospace;font-weight:bold;color:white;font-size:15px;letter-spacing:1px;">T15</div>
    <h1 style="font-size:26px;font-weight:300;color:#f5f0e8;margin:14px 0 4px;letter-spacing:0.05em;">Tower 15 Suites</h1>
    <p style="color:#6b6460;font-size:12px;margin:0;font-family:sans-serif;text-transform:uppercase;letter-spacing:0.12em;">Thessaloniki, Greece</p>
  </div>

  ${content}

  <!-- Footer -->
  <div style="text-align:center;padding-top:28px;border-top:1px solid #2d2b29;margin-top:32px;">
    <p style="font-family:sans-serif;font-size:12px;color:#4a4744;margin:0 0 4px;">Tower 15 Suites · Ιωάννου Φαρμάκη 15, Θεσσαλονίκη 546 29</p>
    <p style="font-family:sans-serif;font-size:11px;color:#3d3a38;margin:4px 0;">
      <a href="https://tower15suites.gr" style="color:#6b5c4a;text-decoration:none;">tower15suites.gr</a>
      &nbsp;·&nbsp;
      <a href="tel:+306949655349" style="color:#6b5c4a;text-decoration:none;">+30 6949655349</a>
      &nbsp;·&nbsp;
      <a href="mailto:info@tower15suites.gr" style="color:#6b5c4a;text-decoration:none;">info@tower15suites.gr</a>
    </p>
    <p style="font-family:sans-serif;font-size:10px;color:#2e2c2a;margin:8px 0 0;letter-spacing:0.05em;">
      Designed &amp; Developed by <a href="https://webrya.com" style="color:#4a3f35;text-decoration:none;font-weight:bold;">Webrya</a>
    </p>
  </div>

</div>
</body>
</html>`
}

function buildGreekEmail(guestName: string, checkIn: string, checkOut: string, url: string, resCode: string): string {
  return emailWrapper(`
  <!-- Greeting -->
  <div style="padding:32px 0 8px;">
    <p style="font-size:18px;color:#d4bc98;margin:0 0 6px;font-weight:300;">Αγαπητέ/ή ${guestName},</p>
    <p style="font-size:14px;color:#8a7f78;line-height:1.9;margin:0;font-family:sans-serif;">
      Σας ευχαριστούμε που επιλέξατε το <strong style="color:#c09a68;">Tower 15 Suites</strong> για την επερχόμενη διαμονή σας! Ανυπομονούμε να σας υποδεχτούμε.
    </p>
  </div>

  <!-- Dates -->
  <div style="display:flex;gap:12px;margin:20px 0;">
    <div style="flex:1;background:#1a1816;border:1px solid #3d3935;padding:16px;text-align:center;">
      <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">Check-in</div>
      <div style="font-family:sans-serif;font-size:13px;color:#f5f0e8;line-height:1.4;">${checkIn}</div>
      <div style="font-family:monospace;font-size:12px;color:#8B5E2A;margin-top:5px;font-weight:bold;">από 15:00</div>
    </div>
    <div style="flex:1;background:#1a1816;border:1px solid #3d3935;padding:16px;text-align:center;">
      <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">Check-out</div>
      <div style="font-family:sans-serif;font-size:13px;color:#f5f0e8;line-height:1.4;">${checkOut}</div>
      <div style="font-family:monospace;font-size:12px;color:#8B5E2A;margin-top:5px;font-weight:bold;">έως 11:00</div>
    </div>
  </div>

  <!-- Address -->
  <div style="background:#1a1816;border:1px solid #2d2b29;padding:14px 18px;margin-bottom:24px;display:flex;align-items:center;gap:12px;">
    <span style="font-size:20px;">📍</span>
    <div>
      <div style="font-family:sans-serif;font-size:11px;color:#6b6460;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px;">Διεύθυνση</div>
      <div style="font-family:sans-serif;font-size:13px;color:#d4bc98;">Ιωάννου Φαρμάκη 15, Θεσσαλονίκη 546 29</div>
    </div>
  </div>

  <!-- Divider -->
  <div style="border-top:1px solid #3d3935;margin:24px 0;"></div>

  <!-- Check-in CTA -->
  <div style="margin-bottom:8px;">
    <p style="font-family:sans-serif;font-size:14px;color:#8a7f78;line-height:1.9;margin:0 0 16px;">
      Για να κάνουμε την άφιξή σας όσο πιο εύκολη γίνεται, παρακαλούμε ολοκληρώστε το <strong style="color:#c09a68;">online check-in</strong> πριν φτάσετε. Μόλις το ολοκληρώσετε, θα λάβετε αυτόματα τους <strong style="color:#c09a68;">κωδικούς εισόδου</strong> (keylocker &amp; WiFi) στις <strong style="color:#c09a68;">14:00</strong> της ημέρας άφιξής σας.
    </p>
  </div>

  <!-- CTA Button -->
  <div style="text-align:center;padding:20px 0 24px;">
    <a href="${url}" style="display:inline-block;background:#8B5E2A;color:white;text-decoration:none;padding:15px 44px;font-family:sans-serif;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">
      Έναρξη Online Check-In →
    </a>
    <p style="font-family:sans-serif;font-size:11px;color:#4a4744;margin:12px 0 0;">
      Ή αντιγράψτε: <span style="color:#8a7f78;word-break:break-all;">${url}</span>
    </p>
  </div>

  <!-- Security notice -->
  <div style="background:#1a1410;border:1px solid #3d2e1e;padding:14px 18px;margin-bottom:24px;">
    <p style="font-family:sans-serif;font-size:12px;color:#8a7060;margin:0;line-height:1.8;">
      ⚠️ <strong style="color:#c09a68;">Σημείωση ασφάλειας:</strong> Ο σύνδεσμος αυτός είναι επίσημος και ανήκει αποκλειστικά στο Tower 15 Suites. ΔΕΝ είναι phishing. Η διαδικασία είναι απολύτως νόμιμη και απαιτείται βάσει της ελληνικής νομοθεσίας βραχυχρόνιας μίσθωσης.
    </p>
  </div>

  <!-- What you need -->
  <div style="background:#1a1816;border:1px solid #2d2b29;padding:20px 24px;margin-bottom:24px;">
    <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:14px;">Τι θα χρειαστείτε</div>
    <div style="font-family:sans-serif;font-size:13px;color:#8a7f78;line-height:2.0;">
      🪪 &nbsp;Αστυνομική ταυτότητα ή διαβατήριο<br>
      🔢 &nbsp;ΑΦΜ <span style="color:#6b6460;font-size:12px;">(μόνο για Έλληνες πολίτες — απαραίτητο για απόδειξη)</span><br>
      📧 &nbsp;Email για την αποστολή των κωδικών<br>
      ⏱️ &nbsp;Διαρκεί μόνο 2–3 λεπτά
    </div>
  </div>

  <!-- Reservation code -->
  <div style="background:#1a1816;border:1px solid #2d2b29;padding:12px 18px;margin-bottom:24px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span style="font-family:sans-serif;font-size:11px;color:#6b6460;text-transform:uppercase;letter-spacing:0.1em;">Αριθμός Κράτησης</span>
      <span style="font-family:monospace;font-size:15px;color:#c09a68;font-weight:bold;">${resCode}</span>
    </div>
  </div>

  <!-- Prefer not to use link -->
  <div style="padding:0 4px;margin-bottom:8px;">
    <p style="font-family:sans-serif;font-size:12px;color:#6b6460;line-height:1.8;margin:0;">
      Εάν δεν επιθυμείτε να χρησιμοποιήσετε τον σύνδεσμο, επικοινωνήστε μαζί μας απευθείας και θα σας βοηθήσουμε.<br>
      📞 <a href="tel:+306949655349" style="color:#c09a68;text-decoration:none;font-weight:bold;">+30 6949655349</a>
    </p>
  </div>`)
}

function buildEnglishEmail(guestName: string, checkIn: string, checkOut: string, url: string, resCode: string): string {
  return emailWrapper(`
  <!-- Greeting -->
  <div style="padding:32px 0 8px;">
    <p style="font-size:18px;color:#d4bc98;margin:0 0 6px;font-weight:300;">Dear ${guestName},</p>
    <p style="font-size:14px;color:#8a7f78;line-height:1.9;margin:0;font-family:sans-serif;">
      Thank you for choosing <strong style="color:#c09a68;">Tower 15 Suites</strong> for your upcoming stay! We look forward to welcoming you.
    </p>
  </div>

  <!-- Dates -->
  <div style="display:flex;gap:12px;margin:20px 0;">
    <div style="flex:1;background:#1a1816;border:1px solid #3d3935;padding:16px;text-align:center;">
      <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">Check-in</div>
      <div style="font-family:sans-serif;font-size:13px;color:#f5f0e8;line-height:1.4;">${checkIn}</div>
      <div style="font-family:monospace;font-size:12px;color:#8B5E2A;margin-top:5px;font-weight:bold;">from 15:00</div>
    </div>
    <div style="flex:1;background:#1a1816;border:1px solid #3d3935;padding:16px;text-align:center;">
      <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">Check-out</div>
      <div style="font-family:sans-serif;font-size:13px;color:#f5f0e8;line-height:1.4;">${checkOut}</div>
      <div style="font-family:monospace;font-size:12px;color:#8B5E2A;margin-top:5px;font-weight:bold;">by 11:00</div>
    </div>
  </div>

  <!-- Address -->
  <div style="background:#1a1816;border:1px solid #2d2b29;padding:14px 18px;margin-bottom:24px;display:flex;align-items:center;gap:12px;">
    <span style="font-size:20px;">📍</span>
    <div>
      <div style="font-family:sans-serif;font-size:11px;color:#6b6460;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:3px;">Address</div>
      <div style="font-family:sans-serif;font-size:13px;color:#d4bc98;">Ioannou Farmaki 15, Thessaloniki 546 29</div>
    </div>
  </div>

  <!-- Divider -->
  <div style="border-top:1px solid #3d3935;margin:24px 0;"></div>

  <!-- Check-in CTA -->
  <div style="margin-bottom:8px;">
    <p style="font-family:sans-serif;font-size:14px;color:#8a7f78;line-height:1.9;margin:0 0 16px;">
      To make your arrival as smooth as possible, please complete your <strong style="color:#c09a68;">online check-in</strong> before you arrive. Once completed, you will automatically receive your <strong style="color:#c09a68;">access codes</strong> (keylocker &amp; WiFi) by email at <strong style="color:#c09a68;">14:00</strong> on your arrival day.
    </p>
  </div>

  <!-- CTA Button -->
  <div style="text-align:center;padding:20px 0 24px;">
    <a href="${url}" style="display:inline-block;background:#8B5E2A;color:white;text-decoration:none;padding:15px 44px;font-family:sans-serif;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">
      Start Online Check-In →
    </a>
    <p style="font-family:sans-serif;font-size:11px;color:#4a4744;margin:12px 0 0;">
      Or copy the link: <span style="color:#8a7f78;word-break:break-all;">${url}</span>
    </p>
  </div>

  <!-- Security notice -->
  <div style="background:#1a1410;border:1px solid #3d2e1e;padding:14px 18px;margin-bottom:24px;">
    <p style="font-family:sans-serif;font-size:12px;color:#8a7060;margin:0;line-height:1.8;">
      ⚠️ <strong style="color:#c09a68;">Security notice:</strong> This link is official and secure. It belongs exclusively to Tower 15 Suites and is NOT a phishing attempt. The process is fully legal and required under Greek short-term rental regulations.
    </p>
  </div>

  <!-- What you need -->
  <div style="background:#1a1816;border:1px solid #2d2b29;padding:20px 24px;margin-bottom:24px;">
    <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:14px;">What you will need</div>
    <div style="font-family:sans-serif;font-size:13px;color:#8a7f78;line-height:2.0;">
      🪪 &nbsp;National ID card or passport<br>
      📧 &nbsp;Email address to receive your access codes<br>
      ⏱️ &nbsp;Only takes 2–3 minutes
    </div>
  </div>

  <!-- Reservation code -->
  <div style="background:#1a1816;border:1px solid #2d2b29;padding:12px 18px;margin-bottom:24px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span style="font-family:sans-serif;font-size:11px;color:#6b6460;text-transform:uppercase;letter-spacing:0.1em;">Reservation Number</span>
      <span style="font-family:monospace;font-size:15px;color:#c09a68;font-weight:bold;">${resCode}</span>
    </div>
  </div>

  <!-- Prefer not to use link -->
  <div style="padding:0 4px;margin-bottom:8px;">
    <p style="font-family:sans-serif;font-size:12px;color:#6b6460;line-height:1.8;margin:0;">
      If you prefer not to use the link, please contact us directly and we will be happy to assist you.<br>
      📞 <a href="tel:+306949655349" style="color:#c09a68;text-decoration:none;font-weight:bold;">+30 6949655349</a>
    </p>
  </div>`)
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: `${FROM_NAME} <${FROM_EMAIL}>`, to: [to], subject, html }),
  })
  if (!res.ok) throw new Error(`Resend error: ${await res.text()}`)
  return res.json()
}

async function processReservation(reservation: any): Promise<boolean> {
  if (!reservation.guest_email) return false
  if (reservation.checkin_link_sent) return false

  const checkinUrl = `${CHECKIN_PORTAL_URL}?reservation=${encodeURIComponent(reservation.reservation_code)}&lastname=${encodeURIComponent(reservation.guest_last_name || '')}`
  const { subject, html } = buildEmail(reservation, checkinUrl)

  await sendEmail(reservation.guest_email, subject, html)

  await supabase
    .from('reservations')
    .update({ checkin_link_sent: true, checkin_link_sent_at: new Date().toISOString() })
    .eq('id', reservation.id)

  return true
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

    if (body.reservationId) {
      // Single mode: κλήθηκε από sync-hosthub για νέα κράτηση
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('id', body.reservationId)
        .single()
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Reservation not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      reservations = [data]
    } else {
      // Batch/cron mode: fallback για κρατήσεις που δεν έλαβαν link
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() + 2)
      const target = targetDate.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('check_in_date', target)
        .eq('checkin_link_sent', false)
        .not('guest_email', 'is', null)
      if (error) throw new Error(`Query error: ${JSON.stringify(error)}`)
      reservations = data || []
    }

    let sent = 0, errors = 0

    for (const reservation of reservations) {
      try {
        const ok = await processReservation(reservation)
        if (ok) sent++
      } catch (e: any) {
        console.error(`Error for ${reservation.id}:`, e.message)
        errors++
      }
    }

    return new Response(
      JSON.stringify({
        message: `✓ Εστάλησαν ${sent} emails. Σφάλματα: ${errors}`,
        mode: body.reservationId ? 'single' : 'batch',
        sent,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
