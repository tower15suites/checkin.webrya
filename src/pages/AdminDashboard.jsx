import { useState, useEffect } from 'react'
import { useAdminAuth } from '../hooks/useAdminAuth.jsx'
import { supabase } from '../lib/supabase.js'

const TABS = ['Σήμερα', 'Ημερολόγιο', 'Κρατήσεις', 'Δωμάτια', 'Check-ins', 'Ρυθμίσεις']

const ROOMS = ['01','101','102','103','201','202','203','301','302','303','401','402','403','501','502','601','701']

const PLATFORM_COLORS = {
  'Booking.com': '#003580',
  'booking.com': '#003580',
  'Airbnb': '#FF5A5F',
  'airbnb': '#FF5A5F',
  'Vrbo': '#3D6F8E',
  'vrbo': '#3D6F8E',
  'Direct': '#2D7D46',
  'direct': '#2D7D46',
  'hosthub': '#8B5E2A',
}

function getPlatformColor(platform) {
  if (!platform) return '#4a4744'
  return PLATFORM_COLORS[platform] || '#6b5c4a'
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatDate(d) {
  // Use local date parts to avoid UTC offset shifting the date back by 1 day (Greece = UTC+3)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDate(str) {
  return new Date(str + 'T00:00:00')
}

export default function AdminDashboard() {
  const { logout } = useAdminAuth()
  const [tab, setTab] = useState(0)
  const [rooms, setRooms] = useState([])
  const [reservations, setReservations] = useState([])
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncLoading, setSyncLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [calendarStart, setCalendarStart] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const [selectedRes, setSelectedRes] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState({})
  const [settings, setSettings] = useState({})
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [showSecrets, setShowSecrets] = useState({})
  const [actionResult, setActionResult] = useState('')
  const [actionLoading, setActionLoading] = useState('')

  const DAYS_SHOWN = 30

  useEffect(() => { loadAll(); loadSettings() }, [])

  async function loadSettings() {
    try {
      const { data } = await supabase.from('app_settings').select('*').order('key')
      if (data) {
        const map = {}
        data.forEach(s => { map[s.key] = { ...s } })
        setSettings(map)
      }
    } catch(e) { console.warn('app_settings not found:', e.message) }
  }

  function updateSettingLocal(key, value) {
    setSettings(prev => ({ ...prev, [key]: { ...prev[key], value } }))
  }

  async function saveAllSettings() {
    setSettingsLoading(true)
    try {
      const updates = Object.values(settings).map((s) =>
        supabase.from('app_settings').update({ value: s.value }).eq('key', s.key)
      )
      await Promise.all(updates)
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    } catch(e) { console.error('Save settings error:', e) }
    setSettingsLoading(false)
  }

  async function runAction(name, url, body = {}) {
    setActionLoading(name)
    setActionResult('')
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${url}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      setActionResult(data.message || data.error || JSON.stringify(data))
      if (url === 'sync-hosthub') await loadAll()
    } catch(e) { setActionResult('✗ ' + e.message) }
    setActionLoading('')
    setTimeout(() => setActionResult(''), 8000)
  }

  async function loadAll() {
    setLoading(true)
    const [{ data: r }, { data: res }, { data: ci }] = await Promise.all([
      supabase.from('rooms').select('*').order('room_number'),
      supabase.from('reservations').select('*, rooms(room_number,floor,wifi_ssid,wifi_password,door_code,keylocker_code)').gte('check_out_date', (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}` })()).order('check_in_date'),
      supabase.from('guest_checkins').select('*, reservations(reservation_code, rooms(room_number))').order('created_at', { ascending: false }).limit(50),
    ])
    setRooms(r || [])
    setReservations(res || [])
    setCheckins(ci || [])
    setLoading(false)
  }

  // ── Calendar helpers ────────────────────────────────────────
  const calDays = Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(calendarStart, i))

  function getReservationForRoomDay(roomNumber, date) {
    const dateStr = formatDate(date)
    return reservations.find(res => {
      const room = res.rooms?.room_number || res.room_number
      return room === roomNumber &&
        res.check_in_date <= dateStr &&
        res.check_out_date > dateStr
    })
  }

  function getReservationSpan(res, startDate, totalDays) {
    const resStart = parseDate(res.check_in_date)
    const resEnd = parseDate(res.check_out_date)
    const calEnd = addDays(startDate, totalDays)
    const visStart = resStart < startDate ? startDate : resStart
    const visEnd = resEnd > calEnd ? calEnd : resEnd
    const startCol = Math.floor((visStart - startDate) / 86400000)
    const span = Math.floor((visEnd - visStart) / 86400000)
    return { startCol, span }
  }

  // ── Edit reservation ────────────────────────────────────────
  function openEdit(res) {
    setSelectedRes(res)
    setEditData({
      guest_first_name: res.guest_first_name || '',
      guest_last_name: res.guest_last_name || '',
      guest_email: res.guest_email || '',
      guest_phone: res.guest_phone || '',
      check_in_date: res.check_in_date || '',
      check_out_date: res.check_out_date || '',
      status: res.status || 'pending',
      notes: res.notes || '',
      room_id: res.room_id || '',
    })
    setEditMode(true)
  }

  async function saveEdit() {
    const { error } = await supabase
      .from('reservations')
      .update(editData)
      .eq('id', selectedRes.id)
    if (!error) {
      setMsg('✓ Αποθηκεύτηκε!')
      setEditMode(false)
      setSelectedRes(null)
      await loadAll()
    } else {
      setMsg('✗ Σφάλμα αποθήκευσης')
    }
    setTimeout(() => setMsg(''), 3000)
  }

  async function syncHosthub() {
    setSyncLoading(true)
    setMsg('Συγχρονισμός...')
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-hosthub`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      })
      const data = await res.json()
      setMsg(data.message || '✓ Sync ολοκληρώθηκε')
      await loadAll()
    } catch { setMsg('✗ Σφάλμα sync') }
    setSyncLoading(false)
    setTimeout(() => setMsg(''), 5000)
  }

  async function sendCodes(reservationId, force = false) {
    setMsg(force ? 'Χειροκίνητη αποστολή κωδικών...' : 'Αποστολή κωδικών...')
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-codes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reservationId, force }),
      })
      const data = await res.json()
      setMsg(data.message || '✓ Email στάλθηκε!')
      await loadAll()
    } catch { setMsg('✗ Σφάλμα αποστολής') }
    setTimeout(() => setMsg(''), 5000)
  }

  async function deleteCheckin(id) {
    if (!confirm('Διαγραφή check-in; Είστε σίγουροι;')) return
    const { error } = await supabase.from('guest_checkins').delete().eq('id', id)
    if (!error) {
      setCheckins(cs => cs.filter(c => c.id !== id))
      setMsg('✓ Διαγράφηκε')
      setTimeout(() => setMsg(''), 2000)
    }
  }

  async function toggleRoomReady(room) {
    await supabase.from('rooms').update({ is_ready: !room.is_ready }).eq('id', room.id)
    setRooms(rs => rs.map(r => r.id === room.id ? { ...r, is_ready: !r.is_ready } : r))
  }

  async function updateRoomCodes(roomId, field, value) {
    await supabase.from('rooms').update({ [field]: value }).eq('id', roomId)
    setMsg('✓ Αποθηκεύτηκε')
    setTimeout(() => setMsg(''), 2000)
  }

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const todayArrivals   = reservations.filter(r => r.check_in_date === today)
  const todayCheckouts  = reservations.filter(r => r.check_out_date === today)
  const todayStaying    = reservations.filter(r => r.check_in_date < today && r.check_out_date > today)
  const todayReady      = rooms.filter(r => r.is_ready).length

  // Day names in Greek
  const dayNames = ['Κυρ','Δευ','Τρί','Τετ','Πέμ','Παρ','Σάβ']
  const monthNames = ['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος','Μάιος','Ιούνιος','Ιούλιος','Αύγουστος','Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος']

  return (
    <div className="min-h-dvh bg-stone-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-stone-800 px-4 py-3 flex items-center justify-between sticky top-0 bg-stone-950/95 backdrop-blur z-50">
        <div className="flex items-center gap-3">
          <img src="/logo-tower15.jpg" alt="Tower 15 Suites" className="h-9 w-auto" />
        </div>
        <div className="flex items-center gap-3">
          {msg && <span className="text-xs text-brand-300 font-mono hidden sm:block animate-pulse">{msg}</span>}
          <button onClick={logout} className="text-stone-500 hover:text-white text-xs transition-colors">Έξοδος</button>
        </div>
      </header>

      {/* Stats */}
      <div className="border-b border-stone-800 px-4 py-3 grid grid-cols-4 gap-0">
        <div className="text-center cursor-pointer hover:bg-stone-900/50 py-1 rounded transition-colors" onClick={() => setTab(0)}>
          <div className="text-2xl font-mono text-white">{todayArrivals.length}</div>
          <div className="text-stone-500 text-xs">Αφίξεις</div>
        </div>
        <div className="text-center border-x border-stone-800 cursor-pointer hover:bg-stone-900/50 py-1 rounded transition-colors" onClick={() => setTab(0)}>
          <div className="text-2xl font-mono text-sky-400">{todayStaying.length}</div>
          <div className="text-stone-500 text-xs">Διαμένουν</div>
        </div>
        <div className="text-center border-r border-stone-800 cursor-pointer hover:bg-stone-900/50 py-1 rounded transition-colors" onClick={() => setTab(0)}>
          <div className="text-2xl font-mono text-amber-400">{todayCheckouts.length}</div>
          <div className="text-stone-500 text-xs">Αναχωρούν</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono text-brand-300">{reservations.length}</div>
          <div className="text-stone-500 text-xs">Σύνολο</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-stone-800 flex overflow-x-auto">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-4 py-3 text-xs uppercase tracking-widest font-body whitespace-nowrap transition-colors border-b-2 flex-shrink-0 ${
              tab === i ? 'border-brand-500 text-white' : 'border-transparent text-stone-500 hover:text-stone-300'
            }`} style={{ letterSpacing: '0.1em' }}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-stone-500 text-sm animate-pulse">Φόρτωση...</div>
        ) : (
          <>
            {/* ══ ΣΗΜΕΡΑ TAB ══ */}
            {tab === 0 && (
              <div className="max-w-2xl mx-auto p-4 space-y-5 pb-16">

                {/* ── Αφίξεις σήμερα ── */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">✈️</span>
                    <h3 className="font-display text-lg text-white">Αφίξεις σήμερα</h3>
                    <span className="ml-auto font-mono text-sm text-white bg-stone-800 px-2 py-0.5">{todayArrivals.length}</span>
                  </div>
                  {todayArrivals.length === 0 ? (
                    <div className="text-stone-600 text-sm text-center py-6 border border-stone-800">Δεν υπάρχουν αφίξεις σήμερα</div>
                  ) : (
                    <div className="space-y-2">
                      {todayArrivals.map(res => (
                        <div key={res.id} className="card flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="font-mono text-2xl text-white font-bold w-12 text-center">{res.rooms?.room_number || '—'}</div>
                            <div>
                              <div className="text-white text-sm font-medium">{res.guest_first_name} {res.guest_last_name}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-xs px-1.5 py-0.5 font-mono ${res.status === 'checked_in' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' : 'bg-amber-900/30 text-amber-400 border border-amber-800/50'}`}>
                                  {res.status === 'checked_in' ? '✓ CHECKED IN' : 'PENDING'}
                                </span>
                                {res.platform && <span className="text-stone-600 text-xs">{res.platform}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="text-right text-xs text-stone-500 shrink-0">
                            <div>έως {res.check_out_date}</div>
                            {res.guest_phone && <a href={`tel:${res.guest_phone}`} className="text-brand-400 hover:text-brand-300 block mt-0.5">{res.guest_phone}</a>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Αναχωρήσεις σήμερα ── */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🚪</span>
                    <h3 className="font-display text-lg text-white">Αναχωρήσεις σήμερα</h3>
                    <span className="ml-auto font-mono text-sm text-white bg-stone-800 px-2 py-0.5">{todayCheckouts.length}</span>
                  </div>
                  {todayCheckouts.length === 0 ? (
                    <div className="text-stone-600 text-sm text-center py-6 border border-stone-800">Δεν υπάρχουν αναχωρήσεις σήμερα</div>
                  ) : (
                    <div className="space-y-2">
                      {todayCheckouts.map(res => (
                        <div key={res.id} className="card flex items-center justify-between gap-3 opacity-80">
                          <div className="flex items-center gap-3">
                            <div className="font-mono text-2xl text-stone-400 font-bold w-12 text-center">{res.rooms?.room_number || '—'}</div>
                            <div>
                              <div className="text-stone-300 text-sm font-medium">{res.guest_first_name} {res.guest_last_name}</div>
                              <div className="text-stone-600 text-xs mt-0.5">Check-out έως 11:30</div>
                            </div>
                          </div>
                          {res.guest_phone && (
                            <a href={`tel:${res.guest_phone}`} className="text-brand-400 text-xs shrink-0">{res.guest_phone}</a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Διαμένουν σήμερα ── */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🏨</span>
                    <h3 className="font-display text-lg text-white">Διαμένουν σήμερα</h3>
                    <span className="ml-auto font-mono text-sm text-white bg-stone-800 px-2 py-0.5">{todayStaying.length}</span>
                  </div>
                  {todayStaying.length === 0 ? (
                    <div className="text-stone-600 text-sm text-center py-6 border border-stone-800">Δεν υπάρχουν διαμένοντες</div>
                  ) : (
                    <div className="space-y-2">
                      {todayStaying.map(res => (
                        <div key={res.id} className="card flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="font-mono text-2xl text-sky-400 font-bold w-12 text-center">{res.rooms?.room_number || '—'}</div>
                            <div>
                              <div className="text-white text-sm font-medium">{res.guest_first_name} {res.guest_last_name}</div>
                              <div className="text-stone-500 text-xs mt-0.5">
                                {res.check_in_date} → {res.check_out_date}
                                {res.platform && <span className="ml-2 text-stone-600">{res.platform}</span>}
                              </div>
                            </div>
                          </div>
                          {res.guest_phone && (
                            <a href={`tel:${res.guest_phone}`} className="text-brand-400 text-xs shrink-0">{res.guest_phone}</a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* ══ CALENDAR TAB ══ */}
            {tab === 1 && (
              <div className="flex flex-col h-full">
                {/* Calendar Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 bg-stone-900/50 sticky top-0 z-10">
                  <button onClick={() => setCalendarStart(d => addDays(d, -30))}
                    className="text-stone-400 hover:text-white px-3 py-1 border border-stone-700 hover:border-stone-500 text-xs transition-colors">
                    ← Προηγ.
                  </button>
                  <div className="text-center">
                    <div className="font-display text-lg text-white">
                      {monthNames[calendarStart.getMonth()]} {calendarStart.getFullYear()}
                    </div>
                    <div className="text-stone-500 text-xs">
                      {formatDate(calendarStart)} → {formatDate(addDays(calendarStart, DAYS_SHOWN - 1))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setCalendarStart(new Date(new Date().setDate(1)))}
                      className="text-stone-400 hover:text-white px-3 py-1 border border-stone-700 hover:border-brand-500 text-xs transition-colors">
                      Σήμερα
                    </button>
                    <button onClick={() => setCalendarStart(d => addDays(d, 30))}
                      className="text-stone-400 hover:text-white px-3 py-1 border border-stone-700 hover:border-stone-500 text-xs transition-colors">
                      Επόμ. →
                    </button>
                  </div>
                </div>

                {/* Calendar Grid - scrollable horizontally */}
                <div className="overflow-auto flex-1">
                  <div style={{ minWidth: `${180 + DAYS_SHOWN * 36}px` }}>
                    {/* Day headers */}
                    <div className="flex sticky top-0 z-20 bg-stone-950 border-b border-stone-800">
                      <div className="w-44 flex-shrink-0 border-r border-stone-800 px-2 py-2">
                        <span className="text-xs text-stone-600 uppercase tracking-widest">Δωμάτιο</span>
                      </div>
                      {calDays.map((day, i) => {
                        const isToday = formatDate(day) === today
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6
                        return (
                          <div key={i} style={{ width: 36, flexShrink: 0 }}
                            className={`text-center py-1 border-r border-stone-800/50 ${isToday ? 'bg-brand-500/20' : isWeekend ? 'bg-stone-900' : ''}`}>
                            <div className={`text-xs font-mono ${isToday ? 'text-brand-300' : 'text-stone-500'}`}>{day.getDate()}</div>
                            <div className={`text-xs ${isToday ? 'text-brand-400' : 'text-stone-700'}`}>{dayNames[day.getDay()]}</div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Room rows */}
                    {ROOMS.map(roomNum => {
                      const roomData = rooms.find(r => r.room_number === roomNum)
                      // Find all reservations for this room in view
                      const roomReservations = reservations.filter(res => {
                        const rn = res.rooms?.room_number
                        const calEnd = formatDate(addDays(calendarStart, DAYS_SHOWN))
                        return rn === roomNum &&
                          res.check_out_date > formatDate(calendarStart) &&
                          res.check_in_date < calEnd
                      })

                      return (
                        <div key={roomNum} className="flex border-b border-stone-800/60 hover:bg-stone-900/30 relative" style={{ height: 44 }}>
                          {/* Room label */}
                          <div className="w-44 flex-shrink-0 border-r border-stone-800 flex items-center gap-2 px-2">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${roomData?.is_ready ? 'bg-emerald-500' : 'bg-stone-600'}`} />
                            <span className="font-mono text-sm text-white">{roomNum}</span>
                            {roomData && (
                              <span className="text-stone-600 text-xs truncate">{roomData.wifi_ssid}</span>
                            )}
                          </div>

                          {/* Day cells background */}
                          <div className="flex flex-1 relative">
                            {calDays.map((day, i) => {
                              const isToday = formatDate(day) === today
                              const isWeekend = day.getDay() === 0 || day.getDay() === 6
                              return (
                                <div key={i} style={{ width: 36, flexShrink: 0 }}
                                  className={`border-r border-stone-800/30 h-full ${isToday ? 'bg-brand-500/10' : isWeekend ? 'bg-stone-900/40' : ''}`}
                                />
                              )
                            })}

                            {/* Reservation blocks - absolutely positioned */}
                            {roomReservations.map(res => {
                              const { startCol, span } = getReservationSpan(res, calendarStart, DAYS_SHOWN)
                              if (span <= 0) return null
                              const color = getPlatformColor(res.platform)
                              const guestName = `${res.guest_first_name || ''} ${res.guest_last_name || ''}`.trim()
                              return (
                                <div
                                  key={res.id}
                                  onClick={() => openEdit(res)}
                                  style={{
                                    position: 'absolute',
                                    left: startCol * 36 + 2,
                                    width: span * 36 - 4,
                                    top: 4,
                                    height: 36,
                                    backgroundColor: color,
                                    borderRadius: 3,
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    zIndex: 5,
                                  }}
                                  className="hover:brightness-110 transition-all flex items-center px-2 gap-1"
                                >
                                  <span className="text-white text-xs font-body truncate font-medium">
                                    {guestName || res.reservation_code}
                                  </span>
                                  {res.status === 'checked_in' && (
                                    <span className="text-white/70 text-xs flex-shrink-0">✓</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Legend */}
                <div className="border-t border-stone-800 px-4 py-2 flex gap-4 flex-wrap">
                  {Object.entries(PLATFORM_COLORS).filter(([k]) => !k.includes('.')).map(([platform, color]) => (
                    <div key={platform} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-stone-500 text-xs">{platform}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-stone-500 text-xs">Έτοιμο</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-stone-600" />
                    <span className="text-stone-500 text-xs">Εκκρεμές</span>
                  </div>
                </div>
              </div>
            )}

            {/* ══ RESERVATIONS TAB ══ */}
            {tab === 2 && (
              <div className="max-w-2xl mx-auto p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-display text-xl text-white">Κρατήσεις</h2>
                  <button onClick={syncHosthub} disabled={syncLoading}
                    className="btn-ghost text-xs py-2 px-3">
                    {syncLoading ? '⟳ Sync...' : '⟳ Sync Hosthub'}
                  </button>
                </div>
                {reservations.map(res => (
                  <ReservationCard key={res.id} reservation={res}
                    onEdit={() => openEdit(res)}
                    onSendCodes={() => sendCodes(res.id, res.guest_checkins?.length === 0)}
                  />
                ))}
              </div>
            )}

            {/* ══ ROOMS TAB ══ */}
            {tab === 3 && (
              <div className="max-w-2xl mx-auto p-4 space-y-3">
                <h2 className="font-display text-xl text-white mb-4">Κατάσταση Δωματίων</h2>
                {rooms.map(room => (
                  <RoomCard key={room.id} room={room}
                    onToggleReady={() => toggleRoomReady(room)}
                    onUpdateCode={updateRoomCodes}
                  />
                ))}
              </div>
            )}

            {/* ══ CHECKINS TAB ══ */}
            {tab === 4 && (
              <div className="max-w-2xl mx-auto p-4">
                <h2 className="font-display text-xl text-white mb-4">Online Check-Ins</h2>
                {checkins.length === 0 && (
                  <div className="card text-center text-stone-500 py-10">Δεν υπάρχουν check-ins ακόμα.</div>
                )}
                <div className="space-y-3">
                  {checkins.map(ci => <CheckInCard key={ci.id} checkin={ci} onDelete={() => deleteCheckin(ci.id)} />)}
                </div>
              </div>
            )}

            {/* ══ SETTINGS TAB ══ */}
            {tab === 5 && (
              <div className="max-w-2xl mx-auto p-4 space-y-5 pb-16">

                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl text-white">Ρυθμίσεις Συστήματος</h2>
                  <button
                    onClick={saveAllSettings}
                    disabled={settingsLoading}
                    className="btn-primary text-sm px-5 py-2"
                  >
                    {settingsLoading ? '⏳ Αποθήκευση...' : settingsSaved ? '✓ Αποθηκεύτηκε!' : '💾 Αποθήκευση'}
                  </button>
                </div>

                {/* ── API Keys ── */}
                <div className="card space-y-4">
                  <div className="text-xs text-brand-400 uppercase tracking-widest font-mono">🔑 API Keys</div>
                  {[
                    { key: 'hosthub_api_key', label: 'HostHub API Key', placeholder: 'hh_live_...' },
                    { key: 'resend_api_key', label: 'Resend API Key', placeholder: 're_...' },
                  ].map(({ key, label, placeholder }) => {
                    const s = settings[key]
                    const visible = showSecrets[key]
                    return (
                      <div key={key}>
                        <label className="label">{label}</label>
                        <div className="flex gap-2">
                          <input
                            className="input-field font-mono text-sm flex-1"
                            type={visible ? 'text' : 'password'}
                            value={s?.value || ''}
                            placeholder={placeholder}
                            onChange={e => updateSettingLocal(key, e.target.value)}
                          />
                          <button
                            type="button"
                            className="btn-ghost px-3"
                            onClick={() => setShowSecrets(p => ({ ...p, [key]: !p[key] }))}
                          >{visible ? '🙈' : '👁️'}</button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* ── Email ── */}
                <div className="card space-y-4">
                  <div className="text-xs text-brand-400 uppercase tracking-widest font-mono">📧 Email Αποστολέα</div>
                  {[
                    { key: 'from_email', label: 'From Email' },
                    { key: 'from_name', label: 'From Name' },
                    { key: 'contact_phone', label: 'Τηλέφωνο (εμφανίζεται στα emails)' },
                    { key: 'contact_email', label: 'Email Επικοινωνίας' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="label">{label}</label>
                      <input
                        className="input-field"
                        value={settings[key]?.value || ''}
                        onChange={e => updateSettingLocal(key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                {/* ── Check-In/Out ── */}
                <div className="card space-y-4">
                  <div className="text-xs text-brand-400 uppercase tracking-widest font-mono">🏨 Check-In / Check-Out</div>
                  {[
                    { key: 'checkin_portal_url', label: 'Check-In Portal URL' },
                    { key: 'checkin_time', label: 'Ώρα Check-In' },
                    { key: 'checkout_time', label: 'Ώρα Check-Out' },
                    { key: 'checkin_link_days_before', label: 'Ημέρες πριν για link (default: 2)' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="label">{label}</label>
                      <input
                        className="input-field"
                        value={settings[key]?.value || ''}
                        onChange={e => updateSettingLocal(key, e.target.value)}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="label">Check-In Portal Link</label>
                    <div className="flex gap-2">
                      <div className="bg-stone-950 border border-stone-700 px-3 py-2 font-mono text-xs text-brand-300 break-all flex-1 rounded-none">
                        {window.location.origin}/checkin
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/checkin`); setActionResult('✓ Αντιγράφηκε!'); setTimeout(() => setActionResult(''), 2000) }}
                        className="btn-ghost px-3 text-xs"
                      >📋</button>
                    </div>
                  </div>
                </div>

                {/* ── Actions ── */}
                <div className="card space-y-4">
                  <div className="text-xs text-brand-400 uppercase tracking-widest font-mono">⚡ Ενέργειες</div>

                  {actionResult && (
                    <div className={`px-3 py-2 text-xs font-mono border ${actionResult.startsWith('✗') ? 'border-red-800 bg-red-950/30 text-red-400' : 'border-emerald-800 bg-emerald-950/30 text-emerald-400'}`}>
                      {actionResult}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="label">Sync HostHub</div>
                      <p className="text-stone-600 text-xs">Sync + διαγραφή ακυρωμένων</p>
                      <button
                        onClick={() => runAction('sync', 'sync-hosthub')}
                        disabled={!!actionLoading}
                        className="btn-ghost w-full text-xs py-2"
                      >{actionLoading === 'sync' ? '⏳...' : '🔄 Εκτέλεση'}</button>
                    </div>
                    <div className="space-y-1">
                      <div className="label">Test Send-Codes</div>
                      <p className="text-stone-600 text-xs">Εκτέλεση χωρίς αποστολή</p>
                      <button
                        onClick={() => runAction('test-email', 'send-codes', { test: true })}
                        disabled={!!actionLoading}
                        className="btn-ghost w-full text-xs py-2"
                      >{actionLoading === 'test-email' ? '⏳...' : '📧 Test'}</button>
                    </div>
                    <div className="space-y-1">
                      <div className="label">Send Check-In Links</div>
                      <p className="text-stone-600 text-xs">Αποστολή link D-2 τώρα</p>
                      <button
                        onClick={() => runAction('send-link', 'send-checkin-link')}
                        disabled={!!actionLoading}
                        className="btn-ghost w-full text-xs py-2"
                      >{actionLoading === 'send-link' ? '⏳...' : '🔗 Εκτέλεση'}</button>
                    </div>
                    <div className="space-y-1">
                      <div className="label">Φόρτωση Ρυθμίσεων</div>
                      <p className="text-stone-600 text-xs">Ανανέωση από DB</p>
                      <button
                        onClick={loadSettings}
                        disabled={!!actionLoading}
                        className="btn-ghost w-full text-xs py-2"
                      >🔃 Reload</button>
                    </div>
                  </div>
                </div>

                {/* ── WiFi ── */}
                <div className="card">
                  <div className="text-xs text-brand-400 uppercase tracking-widest font-mono mb-3">📶 WiFi ανά Όροφο</div>
                  <div className="space-y-1">
                    {[0,1,2,3,4,5,6,7].map(floor => (
                      <div key={floor} className="flex justify-between text-xs py-1.5 border-b border-stone-800 last:border-0">
                        <span className="text-stone-400">Όροφος {floor}</span>
                        <span className="font-mono text-brand-300">{floor}TOWER15</span>
                        <span className="font-mono text-stone-500">TOWER15!!!</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-center py-2">
                  <p className="text-stone-700 text-xs">Designed &amp; Developed by <a href="https://webrya.com" target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-stone-400">Webrya</a></p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ══ EDIT MODAL ══ */}
      {editMode && selectedRes && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={e => { if (e.target === e.currentTarget) { setEditMode(false); setSelectedRes(null) } }}>
          <div className="bg-stone-900 border border-stone-700 w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 sticky top-0 bg-stone-900 z-10">
              <div>
                <div className="font-display text-lg text-white">Επεξεργασία Κράτησης</div>
                <div className="font-mono text-xs text-brand-300">{selectedRes.reservation_code}</div>
              </div>
              <button onClick={() => { setEditMode(false); setSelectedRes(null) }}
                className="text-stone-400 hover:text-white text-xl transition-colors">×</button>
            </div>

            <div className="p-5 space-y-4">
              {/* Guest info */}
              <div>
                <div className="text-xs text-stone-500 uppercase tracking-widest mb-3">Στοιχεία Επισκέπτη</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Όνομα</label>
                    <input className="input-field" value={editData.guest_first_name}
                      onChange={e => setEditData(d => ({ ...d, guest_first_name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Επίθετο</label>
                    <input className="input-field" value={editData.guest_last_name}
                      onChange={e => setEditData(d => ({ ...d, guest_last_name: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="label">Email</label>
                    <input className="input-field text-sm" type="email" value={editData.guest_email}
                      onChange={e => setEditData(d => ({ ...d, guest_email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Τηλέφωνο</label>
                    <input className="input-field text-sm" type="tel" value={editData.guest_phone}
                      onChange={e => setEditData(d => ({ ...d, guest_phone: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div>
                <div className="text-xs text-stone-500 uppercase tracking-widest mb-3">Ημερομηνίες</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Check-in</label>
                    <input className="input-field font-mono" type="date" value={editData.check_in_date}
                      onChange={e => setEditData(d => ({ ...d, check_in_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Check-out</label>
                    <input className="input-field font-mono" type="date" value={editData.check_out_date}
                      onChange={e => setEditData(d => ({ ...d, check_out_date: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Room assignment */}
              <div>
                <label className="label">Δωμάτιο</label>
                <select className="input-field" value={editData.room_id}
                  onChange={e => setEditData(d => ({ ...d, room_id: e.target.value }))}>
                  <option value="">— Μη ανατεθειμένο —</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>Δωμάτιο {r.room_number} (Όροφος {r.floor})</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="label">Status</label>
                <select className="input-field" value={editData.status}
                  onChange={e => setEditData(d => ({ ...d, status: e.target.value }))}>
                  <option value="pending">Pending</option>
                  <option value="checked_in">Checked In</option>
                  <option value="checked_out">Checked Out</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="label">Σημειώσεις Admin</label>
                <textarea className="input-field resize-none" rows={3}
                  placeholder="Εσωτερικές σημειώσεις..."
                  value={editData.notes}
                  onChange={e => setEditData(d => ({ ...d, notes: e.target.value }))} />
              </div>

              {/* Room info (read-only) */}
              {selectedRes.rooms && (
                <div className="bg-stone-950 border border-stone-800 p-3 space-y-2">
                  <div className="text-xs text-stone-500 uppercase tracking-widest">Κωδικοί Δωματίου</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-stone-500">WiFi: </span>
                      <span className="font-mono text-brand-300">{selectedRes.rooms.wifi_ssid}</span>
                    </div>
                    <div>
                      <span className="text-stone-500">Pass: </span>
                      <span className="font-mono text-stone-300">{selectedRes.rooms.wifi_password}</span>
                    </div>
                    <div>
                      <span className="text-stone-500">Keylocker: </span>
                      <span className="font-mono text-white font-bold">{selectedRes.rooms.keylocker_code}</span>
                    </div>
                    <div>
                      <span className="text-stone-500">Πλατφόρμα: </span>
                      <span className="text-stone-300">{selectedRes.platform}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Self check-in status banner */}
              {(() => {
                const hasCheckin = selectedRes.guest_checkins?.length > 0
                const codesSent  = selectedRes.codes_sent
                return (
                  <div className={`p-3 border text-xs font-sans flex items-center gap-2 ${
                    hasCheckin
                      ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
                      : 'bg-amber-950 border-amber-800 text-amber-300'
                  }`}>
                    <span>{hasCheckin ? '✅' : '⚠️'}</span>
                    <span>
                      {hasCheckin
                        ? `Self Check-In ολοκληρώθηκε${codesSent ? ' · Κωδικοί στάλθηκαν ✓' : ' · Κωδικοί δεν έχουν σταλεί ακόμα'}`
                        : `Ο πελάτης ΔΕΝ έχει κάνει Online Check-In${codesSent ? ' · Κωδικοί στάλθηκαν χειροκίνητα ✓' : ''}`
                      }
                    </span>
                  </div>
                )
              })()}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                {selectedRes.guest_checkins?.length > 0 ? (
                  <button onClick={() => sendCodes(selectedRes.id)} className="btn-ghost flex-1 text-xs py-2.5">
                    📧 {selectedRes.codes_sent ? 'Ξαναποστολή Κωδικών' : 'Αποστολή Κωδικών'}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (window.confirm('Ο πελάτης δεν έχει κάνει Online Check-In. Να σταλούν οι κωδικοί χειροκίνητα;'))
                        sendCodes(selectedRes.id, true)
                    }}
                    className="btn-ghost flex-1 text-xs py-2.5 border-amber-800 text-amber-300 hover:text-amber-100"
                  >
                    ⚡ Χειροκίνητη Αποστολή Κωδικών
                  </button>
                )}
                <button onClick={() => {
                  const link = `${window.location.origin}/checkin?reservation=${selectedRes.reservation_code}`
                  navigator.clipboard.writeText(link)
                  setMsg('✓ Link αντιγράφηκε!')
                  setTimeout(() => setMsg(''), 2000)
                }} className="btn-ghost flex-1 text-xs py-2.5">
                  🔗 Copy Check-in Link
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setEditMode(false); setSelectedRes(null) }}
                  className="btn-ghost flex-1">Ακύρωση</button>
                <button onClick={saveEdit} className="btn-primary flex-1">Αποθήκευση</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile toast */}
      {msg && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-stone-800 border border-stone-700 px-4 py-2 text-xs text-white font-mono z-50 sm:hidden">
          {msg}
        </div>
      )}
    </div>
  )
}

// ── Room Card ──────────────────────────────────────────────────
function RoomCard({ room, onToggleReady, onUpdateCode }) {
  const [editing, setEditing] = useState(false)
  const [doorCode, setDoorCode] = useState(room.door_code || '')
  const [keyCode, setKeyCode] = useState(room.keylocker_code || '')
  function save() {
    onUpdateCode(room.id, 'door_code', doorCode)
    onUpdateCode(room.id, 'keylocker_code', keyCode)
    setEditing(false)
  }
  return (
    <div className={`border transition-colors ${room.is_ready ? 'border-emerald-800 bg-emerald-950/20' : 'border-stone-800 bg-stone-900/30'}`}>
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <div className="font-mono text-xl font-bold text-white w-10">{room.room_number}</div>
          <div>
            <div className="text-xs text-stone-400">Όροφος {room.floor} · {room.wifi_ssid}</div>
            {!editing && <div className="text-xs text-stone-500 font-mono mt-0.5">🔑 {room.keylocker_code}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(!editing)}
            className="text-stone-400 hover:text-white text-xs px-2 py-1 border border-stone-700 hover:border-stone-500 transition-colors">✏️</button>
          <button onClick={onToggleReady}
            className={`text-xs px-3 py-1.5 font-mono transition-colors ${
              room.is_ready
                ? 'bg-emerald-800/50 text-emerald-300 border border-emerald-700 hover:bg-red-900/50 hover:text-red-300 hover:border-red-700'
                : 'bg-stone-800 text-stone-400 border border-stone-700 hover:bg-emerald-900/50 hover:text-emerald-300 hover:border-emerald-700'
            }`}>
            {room.is_ready ? '✓ ΕΤΟΙΜΟ' : 'ΕΚΚΡΕΜΕΣ'}
          </button>
        </div>
      </div>
      {editing && (
        <div className="px-3 pb-3 pt-2 border-t border-stone-800 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-stone-500 block mb-1">Keylocker</label>
              <input className="input-field text-sm font-mono py-2" value={keyCode} onChange={e => setKeyCode(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-stone-500 block mb-1">Κωδ. Εξωπόρτας</label>
              <textarea
                className="input-field text-sm py-2 resize-none"
                rows={4}
                value={doorCode}
                onChange={e => setDoorCode(e.target.value)}
                placeholder={"Step 1: Press the Key Symbol (🗝️) at the bottom left.\nStep 2: Enter the code: 2021\nStep 3: Press the Key Symbol (🗝️) again to confirm."}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="btn-ghost text-xs py-1.5 flex-1">Ακύρωση</button>
            <button onClick={save} className="btn-primary text-xs py-1.5 flex-1">Αποθήκευση</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Reservation Card ───────────────────────────────────────────
function ReservationCard({ reservation: res, onEdit, onSendCodes }) {
  const statusColors = { pending: 'badge-pending', checked_in: 'badge-ready', checked_out: 'text-stone-500 border border-stone-700 text-xs font-mono px-2 py-0.5' }
  return (
    <div className="card space-y-3 cursor-pointer hover:border-stone-600 transition-colors" onClick={onEdit}>
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-white text-sm">{res.reservation_code}</div>
          <div className="text-stone-400 text-xs mt-0.5">{res.guest_first_name} {res.guest_last_name}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={statusColors[res.status] || 'badge-pending'}>
            {res.status === 'checked_in' ? 'CHECKED IN' : res.status === 'checked_out' ? 'OUT' : 'PENDING'}
          </span>
          {res.rooms && <span className="text-stone-500 text-xs font-mono">Δωμ. {res.rooms.room_number}</span>}
        </div>
      </div>
      <div className="flex justify-between text-xs text-stone-500">
        <span>Check-in: <span className="text-stone-300">{res.check_in_date}</span></span>
        <span>Check-out: <span className="text-stone-300">{res.check_out_date}</span></span>
      </div>
      <div className="flex gap-2 pt-1" onClick={e => e.stopPropagation()}>
        <button onClick={onSendCodes} className="btn-ghost text-xs py-1.5 flex-1">📧 Κωδικοί</button>
        <button onClick={onEdit} className="btn-ghost text-xs py-1.5 flex-1">✏️ Επεξεργασία</button>
      </div>
    </div>
  )
}

// ── CheckIn Card ───────────────────────────────────────────────
function CheckInCard({ checkin: ci, onDelete }) {
  return (
    <div className="card space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-white font-body text-sm">{ci.first_name} {ci.last_name}</div>
          <div className="text-stone-400 text-xs">{ci.email} · {ci.phone}</div>
        </div>
        <div className="flex items-start gap-2">
          <div className="text-right">
            <div className="text-xs font-mono text-brand-300">{ci.reservations?.rooms?.room_number || '—'}</div>
            <div className="text-stone-600 text-xs">{new Date(ci.created_at).toLocaleDateString('el-GR')}</div>
          </div>
          <button onClick={onDelete}
            className="text-stone-600 hover:text-red-400 transition-colors text-lg leading-none mt-0.5"
            title="Διαγραφή">×</button>
        </div>
      </div>
      <div className="flex gap-2 text-xs">
        <span className="text-stone-500">{ci.id_type}:</span>
        <span className="font-mono text-stone-300">{ci.id_number}</span>
        {ci.nationality && <span className="text-stone-600">· {ci.nationality}</span>}
      </div>
      {ci.photo_url && <div className="text-xs text-emerald-500">📎 Φωτογραφία αποθηκεύτηκε</div>}
    </div>
  )
}