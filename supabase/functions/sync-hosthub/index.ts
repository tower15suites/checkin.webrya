import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const HOSTHUB_API_KEY = Deno.env.get('HOSTHUB_API_KEY')!
const HOSTHUB_BASE   = 'https://app.hosthub.com/api/2019-03-01'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SERVICE_ROLE_KEY')!
)

const hosthubHeaders = {
  'Authorization': HOSTHUB_API_KEY,
  'Content-Type':  'application/json',
}

// checked_in: μην το σβήνεις από diff — ο guest είναι μέσα
const PROTECTED_FROM_DIFF = new Set(['checked_in'])

// ── Helper: σβήσε reservation + guest_checkins (manual cascade) ──────────────
async function safeDelete(id: string, hosthubId: string): Promise<boolean> {
  try {
    // 1. guest_checkins πρώτα (FK χωρίς CASCADE)
    await supabase.from('guest_checkins').delete().eq('reservation_id', id)
    // 2. reservation
    const { error } = await supabase.from('reservations').delete().eq('id', id)
    if (error) { console.error(`Delete reservation failed ${hosthubId}:`, error.message); return false }
    console.log(`Deleted hosthub_id=${hosthubId}`)
    return true
  } catch (e: any) {
    console.error(`safeDelete exception ${hosthubId}:`, e.message)
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
    const now   = new Date()
    const today = now.toISOString().split('T')[0]

    // 11:30 Athens = UTC+3 → 08:30 UTC
    const utcHour = now.getUTCHours()
    const utcMin  = now.getUTCMinutes()
    const afterCheckout = utcHour > 8 || (utcHour === 8 && utcMin >= 30)
    console.log(`Sync start | today=${today} | UTC=${utcHour}:${String(utcMin).padStart(2,'0')} | afterCheckout=${afterCheckout}`)

    // ── Step 1: Existing reservations για preservation ────────────────────────
    const { data: existing, error: exErr } = await supabase
      .from('reservations')
      .select('id, hosthub_id, status, codes_sent, codes_sent_at, checkin_link_sent, checkin_link_sent_at')
      .not('hosthub_id', 'is', null)
    if (exErr) throw new Error(`Fetch existing: ${exErr.message}`)

    const existingMap = new Map<string, any>(
      (existing || []).map((r: any) => [r.hosthub_id, r])
    )

    // ── Step 2: Rentals από HostHub ───────────────────────────────────────────
    const rentalsRes = await fetch(`${HOSTHUB_BASE}/rentals`, { headers: hosthubHeaders })
    if (!rentalsRes.ok) throw new Error(`HostHub rentals: ${rentalsRes.status} ${await rentalsRes.text()}`)
    const rentals = (await rentalsRes.json()).data || []
    console.log(`HostHub rentals: ${rentals.length}`)

    // ── Step 3: Rooms ─────────────────────────────────────────────────────────
    const { data: rooms } = await supabase.from('rooms').select('id, room_number, hosthub_name')

    // ── Step 4: Calendar events παράλληλα ─────────────────────────────────────
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

    // ── Step 5: Upsert με status/flags preservation ───────────────────────────
    let synced = 0, upsertErrors = 0
    const syncedIds: string[] = []

    for (const { bookings, roomId } of rentalResults) {
      for (const b of bookings) {
        try {
          const hid = b.id?.toString()
          if (!hid) continue
          syncedIds.push(hid)

          const ex     = existingMap.get(hid)
          const status = ex?.status === 'checked_in' ? 'checked_in' : 'pending'
          // Support both separate first/last name fields (manual bookings) and combined guest_name
          const firstName = b.guest_first_name || (b.guest_name || '').split(' ')[0] || null
          const lastName  = b.guest_last_name  || (b.guest_name || '').split(' ').slice(1).join(' ') || null

          const { error } = await supabase.from('reservations').upsert({
            hosthub_id:          hid,
            reservation_code:    b.reservation_id || hid,
            room_id:             roomId,
            guest_first_name:    firstName,
            guest_last_name:     lastName,
            guest_email:         b.guest_email || null,
            guest_phone:         b.guest_phone || null,
            check_in_date:       b.date_from,
            check_out_date:      b.date_to,
            platform:            b.source?.name || b.source?.channel_type_code || 'hosthub',
            raw_data:            b,
            status,
            codes_sent:          ex?.codes_sent        ?? false,
            codes_sent_at:       ex?.codes_sent_at     ?? null,
            checkin_link_sent:   ex?.checkin_link_sent  ?? false,
            checkin_link_sent_at:ex?.checkin_link_sent_at ?? null,
          }, { onConflict: 'hosthub_id' })

          if (error) { console.error(`Upsert ${hid}:`, error.message); upsertErrors++ }
          else synced++
        } catch (e: any) { upsertErrors++ }
      }
    }

    // ── Step 6: Diff-delete — ακυρωμένες ΜΕΛΛΟΝΤΙΚΕΣ κρατήσεις ──────────────
    // (σημερινά checkouts τα χειρίζεται το Step 7)
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
          r.check_out_date > today   // strictly future — σήμερα στο Step 7
        )
        console.log(`Diff-delete: ${toDelete.length} cancelled future reservations`)
        for (const r of toDelete) {
          const ok = await safeDelete(r.id, r.hosthub_id)
          if (ok) deleted++; else deleteErrors++
        }
      }
    }

    // ── Step 7: Cleanup checkouts ─────────────────────────────────────────────
    let cleaned = 0

    // (α) Χθες και παλαιότερα → πάντα
    const { data: old } = await supabase
      .from('reservations')
      .select('id, hosthub_id')
      .not('hosthub_id', 'is', null)
      .lt('check_out_date', today)   // πριν σήμερα

    for (const r of (old || [])) {
      const ok = await safeDelete(r.id, r.hosthub_id)
      if (ok) cleaned++
    }

    // (β) Σημερινά checkouts → μόνο μετά τις 11:30 Athens (08:30 UTC)
    if (afterCheckout) {
      const { data: todayOuts } = await supabase
        .from('reservations')
        .select('id, hosthub_id')
        .not('hosthub_id', 'is', null)
        .eq('check_out_date', today)

      if (todayOuts?.length) {
        console.log(`Cleaning ${todayOuts.length} today checkouts (after 11:30 Athens)`)
        for (const r of todayOuts) {
          const ok = await safeDelete(r.id, r.hosthub_id)
          if (ok) cleaned++
        }
      }
    } else {
      console.log('Today checkouts kept (before 11:30 Athens)')
    }

    const msg = `✓ Synced:${synced} | Deleted:${deleted} | Cleaned:${cleaned} | Errors:${upsertErrors + deleteErrors}`
    console.log(msg)

    return new Response(
      JSON.stringify({ message: msg, rentals: rentals.length, synced, deleted, cleaned, upsert_errors: upsertErrors, delete_errors: deleteErrors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('FATAL:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})