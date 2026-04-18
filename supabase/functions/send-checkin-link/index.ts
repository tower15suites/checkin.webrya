import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = 'info@tower15suites.gr'
const FROM_NAME = 'Tower 15 Suites'
const CHECKIN_PORTAL_URL = Deno.env.get('CHECKIN_PORTAL_URL') || 'https://checkin.tower15suites.gr'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!
)

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

function buildCheckinLinkEmail(reservation: any, checkinUrl: string) {
  const guestName = reservation.guest_first_name || 'Επισκέπτη'
  const checkInFormatted = new Date(reservation.check_in_date).toLocaleDateString('el-GR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return `<!DOCTYPE html>
<html lang="el">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f0e0d;font-family:'Georgia',serif;color:#f5f0e8;">
<div style="max-width:560px;margin:0 auto;padding:20px;">

  <!-- Header -->
  <div style="text-align:center;padding:40px 0 30px;border-bottom:1px solid #3d3935;">
    <div style="display:inline-block;background:#8B5E2A;width:52px;height:52px;line-height:52px;text-align:center;font-family:monospace;font-weight:bold;color:white;font-size:15px;">T15</div>
    <h1 style="font-size:28px;font-weight:300;color:#f5f0e8;margin:16px 0 4px;letter-spacing:0.05em;">Tower 15 Suites</h1>
    <p style="color:#6b6460;font-size:13px;margin:0;font-family:sans-serif;text-transform:uppercase;letter-spacing:0.1em;">Online Check-In</p>
  </div>

  <!-- Body -->
  <div style="padding:32px 0 20px;">
    <p style="font-size:17px;color:#d4bc98;margin:0 0 16px;font-weight:300;">Αγαπητέ/ή ${guestName},</p>
    <p style="font-size:14px;color:#8a7f78;line-height:1.8;margin:0 0 12px;font-family:sans-serif;">
      Ανυπομονούμε να σας υποδεχτούμε στο <strong style="color:#c09a68;">Tower 15 Suites</strong>!
      Η άφιξή σας είναι προγραμματισμένη για <strong style="color:#f5f0e8;">${checkInFormatted}</strong>.
    </p>
    <p style="font-size:14px;color:#8a7f78;line-height:1.8;margin:0;font-family:sans-serif;">
      Παρακαλούμε ολοκληρώστε το <strong style="color:#c09a68;">online check-in</strong> πριν την άφιξή σας 
      ώστε να λάβετε τους κωδικούς εισόδου αυτόματα στις <strong style="color:#c09a68;">14:00</strong> της ημέρας άφιξής σας.
    </p>
  </div>

  <!-- CTA -->
  <div style="text-align:center;padding:28px 0;">
    <a href="${checkinUrl}"
       style="display:inline-block;background:#8B5E2A;color:white;text-decoration:none;padding:16px 40px;font-family:sans-serif;font-size:15px;letter-spacing:0.08em;text-transform:uppercase;">
      Έναρξη Online Check-In →
    </a>
    <p style="font-family:sans-serif;font-size:11px;color:#4a4744;margin:12px 0 0;">
      Ή αντιγράψτε τον σύνδεσμο: <span style="color:#8a7f78;">${checkinUrl}</span>
    </p>
  </div>

  <!-- What to expect -->
  <div style="background:#1a1816;border:1px solid #3d3935;padding:24px;margin-bottom:24px;">
    <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:16px;">Τι θα χρειαστείτε</div>
    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
      <span style="font-size:18px;">🪪</span>
      <div style="font-family:sans-serif;font-size:13px;color:#8a7f78;line-height:1.6;">Αστυνομική ταυτότητα ή διαβατήριο</div>
    </div>
    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
      <span style="font-size:18px;">📧</span>
      <div style="font-family:sans-serif;font-size:13px;color:#8a7f78;line-height:1.6;">Email επικοινωνίας για τους κωδικούς</div>
    </div>
    <div style="display:flex;align-items:flex-start;gap:12px;">
      <span style="font-size:18px;">⏱️</span>
      <div style="font-family:sans-serif;font-size:13px;color:#8a7f78;line-height:1.6;">Διαρκεί μόνο 2–3 λεπτά</div>
    </div>
  </div>

  <!-- Reservation info -->
  <div style="background:#1a1816;border:1px solid #2d2b29;padding:16px;margin-bottom:28px;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <span style="font-family:sans-serif;font-size:11px;color:#6b6460;">Αριθμός Κράτησης</span>
      <span style="font-family:monospace;font-size:14px;color:#c09a68;">${reservation.reservation_code}</span>
    </div>
  </div>

  <!-- Contact -->
  <div style="text-align:center;margin-bottom:28px;">
    <p style="font-family:sans-serif;font-size:12px;color:#6b6460;margin:0 0 8px;">Ερωτήσεις; Είμαστε εδώ.</p>
    <a href="tel:+306949655349" style="font-family:monospace;font-size:16px;color:#c09a68;text-decoration:none;font-weight:bold;">+30 6949655349</a>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding-top:24px;border-top:1px solid #2d2b29;">
    <p style="font-family:sans-serif;font-size:12px;color:#4a4744;margin:0 0 4px;">Tower 15 Suites — Ιωάννου Φαρμάκη 15, Θεσσαλονίκη 546 29</p>
    <p style="font-family:sans-serif;font-size:11px;color:#3d3a38;margin:0 0 6px;">
      <a href="https://tower15suites.gr" style="color:#6b5c4a;text-decoration:none;">tower15suites.gr</a>
    </p>
    <p style="font-family:sans-serif;font-size:10px;color:#2e2c2a;margin:0;letter-spacing:0.05em;">
      Designed &amp; Developed by <a href="https://webrya.com" style="color:#4a3f35;text-decoration:none;font-weight:bold;">Webrya</a>
    </p>
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
    // Βρες κρατήσεις που check-in = σε 2 μέρες AND δεν έχει σταλεί link
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + 2)
    const target = targetDate.toISOString().split('T')[0]

    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('check_in_date', target)
      .eq('checkin_link_sent', false)
      .not('guest_email', 'is', null)

    if (error) throw new Error(`Query error: ${JSON.stringify(error)}`)

    let sent = 0, errors = 0

    for (const reservation of reservations || []) {
      try {
        const checkinUrl = `${CHECKIN_PORTAL_URL}?reservation=${encodeURIComponent(reservation.reservation_code)}&lastname=${encodeURIComponent(reservation.guest_last_name || '')}`

        await sendEmail(
          reservation.guest_email,
          `📋 Online Check-In — Tower 15 Suites (${reservation.check_in_date})`,
          buildCheckinLinkEmail(reservation, checkinUrl)
        )

        await supabase
          .from('reservations')
          .update({
            checkin_link_sent: true,
            checkin_link_sent_at: new Date().toISOString(),
          })
          .eq('id', reservation.id)

        sent++
      } catch (e: any) {
        console.error(`Error for ${reservation.id}:`, e.message)
        errors++
      }
    }

    return new Response(
      JSON.stringify({
        message: `✓ Εστάλησαν ${sent} check-in links. Σφάλματα: ${errors}`,
        target_date: target,
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
