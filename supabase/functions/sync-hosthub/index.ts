import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const HOSTHUB_API_KEY = Deno.env.get('HOSTHUB_API_KEY')!
const HOSTHUB_BASE = 'https://app.hosthub.com/api/2019-03-01'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!
)

const hosthubHeaders = {
  'Authorization': HOSTHUB_API_KEY,
  'Content-Type': 'application/json',
}

const PROTECTED_STATUSES = new Set(['checked_in', 'checked_out'])

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const today = new Date().toISOString().split('T')[0]

    const { data: existingReservations, error: existingErr } = await supabase
      .from('reservations')
      .select('id, hosthub_id, status, codes_sent, codes_sent_at, checkin_link_sent, checkin_link_sent_at, archived_at')
      .not('hosthub_id', 'is', null)

    if (existingErr) throw new Error(`Fetch existing error: ${existingErr.message}`)

    const existingMap = new Map(
      (existingReservations || []).map((r: any) => [r.hosthub_id, r])
    )

    const rentalsRes = await fetch(`${HOSTHUB_BASE}/rentals`, { headers: hosthubHeaders })
    if (!rentalsRes.ok) throw new Error(`HostHub rentals error: ${rentalsRes.status} ${await rentalsRes.text()}`)
    const rentalsData = await rentalsRes.json()
    const rentals = rentalsData.data || []

    const { data: rooms } = await supabase.from('rooms').select('id, room_number, hosthub_name')

    const rentalResults = await Promise.all(
      rentals.map(async (rental: any) => {
        try {
          const rentalName = (rental.name || '').trim()
          let matchedRoom: any = null
          if (rooms) {
            matchedRoom = (rooms as any[]).find(r => r.hosthub_name === rentalName)
            if (!matchedRoom) matchedRoom = (rooms as any[]).find(r =>
              rentalName.startsWith(r.room_number + ' ') || rentalName === r.room_number
            )
            if (!matchedRoom) {
              const sorted = [...(rooms as any[])].sort((a, b) => b.room_number.length - a.room_number.length)
              matchedRoom = sorted.find(r => rentalName.startsWith(r.room_number))
            }
          }
          const eventsRes = await fetch(
            `${HOSTHUB_BASE}/rentals/${rental.id}/calendar-events?is_visible=true`,
            { headers: hosthubHeaders }
          )
          if (!eventsRes.ok) return { bookings: [], roomId: matchedRoom?.id, rentalName }
          const eventsData = await eventsRes.json()
          const bookings = (eventsData.data || []).filter((e: any) =>
            (e.type === 'CalendarEventBooking' || e.type === 'Booking') && e.date_to >= today
          )
          return { bookings, roomId: matchedRoom?.id || null, rentalName }
        } catch (e: any) {
          return { bookings: [], roomId: null, rentalName: rental.name }
        }
      })
    )

    let synced = 0, upsertErrors = 0
    const syncedHosthubIds: string[] = []

    for (const { bookings, roomId } of rentalResults) {
      for (const booking of bookings) {
        try {
          const hosthubId = booking.id?.toString()
          if (!hosthubId) continue
          syncedHosthubIds.push(hosthubId)

          const existing = (existingMap as any).get(hosthubId)
          const existingStatus = existing?.status || 'pending'
          const safeStatus = PROTECTED_STATUSES.has(existingStatus) ? existingStatus : 'pending'
          const nameParts = (booking.guest_name || '').split(' ')

          const { error } = await supabase.from('reservations').upsert(
            {
              hosthub_id: hosthubId,
              reservation_code: booking.reservation_id || hosthubId,
              room_id: roomId,
              guest_first_name: nameParts[0] || null,
              guest_last_name: nameParts.slice(1).join(' ') || null,
              guest_email: booking.guest_email || null,
              guest_phone: booking.guest_phone || null,
              check_in_date: booking.date_from,
              check_out_date: booking.date_to,
              platform: booking.source?.name || booking.source?.channel_type_code || 'hosthub',
              raw_data: booking,
              status: safeStatus,
              codes_sent: existing?.codes_sent ?? false,
              codes_sent_at: existing?.codes_sent_at ?? null,
              checkin_link_sent: existing?.checkin_link_sent ?? false,
              checkin_link_sent_at: existing?.checkin_link_sent_at ?? null,
              archived_at: null,
            },
            { onConflict: 'hosthub_id' }
          )
          if (error) { upsertErrors++; console.error(`Upsert error ${hosthubId}:`, error.message) }
          else synced++
        } catch (e: any) { upsertErrors++ }
      }
    }

    // SOFT DELETE — αρχειοθέτηση (όχι διαγραφή) κρατήσεων που έφυγαν από Hosthub
    let archived = 0, archiveErrors = 0

    if (syncedHosthubIds.length > 0) {
      const { data: allExisting } = await supabase
        .from('reservations')
        .select('id, hosthub_id, status, check_out_date')
        .not('hosthub_id', 'is', null)
        .is('archived_at', null)

      if (allExisting) {
        const toArchive = (allExisting as any[]).filter((r: any) =>
          !syncedHosthubIds.includes(r.hosthub_id) &&
          !PROTECTED_STATUSES.has(r.status) &&
          r.check_out_date >= today
        )
        for (const r of toArchive) {
          try {
            const { error } = await supabase
              .from('reservations')
              .update({ archived_at: new Date().toISOString() })
              .eq('id', r.id)
            if (error) archiveErrors++
            else archived++
          } catch { archiveErrors++ }
        }
      }
    }

    // Hard delete ΜΟΝΟ αρχειοθετημένες κρατήσεις > 3 μέρες παλιές
    const cleanDate = new Date()
    cleanDate.setDate(cleanDate.getDate() - 3)
    const cleanBefore = cleanDate.toISOString().split('T')[0]
    await supabase.from('reservations').delete()
      .lt('check_out_date', cleanBefore)
      .not('archived_at', 'is', null)
      .not('hosthub_id', 'is', null)

    const message = `✓ Synced: ${synced} | Archived: ${archived} | Errors: ${upsertErrors + archiveErrors}`
    return new Response(
      JSON.stringify({ message, rentals: rentals.length, synced, archived, upsert_errors: upsertErrors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})