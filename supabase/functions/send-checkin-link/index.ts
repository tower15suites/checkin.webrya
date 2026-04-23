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
function detectLanguage(firstName: string, lastName: string): 'el' | 'en' {
  const name = `${firstName} ${lastName}`.toLowerCase()
  if (/[α-ωάέήίόύώϊϋΐΰ]/.test(name)) return 'el'
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
      subject: `Επιβεβαίωση Κράτησης — Tower 15 Suites`,
      html: buildGreekEmail(guestName, checkInFormatted, checkOutFormatted, checkinUrl, reservation.reservation_code),
    }
  } else {
    return {
      subject: `Booking Confirmation — Tower 15 Suites`,
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

  <div style="text-align:center;padding:40px 0 30px;border-bottom:1px solid #3d3935;">
    <img src="https://checkin.webrya.com/logo-tower15suites.png" alt="Tower 15 Suites" width="80" height="80" style="display:block;margin:0 auto;border-radius:8px;" />
    <p style="color:#6b6460;font-size:12px;margin:12px 0 0;font-family:sans-serif;text-transform:uppercase;letter-spacing:0.12em;">Thessaloniki, Greece</p>
  </div>

  ${content}

  <div style="text-align:center;padding-top:28px;border-top:1px solid #2d2b29;margin-top:32px;">
    <p style="font-family:sans-serif;font-size:12px;color:#4a4744;margin:0 0 8px;">Tower 15 Suites · Ιωάννου Φαρμάκη 15, Θεσσαλονίκη</p>
    <p style="font-family:sans-serif;font-size:11px;color:#6b5c4a;margin:4px 0;">
      tower15suites.gr &nbsp;·&nbsp; +30 6949655349 &nbsp;·&nbsp; info@tower15suites.gr
    </p>
    <p style="font-family:sans-serif;font-size:10px;color:#2e2c2a;margin:12px 0 0;letter-spacing:0.05em;">
      Designed &amp; Developed by <strong>Webrya</strong>
    </p>
  </div>

</div>
</body>
</html>`
}

function buildGreekEmail(guestName: string, checkIn: string, checkOut: string, url: string, resCode: string): string {
  return emailWrapper(`
  <div style="padding:32px 0 8px;">
    <p style="font-size:18px;color:#d4bc98;margin:0 0 6px;font-weight:300;">Γεια σας, ${guestName}</p>
    <p style="font-size:14px;color:#8a7f78;line-height:1.7;margin:0;font-family:sans-serif;">
      Σας ευχαριστούμε για την κράτησή σας! Είμαστε έτοιμοι να σας υποδεχτούμε στη Θεσσαλονίκη.
    </p>
  </div>

  <table width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
    <tr>
      <td width="48%" style="background:#1a1816; border:1px solid #3d3935; padding:16px; text-align:center;">
        <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;">Check-in</div>
        <div style="font-family:sans-serif;font-size:13px;color:#f5f0e8;margin-top:5px;">${checkIn}</div>
        <div style="font-size:11px;color:#8B5E2A;margin-top:5px;">από 15:00</div>
      </td>
      <td width="4%"></td>
      <td width="48%" style="background:#1a1816; border:1px solid #3d3935; padding:16px; text-align:center;">
        <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;">Check-out</div>
        <div style="font-family:sans-serif;font-size:13px;color:#f5f0e8;margin-top:5px;">${checkOut}</div>
        <div style="font-size:11px;color:#8B5E2A;margin-top:5px;">έως 11:00</div>
      </td>
    </tr>
  </table>

  <div style="margin-bottom:20px;">
    <p style="font-family:sans-serif;font-size:14px;color:#8a7f78;line-height:1.8;">
      Παρακαλούμε ολοκληρώστε το <strong>online check-in</strong> για να λάβετε αυτόματα τους κωδικούς εισόδου την ημέρα της άφιξής σας.
    </p>
  </div>

  <div style="text-align:center;padding:10px 0 30px;">
    <a href="${url}" style="display:inline-block;background:#8B5E2A;color:#ffffff;text-decoration:none;padding:16px 30px;font-family:sans-serif;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;border-radius:4px;">
      ΟΛΟΚΛΗΡΩΣΗ CHECK-IN
    </a>
  </div>

  <div style="background:#1a1410;border:1px solid #3d2e1e;padding:15px;margin-bottom:20px;">
    <p style="font-family:sans-serif;font-size:12px;color:#8a7060;margin:0;line-height:1.6;">
      🪪 Θα χρειαστείτε: Ταυτότητα ή Διαβατήριο και ΑΦΜ (για Έλληνες πολίτες).
    </p>
  </div>

  <div style="padding:10px; border-top:1px solid #2d2b29;">
    <p style="font-family:sans-serif;font-size:11px;color:#6b6460;margin:0;">
      Αριθμός Κράτησης: <strong style="color:#c09a68;">${resCode}</strong>
    </p>
  </div>`)
}

function buildEnglishEmail(guestName: string, checkIn: string, checkOut: string, url: string, resCode: string): string {
  return emailWrapper(`
  <div style="padding:32px 0 8px;">
    <p style="font-size:18px;color:#d4bc98;margin:0 0 6px;font-weight:300;">Hello ${guestName},</p>
    <p style="font-size:14px;color:#8a7f78;line-height:1.7;margin:0;font-family:sans-serif;">
      Thank you for your booking! We are looking forward to welcoming you to Thessaloniki.
    </p>
  </div>

  <table width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
    <tr>
      <td width="48%" style="background:#1a1816; border:1px solid #3d3935; padding:16px; text-align:center;">
        <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;">Check-in</div>
        <div style="font-family:sans-serif;font-size:13px;color:#f5f0e8;margin-top:5px;">${checkIn}</div>
        <div style="font-size:11px;color:#8B5E2A;margin-top:5px;">from 15:00</div>
      </td>
      <td width="4%"></td>
      <td width="48%" style="background:#1a1816; border:1px solid #3d3935; padding:16px; text-align:center;">
        <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;">Check-out</div>
        <div style="font-family:sans-serif;font-size:13px;color:#f5f0e8;margin-top:5px;">${checkOut}</div>
        <div style="font-size:11px;color:#8B5E2A;margin-top:5px;">by 11:00</div>
      </td>
    </tr>
  </table>

  <div style="margin-bottom:20px;">
    <p style="font-family:sans-serif;font-size:14px;color:#8a7f78;line-height:1.8;">
      Please complete the <strong>online check-in</strong> to automatically receive your access codes on your arrival day.
    </p>
  </div>

  <div style="text-align:center;padding:10px 0 30px;">
    <a href="${url}" style="display:inline-block;background:#8B5E2A;color:#ffffff;text-decoration:none;padding:16px 30px;font-family:sans-serif;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;font-weight:600;border-radius:4px;">
      COMPLETE CHECK-IN
    </a>
  </div>

  <div style="background:#1a1410;border:1px solid #3d2e1e;padding:15px;margin-bottom:20px;">
    <p style="font-family:sans-serif;font-size:12px;color:#8a7060;margin:0;line-height:1.6;">
      🪪 You will need: Your ID card or Passport.
    </p>
  </div>

  <div style="padding:10px; border-top:1px solid #2d2b29;">
    <p style="font-family:sans-serif;font-size:11px;color:#6b6460;margin:0;">
      Reservation Code: <strong style="color:#c09a68;">${resCode}</strong>
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