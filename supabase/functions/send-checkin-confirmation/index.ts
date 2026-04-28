import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const HOSTHUB_API_KEY = Deno.env.get('HOSTHUB_API_KEY')!
const HOSTHUB_BASE    = 'https://app.hosthub.com/api/2019-03-01'

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

// ── Platform message επιβεβαίωσης online check-in ────────────────────────────
// Στέλνεται αμέσως μετά το submit του online check-in από τον guest.
// Ενημερώνει ότι:
//   α) το check-in ολοκληρώθηκε επιτυχώς
//   β) οι κωδικοί θα σταλούν στο email στις 14:00 (ή αμέσως αν check-in σήμερα)
function buildConfirmationMessage(reservation: any, checkin: any, isToday: boolean, lang: 'el' | 'en'): string {
  const firstName = checkin.first_name || reservation.guest_first_name || ''

  if (lang === 'el') {
    return `✅ Online Check-In Ολοκληρώθηκε

Αγαπητέ/ή ${firstName},

Το online check-in σας έχει καταχωρηθεί επιτυχώς!

${isToday
  ? '🗝️ Οι κωδικοί πρόσβασης (keylocker & WiFi) έχουν σταλεί στο email σας.'
  : '🗝️ Οι κωδικοί πρόσβασης (keylocker & WiFi) θα σταλούν στο email σας στις 14:00 της ημέρας άφιξής σας.'}

📧 Ελέγξτε τα εισερχόμενά σας (και τον φάκελο SPAM).

Για οποιαδήποτε βοήθεια:
📞 +30 6949655349

Ανυπομονούμε να σας υποδεχτούμε!
Tower 15 Suites`
  } else {
    return `✅ Online Check-In Completed

Dear ${firstName},

Your online check-in has been successfully submitted!

${isToday
  ? '🗝️ Your access codes (keylocker & WiFi) have been sent to your email.'
  : '🗝️ Your access codes (keylocker & WiFi) will be sent to your email at 14:00 on your arrival day.'}

📧 Please check your inbox (and your SPAM folder).

For any assistance:
📞 +30 6949655349

We look forward to welcoming you!
Tower 15 Suites`
  }
}

// ── Send via Hosthub Messages API ─────────────────────────────────────────────
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

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const { reservationId } = body

    if (!reservationId) {
      return new Response(JSON.stringify({ error: 'reservationId required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Φόρτωσε reservation + guest_checkin
    const { data: reservation, error } = await supabase
      .from('reservations')
      .select('*, guest_checkins(*)')
      .eq('id', reservationId)
      .single()

    if (error || !reservation) {
      return new Response(JSON.stringify({ error: 'Reservation not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Μόνο Booking.com + Airbnb υποστηρίζουν platform messages μέσω Hosthub
    const platformLower = (reservation.platform || '').toLowerCase()
    const supportsPlatform = reservation.hosthub_id &&
      (platformLower.includes('booking') || platformLower.includes('airbnb'))

    if (!supportsPlatform) {
      return new Response(
        JSON.stringify({ message: 'Platform does not support messaging — skipped', sent: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const checkin  = reservation.guest_checkins?.[0] || {}
    const lang     = detectLanguage(checkin.first_name || reservation.guest_first_name || '', checkin.last_name || reservation.guest_last_name || '')
    const today    = new Date().toISOString().split('T')[0]
    const isToday  = reservation.check_in_date === today

    const message  = buildConfirmationMessage(reservation, checkin, isToday, lang)
    const sent     = await sendPlatformMessage(reservation.hosthub_id, message)

    return new Response(
      JSON.stringify({ message: sent ? '✓ Confirmation message sent' : '✗ Platform message failed', sent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
