import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { detectLanguage } from '../_shared/language.ts'

const HOSTHUB_API_KEY = Deno.env.get('HOSTHUB_API_KEY')!
const HOSTHUB_BASE    = 'https://app.hosthub.com/api/2019-03-01'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!
)

// ── Plain text platform message μετά από online check-in submit ───────────────
// Αν check-in ΣΗΜΕΡΑ: "Οι κωδικοί έχουν σταλεί στο email σας"
// Αν check-in ΑΛΛΗ ΜΕΡΑ: "Οι κωδικοί θα σταλούν στις 14:00 την ημέρα άφιξης"
function buildConfirmMessage(isCheckinToday: boolean, lang: 'el' | 'en'): string {
  if (lang === 'el') {
    return isCheckinToday
      ? `✅ Online Check-In Ολοκληρώθηκε\n\nΑγαπητέ/ή επισκέπτη,\n\nΤο online check-in σας ολοκληρώθηκε επιτυχώς!\n\n🗝️ Οι κωδικοί πρόσβασης (keylocker, είσοδος, WiFi) έχουν σταλεί στο email σας.\n\nΧρειάζεστε βοήθεια;\n📞 +30 6949655349\n\nΑνυπομονούμε να σας υποδεχτούμε!\nTower 15 Suites`
      : `✅ Online Check-In Ολοκληρώθηκε\n\nΑγαπητέ/ή επισκέπτη,\n\nΤο online check-in σας ολοκληρώθηκε επιτυχώς!\n\n🗝️ Οι κωδικοί πρόσβασης θα σταλούν αυτόματα στο email σας στις 14:00 της ημέρας άφιξής σας.\n\nΧρειάζεστε βοήθεια;\n📞 +30 6949655349\n\nΑνυπομονούμε να σας υποδεχτούμε!\nTower 15 Suites`
  } else {
    return isCheckinToday
      ? `✅ Online Check-In Complete\n\nDear guest,\n\nYour online check-in was completed successfully!\n\n🗝️ Your access codes (keylocker, entry, WiFi) have been sent to your email.\n\nNeed help?\n📞 +30 6949655349\n\nWe look forward to welcoming you!\nTower 15 Suites`
      : `✅ Online Check-In Complete\n\nDear guest,\n\nYour online check-in was completed successfully!\n\n🗝️ Your access codes will be automatically sent to your email at 14:00 on your arrival day.\n\nNeed help?\n📞 +30 6949655349\n\nWe look forward to welcoming you!\nTower 15 Suites`
  }
}

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
    const { reservationId, isCheckinToday } = body

    if (!reservationId) {
      return new Response(JSON.stringify({ error: 'reservationId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: reservation, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', reservationId)
      .single()

    if (error || !reservation) {
      return new Response(JSON.stringify({ error: 'Reservation not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Μόνο Booking.com + Airbnb υποστηρίζουν platform messaging
    const platformLower = (reservation.platform || '').toLowerCase()
    const supportsPlatformMsg = reservation.hosthub_id &&
      (platformLower.includes('booking') || platformLower.includes('airbnb'))

    if (!supportsPlatformMsg) {
      return new Response(
        JSON.stringify({ message: 'Platform does not support messaging — skipped', skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const lang = detectLanguage(
      reservation.guest_first_name || '',
      reservation.guest_last_name || ''
    )
    const today = new Date().toISOString().split('T')[0]
    const checkinIsToday = isCheckinToday ?? (reservation.check_in_date === today)

    const message = buildConfirmMessage(checkinIsToday, lang)
    const sent = await sendPlatformMessage(reservation.hosthub_id, message)

    console.log(`send-checkin-confirmation | reservation=${reservationId} | isToday=${checkinIsToday} | lang=${lang} | sent=${sent}`)

    return new Response(
      JSON.stringify({ message: sent ? '✓ Platform confirmation sent' : '✗ Platform message failed', sent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('FATAL:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
