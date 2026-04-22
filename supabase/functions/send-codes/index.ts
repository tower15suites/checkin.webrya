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

function buildEmailHtml(guest: any, room: any, reservation: any) {
  const checkInFormatted = new Date(reservation.check_in_date).toLocaleDateString('el-GR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const checkOutFormatted = new Date(reservation.check_out_date).toLocaleDateString('el-GR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const doorCodeHtml = (room.door_code || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')

  return `<!DOCTYPE html><html lang="el"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f0e0d;font-family:'Georgia',serif;color:#f5f0e8;">
<div style="max-width:560px;margin:0 auto;padding:20px;">
  <div style="text-align:center;padding:40px 0 30px;border-bottom:1px solid #3d3935;">
    <div style="display:inline-block;background:#8B5E2A;width:52px;height:52px;line-height:52px;text-align:center;font-family:monospace;font-weight:bold;color:white;font-size:15px;">T15</div>
    <h1 style="font-size:28px;font-weight:300;color:#f5f0e8;margin:16px 0 4px;">Tower 15 Suites</h1>
    <p style="color:#6b6460;font-size:13px;margin:0;font-family:sans-serif;text-transform:uppercase;letter-spacing:0.1em;">Κωδικοί Πρόσβασης</p>
  </div>
  <div style="padding:32px 0 20px;">
    <p style="font-size:17px;color:#d4bc98;margin:0 0 12px;font-weight:300;">Αγαπητέ/ή ${guest.first_name} ${guest.last_name},</p>
    <p style="font-size:14px;color:#8a7f78;line-height:1.8;margin:0;font-family:sans-serif;">Σας καλωσορίζουμε στο <strong style="color:#c09a68;">Tower 15 Suites</strong>! Παρακάτω θα βρείτε όλα τα στοιχεία πρόσβασης για τη διαμονή σας.</p>
  </div>
  <div style="background:#1a1816;border:1px solid #3d3935;padding:28px;margin:8px 0 24px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid #2d2b29;">
      <div>
        <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px;">Δωμάτιο</div>
        <div style="font-family:monospace;font-size:38px;color:#f5f0e8;font-weight:bold;line-height:1;">${room.room_number}</div>
        <div style="font-family:sans-serif;font-size:11px;color:#8a7f78;margin-top:4px;">Όροφος ${room.floor}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px;">Αριθμός Κράτησης</div>
        <div style="font-family:monospace;font-size:14px;color:#c09a68;">${reservation.reservation_code}</div>
      </div>
    </div>
    <div style="margin-bottom:16px;padding:16px;background:#0f0e0d;border-left:3px solid #8B5E2A;">
      <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:10px;">🔒 Κωδικός Εισόδου — Εξώπορτα Κτιρίου</div>
      <div style="font-family:sans-serif;font-size:14px;color:#d4bc98;line-height:2.0;">${doorCodeHtml}</div>
    </div>
    <div style="margin-bottom:16px;padding:16px;background:#0f0e0d;border-left:3px solid #8B5E2A;">
      <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">🗝️ Κωδικός Keylocker</div>
      <div style="font-family:monospace;font-size:34px;color:#f5f0e8;font-weight:bold;letter-spacing:0.25em;">${room.keylocker_code}</div>
    </div>
    <div style="padding:16px;background:#0f0e0d;border-left:3px solid #3d3935;">
      <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:10px;">📶 WiFi</div>
      <div><span style="font-family:sans-serif;font-size:11px;color:#6b6460;">Δίκτυο: </span><span style="font-family:monospace;font-size:15px;color:#c09a68;font-weight:bold;">${room.wifi_ssid}</span></div>
      <div><span style="font-family:sans-serif;font-size:11px;color:#6b6460;">Κωδικός: </span><span style="font-family:monospace;font-size:15px;color:#c09a68;font-weight:bold;">${room.wifi_password}</span></div>
    </div>
  </div>
  <div style="display:flex;gap:12px;margin-bottom:24px;">
    <div style="flex:1;background:#1a1816;border:1px solid #2d2b29;padding:16px;text-align:center;">
      <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;margin-bottom:6px;">Check-in</div>
      <div style="font-family:sans-serif;font-size:13px;color:#f5f0e8;">${checkInFormatted}</div>
      <div style="font-family:monospace;font-size:11px;color:#8B5E2A;margin-top:4px;">από 15:00</div>
    </div>
    <div style="flex:1;background:#1a1816;border:1px solid #2d2b29;padding:16px;text-align:center;">
      <div style="font-family:sans-serif;font-size:10px;color:#6b6460;text-transform:uppercase;margin-bottom:6px;">Check-out</div>
      <div style="font-family:sans-serif;font-size:13px;color:#f5f0e8;">${checkOutFormatted}</div>
      <div style="font-family:monospace;font-size:11px;color:#8B5E2A;margin-top:4px;">έως 11:30</div>
    </div>
  </div>
  <div style="background:#1a1816;border:1px solid #2d2b29;padding:16px;margin-bottom:28px;text-align:center;">
    <p style="font-family:sans-serif;font-size:12px;color:#6b6460;margin:0 0 8px;">Χρειάζεστε βοήθεια;</p>
    <a href="tel:+306949655349" style="font-family:monospace;font-size:16px;color:#c09a68;text-decoration:none;font-weight:bold;">+30 6949655349</a>
  </div>
  <div style="text-align:center;padding-top:24px;border-top:1px solid #2d2b29;">
    <p style="font-family:sans-serif;font-size:12px;color:#4a4744;margin:0 0 4px;">Tower 15 Suites — Ιωάννου Φαρμάκη 15, Θεσσαλονίκη 546 29</p>
    <p style="font-family:sans-serif;font-size:10px;color:#2e2c2a;margin:0;">Designed &amp; Developed by <a href="https://webrya.com" style="color:#4a3f35;text-decoration:none;font-weight:bold;">Webrya</a></p>
  </div>
</div></body></html>`
}

function isAfter1500(hour: number, minute: number): boolean {
  return hour > 15 || (hour === 15 && minute >= 0)
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    // FIX: force=true bypasses codes_sent check (χειροκίνητη αποστολή από admin)
    const forceResend = body.force === true
    let reservationIds: string[] = []

    if (body.reservationId) {
      if (forceResend) {
        // Force: στέλνουμε πάντα, ανεξαρτήτως ώρας ή codes_sent
        reservationIds = [body.reservationId]
      } else {
        const nowAthens = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Athens' }))
        const hourAthens = nowAthens.getHours()
        const minuteAthens = nowAthens.getMinutes()
        if (isAfter1500(hourAthens, minuteAthens)) {
          reservationIds = [body.reservationId]
        } else {
          console.log(`Check-in before 15:00 Athens (${hourAthens}:${minuteAthens}), deferring to cron`)
          return new Response(
            JSON.stringify({ message: 'Deferred to 14:00 cron — check-in before 15:00', deferred: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    } else {
      // Cron mode: στέλνουμε σε όλους με check_in = σήμερα + status=checked_in + codes_sent=false
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
        // FIX: αγνοεί codes_sent αν force=true
        if (!forceResend && reservation.codes_sent) { skipped++; continue }
        if (reservation.status !== 'checked_in') { skipped++; continue }

        const room = reservation.rooms
        if (!room) { errors++; continue }

        const checkin = reservation.guest_checkins?.[0]
        if (!checkin?.email) { errors++; continue }

        await sendEmail(
          checkin.email,
          `🗝️ Κωδικοί Δωματίου ${room.room_number} — Tower 15 Suites`,
          buildEmailHtml({ first_name: checkin.first_name, last_name: checkin.last_name }, room, reservation)
        )

        await supabase.from('reservations').update({
          codes_sent: true,
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
      JSON.stringify({ message: `✓ Εστάλησαν ${sent} email. Παραλείφθηκαν: ${skipped}. Σφάλματα: ${errors}`, sent, skipped, errors, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
