import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = 'info@tower15suites.gr'
const FROM_NAME = 'Tower 15 Suites'

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

function buildCheckoutEmail(guest: any, room: any, reservation: any) {
  const guestName = guest.first_name || reservation.guest_first_name || 'Επισκέπτη'

  return `<!DOCTYPE html>
<html lang="el">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f0e0d;font-family:'Georgia',serif;color:#f5f0e8;">
<div style="max-width:560px;margin:0 auto;padding:20px;">

  <!-- Header -->
  <div style="text-align:center;padding:40px 0 30px;border-bottom:1px solid #3d3935;">
    <div style="display:inline-block;background:#8B5E2A;width:52px;height:52px;line-height:52px;text-align:center;font-family:monospace;font-weight:bold;color:white;font-size:15px;">T15</div>
    <h1 style="font-size:28px;font-weight:300;color:#f5f0e8;margin:16px 0 4px;">Tower 15 Suites</h1>
    <p style="color:#6b6460;font-size:13px;margin:0;font-family:sans-serif;text-transform:uppercase;letter-spacing:0.1em;">Υπενθύμιση Αναχώρησης</p>
  </div>

  <!-- Body -->
  <div style="padding:32px 0 20px;">
    <p style="font-size:17px;color:#d4bc98;margin:0 0 16px;font-weight:300;">Αγαπητέ/ή ${guestName},</p>
    <p style="font-size:14px;color:#8a7f78;line-height:1.8;margin:0;font-family:sans-serif;">
      Ευχόμαστε η διαμονή σας στο Tower 15 Suites να ήταν ευχάριστη! 
      Σας υπενθυμίζουμε ότι σήμερα είναι η ημέρα αναχώρησής σας.
    </p>
  </div>

  <!-- Checkout time highlight -->
  <div style="background:#1a1816;border:1px solid #3d3935;padding:32px;margin:8px 0 24px;text-align:center;">
    <div style="font-family:sans-serif;font-size:11px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:12px;">Ώρα Αναχώρησης</div>
    <div style="font-family:monospace;font-size:52px;color:#f5f0e8;font-weight:bold;line-height:1;">11:30</div>
    <div style="font-family:sans-serif;font-size:12px;color:#8a7f78;margin-top:8px;">Παρακαλούμε αποχωρήστε έως τις 11:30</div>
  </div>

  <!-- Checkout instructions -->
  <div style="background:#1a1816;border:1px solid #2d2b29;padding:24px;margin-bottom:24px;">
    <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:16px;">Οδηγίες Αναχώρησης</div>

    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;">
      <div style="background:#8B5E2A;color:white;font-family:monospace;font-size:11px;font-weight:bold;width:20px;height:20px;min-width:20px;line-height:20px;text-align:center;">1</div>
      <div style="font-family:sans-serif;font-size:13px;color:#8a7f78;line-height:1.6;">Αφήστε το κλειδί μέσα στο δωμάτιο ή επιστρέψτε το στον keylocker</div>
    </div>
    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;">
      <div style="background:#8B5E2A;color:white;font-family:monospace;font-size:11px;font-weight:bold;width:20px;height:20px;min-width:20px;line-height:20px;text-align:center;">2</div>
      <div style="font-family:sans-serif;font-size:13px;color:#8a7f78;line-height:1.6;">Κλείστε καλά την πόρτα του δωματίου</div>
    </div>
    <div style="display:flex;align-items:flex-start;gap:12px;">
      <div style="background:#8B5E2A;color:white;font-family:monospace;font-size:11px;font-weight:bold;width:20px;height:20px;min-width:20px;line-height:20px;text-align:center;">3</div>
      <div style="font-family:sans-serif;font-size:13px;color:#8a7f78;line-height:1.6;">Δεν χρειάζεται reception — η αποχώρηση είναι αυτόματη</div>
    </div>
  </div>

  <!-- Late checkout note -->
  <div style="background:#1a1410;border:1px solid #3d2e1e;padding:16px;margin-bottom:24px;">
    <p style="font-family:sans-serif;font-size:12px;color:#8a7060;margin:0;line-height:1.8;">
      🕐 Χρειάζεστε <strong style="color:#c09a68;">late check-out</strong>; Επικοινωνήστε μαζί μας άμεσα στο
      <a href="tel:+306949655349" style="color:#c09a68;text-decoration:none;font-weight:bold;">+30 6949655349</a>
      και θα κάνουμε ό,τι μπορούμε ανάλογα με διαθεσιμότητα.
    </p>
  </div>

  ${room ? `
  <!-- Room info -->
  <div style="background:#1a1816;border:1px solid #2d2b29;padding:16px;margin-bottom:24px;">
    <div style="display:flex;justify-content:space-between;">
      <span style="font-family:sans-serif;font-size:11px;color:#6b6460;">Δωμάτιο</span>
      <span style="font-family:monospace;font-size:14px;color:#f5f0e8;">${room.room_number}</span>
    </div>
  </div>
  ` : ''}

  <!-- Thank you -->
  <div style="text-align:center;padding:20px 0 28px;">
    <p style="font-family:'Georgia',serif;font-size:16px;color:#d4bc98;font-weight:300;margin:0 0 8px;">
      Σας ευχαριστούμε για την επιλογή σας!
    </p>
    <p style="font-family:sans-serif;font-size:13px;color:#6b6460;margin:0;">
      Ελπίζουμε να σας ξανασυναντήσουμε σύντομα στη Θεσσαλονίκη.
    </p>
  </div>

  <!-- Footer -->
  <div style="text-align:center;padding-top:24px;border-top:1px solid #2d2b29;">
    <p style="font-family:sans-serif;font-size:11px;color:#3d3a38;margin:0;">
      Tower 15 Suites · Ιωάννου Φαρμάκη 15, Θεσσαλονίκη
    </p>
    <p style="font-family:sans-serif;font-size:10px;color:#2e2c2a;margin:6px 0 0;letter-spacing:0.05em;">
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
    const today = new Date().toISOString().split('T')[0]

    // Βρες κρατήσεις με check_out = σήμερα
    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('*, rooms(*), guest_checkins(*)')
      .eq('check_out_date', today)

    if (error) throw new Error(`Query error: ${JSON.stringify(error)}`)

    let sent = 0, errors = 0

    for (const reservation of reservations || []) {
      try {
        const checkin = reservation.guest_checkins?.[0]
        // Προτίμησε email από online check-in, fallback στο HostHub email
        const email = checkin?.email || reservation.guest_email
        if (!email) continue

        const guestData = checkin || {
          first_name: reservation.guest_first_name,
          last_name: reservation.guest_last_name,
        }

        await sendEmail(
          email,
          `🏨 Καλή Αναχώρηση — Check-out έως 11:30 | Tower 15 Suites`,
          buildCheckoutEmail(guestData, reservation.rooms, reservation)
        )

        // Mark checkout reminder sent (optional — αν θέλεις να το track-άρεις)
        await supabase
          .from('reservations')
          .update({ status: 'checked_out' })
          .eq('id', reservation.id)
          .eq('status', 'checked_in') // μόνο αν ήταν checked_in

        sent++
      } catch (e: any) {
        console.error(`Error for ${reservation.id}:`, e.message)
        errors++
      }
    }

    return new Response(
      JSON.stringify({
        message: `✓ Εστάλησαν ${sent} checkout reminders. Σφάλματα: ${errors}`,
        checkout_date: today,
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
