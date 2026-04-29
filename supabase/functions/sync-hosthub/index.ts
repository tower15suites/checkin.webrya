import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const HOSTHUB_API_KEY   = Deno.env.get('HOSTHUB_API_KEY')!
const HOSTHUB_BASE      = 'https://app.hosthub.com/api/2019-03-01'
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY  = Deno.env.get('SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const hosthubHeaders = {
  'Authorization': HOSTHUB_API_KEY,
  'Content-Type':  'application/json',
}

// checked_in: προστατεύεται από diff-delete (ο guest είναι μέσα)
const PROTECTED_FROM_DIFF = new Set(['checked_in'])

// ── Σβήσε reservation + guest_checkins (manual cascade) ──────────────────────
async function safeDelete(id: string, hosthubId: string): Promise<boolean> {
  try {
    await supabase.from('guest_checkins').delete().eq('reservation_id', id)
    const { error } = await supabase.from('reservations').delete().eq('id', id)
    if (error) { console.error(`Delete reservation failed ${hosthubId}:`, error.message); return false }
    console.log(`Deleted hosthub_id=${hosthubId}`)
    return true
  } catch (e: any) {
    console.error(`safeDelete exception ${hosthubId}:`, e.message)
    return false
  }
}

// ── Στέλνει check-in link αμέσως μετά νέα κράτηση ────────────────────────────
// Ασφαλές να καλείται — η send-checkin-link ελέγχει checkin_link_sent=false
// πριν στείλει, οπότε δεν υπάρχει κίνδυνος duplicate.
async function triggerCheckinLink(reservationId: string): Promise<void> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-checkin-link`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ reservationId }),
    })
    const data = await res.json()
    console.log(`Check-in link for ${reservationId}:`, data.message || data.error || 'ok')
  } catch (e: any) {
    console.error(`triggerCheckinLink failed ${reservationId}:`, e.message)
  }
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const now   = new Date()
    const today = now.toISOString().split('T')[0]
    // Χρησιμοποιούμε Intl API για σωστή ώρα Athens (UTC+2 χειμώνας / UTC+3 καλοκαίρι)
    const athensHour = parseInt(new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Athens', hour: 'numeric', hour12: false,
    }).format(now))
    const afterCheckout = athensHour >= 11
    console.log(`Sync start | today=${today} | Athens=${athensHour}:00 | afterCheckout=${afterCheckout}`)

    // Step 1: Existing reservations
    const { data: existing, error: exErr } = await supabase
      .from('reservations')
      .select('id, hosthub_id, status, codes_sent, codes_sent_at, checkin_link_sent, checkin_link_sent_at, platform_message_sent, platform_message_sent_at, guest_email')
      .not('hosthub_id', 'is', null)
    if (exErr) throw new Error(`Fetch existing: ${exErr.message}`)

    const existingMap = new Map<string, any>(
      (existing || []).map((r: any) => [r.hosthub_id, r])
    )

    // Step 2: Rentals από HostHub
    const rentalsRes = await fetch(`${HOSTHUB_BASE}/rentals`, { headers: hosthubHeaders })
    if (!rentalsRes.ok) throw new Error(`HostHub rentals: ${rentalsRes.status} ${await rentalsRes.text()}`)
    const rentals = (await rentalsRes.json()).data || []
    console.log(`HostHub rentals: ${rentals.length}`)

    // Step 3: Rooms
    const { data: rooms } = await supabase.from('rooms').select('id, room_number, hosthub_name')

    // Step 4: Calendar events παράλληλα
    const rentalResults = await Promise.all(rentals.map(async (rental: any) => {
      try {
        const name = (rental.name || '').trim()
        let room: any = null
        if (rooms) {
          room = (rooms as any[]).find(r => r.hosthub_name === name)
          if (!room) room = (rooms as any[]).find(r => name.startsWith(r.room_number + ' ') || name === r.room_number)
          if (!room) {
            const sorted = [...(rooms as any[])].sort((a, b) => b.room_number.length - a.room_number.length)
            room = sorted.find(r => name.startsWith(r.room_number))
          }
        }
        const evRes = await fetch(`${HOSTHUB_BASE}/rentals/${rental.id}/calendar-events?is_visible=true`, { headers: hosthubHeaders })
        if (!evRes.ok) return { bookings: [], roomId: room?.id, name }
        const bookings = ((await evRes.json()).data || []).filter((e: any) =>
          (e.type === 'CalendarEventBooking' || e.type === 'Booking') && e.date_to >= today
        )
        return { bookings, roomId: room?.id || null, name }
      } catch (e: any) {
        console.error(`Rental ${rental.id} error:`, e.message)
        return { bookings: [], roomId: null, name: rental.name }
      }
    }))

    // Step 5: Upsert + αποστολή check-in link σε νέες/updated κρατήσεις
    let synced = 0, upsertErrors = 0, linksSent = 0
    const syncedIds: string[] = []

    for (const { bookings, roomId } of rentalResults) {
      for (const b of bookings) {
        try {
          const hid = b.id?.toString()
          if (!hid) continue
          syncedIds.push(hid)

          const ex         = existingMap.get(hid)
          const isNew      = !ex
          const status     = ex?.status === 'checked_in' ? 'checked_in' : 'pending'
          const firstName  = b.guest_first_name || (b.guest_name || '').split(' ')[0] || null
          const lastName   = b.guest_last_name  || (b.guest_name || '').split(' ').slice(1).join(' ') || null
          const guestEmail = b.guest_email || null

          // ΚΡΙΣΙΜΟ: Preserve sent flags — ποτέ μην τα μηδενίζεις στο upsert
          const { data: upserted, error } = await supabase.from('reservations').upsert({
            hosthub_id:               hid,
            reservation_code:         b.reservation_id || hid,
            room_id:                  roomId,
            guest_first_name:         firstName,
            guest_last_name:          lastName,
            guest_email:              guestEmail,
            guest_phone:              b.guest_phone || null,
            check_in_date:            b.date_from,
            check_out_date:           b.date_to,
            platform:                 b.source?.name || b.source?.channel_type_code || 'hosthub',
            raw_data:                 b,
            status,
            codes_sent:               ex?.codes_sent               ?? false,
            codes_sent_at:            ex?.codes_sent_at             ?? null,
            checkin_link_sent:        ex?.checkin_link_sent         ?? false,
            checkin_link_sent_at:     ex?.checkin_link_sent_at      ?? null,
            platform_message_sent:    ex?.platform_message_sent     ?? false,
            platform_message_sent_at: ex?.platform_message_sent_at  ?? null,
          }, { onConflict: 'hosthub_id' })
            .select('id, checkin_link_sent')
            .single()

          if (error) { console.error(`Upsert ${hid}:`, error.message); upsertErrors++; continue }
          synced++

          // Στέλνει check-in link αμέσως αν:
          // α) Νέα κράτηση + έχει email + check_in >= σήμερα
          // β) Υπάρχουσα κράτηση που μόλις απέκτησε email
          // send-checkin-link ελέγχει checkin_link_sent → ποτέ duplicate
          const needsLink = upserted &&
            !upserted.checkin_link_sent &&
            guestEmail &&
            b.date_from >= today &&
            (isNew || (!ex?.guest_email && guestEmail))

          if (needsLink) {
            await triggerCheckinLink(upserted.id)
            linksSent++
          }
        } catch (e: any) { upsertErrors++ }
      }
    }

    // Step 6: Diff-delete — ακυρωμένες μελλοντικές κρατήσεις
    let deleted = 0, deleteErrors = 0

    if (syncedIds.length > 0) {
      const { data: all } = await supabase
        .from('reservations')
        .select('id, hosthub_id, status, check_out_date')
        .not('hosthub_id', 'is', null)

      if (all) {
        const toDelete = (all as any[]).filter((r: any) =>
          !syncedIds.includes(r.hosthub_id) &&
          !PROTECTED_FROM_DIFF.has(r.status) &&
          r.check_out_date > today
        )
        console.log(`Diff-delete: ${toDelete.length} cancelled future reservations`)
        for (const r of toDelete) {
          const ok = await safeDelete(r.id, r.hosthub_id)
          if (ok) deleted++; else deleteErrors++
        }
      }
    }

    // Step 7: Cleanup παλαιών checkouts
    let cleaned = 0
    const { data: old } = await supabase
      .from('reservations')
      .select('id, hosthub_id')
      .not('hosthub_id', 'is', null)
      .lt('check_out_date', today)

    for (const r of (old || [])) {
      const ok = await safeDelete(r.id, r.hosthub_id)
      if (ok) cleaned++
    }

    if (afterCheckout) {
      const { data: todayOuts } = await supabase
        .from('reservations')
        .select('id, hosthub_id')
        .not('hosthub_id', 'is', null)
        .eq('check_out_date', today)

      if (todayOuts?.length) {
        console.log(`Cleaning ${todayOuts.length} today checkouts (after 11:00 Athens)`)
        for (const r of todayOuts) {
          const ok = await safeDelete(r.id, r.hosthub_id)
          if (ok) cleaned++
        }
      }
    } else {
      console.log('Today checkouts kept (before 11:00 Athens)')
    }

    const msg = `✓ Synced:${synced} | Links:${linksSent} | Deleted:${deleted} | Cleaned:${cleaned} | Errors:${upsertErrors + deleteErrors}`
    console.log(msg)

    return new Response(
      JSON.stringify({ message: msg, rentals: rentals.length, synced, links_sent: linksSent, deleted, cleaned, upsert_errors: upsertErrors, delete_errors: deleteErrors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('FATAL:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
