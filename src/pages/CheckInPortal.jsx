import { useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

const STEPS = ['Αναγνώριση', 'Στοιχεία', 'Ταυτοποίηση', 'Φωτογραφία', 'Ολοκλήρωση']

export default function CheckInPortal() {
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reservation, setReservation] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [useCamera, setUseCamera] = useState(false)
  const [gdprConsent, setGdprConsent] = useState(false)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  // Step 0 - lookup
  const [lookup, setLookup] = useState({
    code: searchParams.get('reservation') || searchParams.get('code') || '',
    lastname: searchParams.get('lastname') || '',
  })

  // Step 1-2 - guest data
  const [guest, setGuest] = useState({
    first_name: '', last_name: '', phone: '', email: '',
    nationality: 'Ελλάδα',
    id_type: 'national_id',
    id_number: '', afm: '',
  })

  const progress = ((step) / (STEPS.length - 1)) * 100

  // ── STEP 0: Lookup reservation ──────────────────────────────
  async function handleLookup(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let query
      if (lookup.code) {
        const code = lookup.code.trim()
        query = supabase
          .from('reservations')
          .select('*, rooms(*)')
          .or(`reservation_code.ilike.${code},hosthub_id.ilike.${code}`)
      } else if (lookup.lastname) {
        query = supabase
          .from('reservations')
          .select('*, rooms(*)')
          .ilike('guest_last_name', `%${lookup.lastname.trim()}%`)
      } else {
        setError('Συμπληρώστε αριθμό κράτησης ή επίθετο.')
        setLoading(false)
        return
      }

      const { data, error: err } = await query.single()
      if (err || !data) {
        setError('Δε βρέθηκε κράτηση. Ελέγξτε τα στοιχεία σας.')
      } else {
        // ── Έλεγχος: αν έχει ήδη γίνει check-in, σταμάτα ──
        if (data.status === 'checked_in' && data.codes_sent) {
          setError('Το check-in για αυτή την κράτηση έχει ήδη ολοκληρωθεί. Ελέγξτε το email σας για τους κωδικούς.')
          setLoading(false)
          return
        }

        setReservation(data)
        setGuest(g => ({
          ...g,
          first_name: data.guest_first_name || '',
          last_name: data.guest_last_name || '',
          email: data.guest_email || '',
          phone: data.guest_phone || '',
        }))
        setStep(1)
      }
    } catch {
      setError('Σφάλμα σύνδεσης. Δοκιμάστε ξανά.')
    }
    setLoading(false)
  }

  // ── STEP 1: Guest details ────────────────────────────────────
  function handleGuestNext(e) {
    e.preventDefault()
    setError('')
    const { first_name, last_name, phone, email } = guest
    if (!first_name || !last_name || !phone || !email) {
      setError('Συμπληρώστε όλα τα υποχρεωτικά πεδία.')
      return
    }
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Συμπληρώστε έγκυρη διεύθυνση email.')
      return
    }
    setStep(2)
  }

  // ── STEP 2: ID details ───────────────────────────────────────
  function handleIdNext(e) {
    e.preventDefault()
    setError('')
    if (!guest.id_number) {
      setError('Συμπληρώστε αριθμό ταυτότητας ή διαβατηρίου.')
      return
    }
    setStep(3)
  }

  // ── STEP 3: Photo ────────────────────────────────────────────
  const handleFileDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files[0] || e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Ανεβάστε μόνο εικόνα.'); return }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setError('')
  }, [])

  async function startCamera() {
    setUseCamera(true)
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }, audio: false,
        })
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch {
        setError('Δεν επιτράπηκε πρόσβαση στην κάμερα. Ανεβάστε φωτογραφία.')
        setUseCamera(false)
      }
    }, 100)
  }

  function capturePhoto() {
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
    canvas.toBlob(blob => {
      const file = new File([blob], 'id-photo.jpg', { type: 'image/jpeg' })
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(blob))
      stopCamera()
      setError('')
    }, 'image/jpeg', 0.9)
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    setUseCamera(false)
  }

  // ── STEP 3 → Submit ─────────────────────────────────────────
  async function handleSubmit() {
    if (!photoFile) { setError('Ανεβάστε φωτογραφία ταυτότητας.'); return }
    if (!gdprConsent) { setError('Απαιτείται η αποδοχή των Όρων Χρήσης και της Πολιτικής Απορρήτου για να συνεχίσετε.'); return }
    setError('')
    setLoading(true)

    try {
      // 1. Upload photo
      const ext = photoFile.name.split('.').pop()
      const filename = `${reservation.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('guest-photos')
        .upload(filename, photoFile, { upsert: true })
      if (uploadErr) throw uploadErr

      // 2. Insert check-in record
      const { error: insertErr } = await supabase
        .from('guest_checkins')
        .insert({
          reservation_id: reservation.id,
          first_name: guest.first_name,
          last_name: guest.last_name,
          phone: guest.phone,
          email: guest.email,
          id_type: guest.id_type,
          id_number: guest.id_number,
          afm: guest.afm || null,
          nationality: guest.nationality,
          photo_url: filename,
          gdpr_consent: true,
          gdpr_consent_at: new Date().toISOString(),
        })
      if (insertErr) throw insertErr

      // 3. Update reservation status → checked_in
      const { error: updateErr } = await supabase
        .from('reservations')
        .update({ status: 'checked_in' })
        .eq('id', reservation.id)
      if (updateErr) throw updateErr

      // 4. ✅ Immediate send: στέλνουμε κωδικούς ΑΜΕΣΩΣ αν check-in date = σήμερα
      //    (αν είναι μελλοντική κράτηση, ο daily cron θα στείλει την ημέρα)
      const today = new Date().toISOString().split('T')[0]
      const isToday = reservation.check_in_date === today

      if (isToday) {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

          const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-codes`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${anonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reservationId: reservation.id }),
          })

          if (!sendRes.ok) {
            console.warn('send-codes warning:', await sendRes.text())
          }
        } catch (sendErr) {
          console.warn('send-codes non-fatal error:', sendErr)
        }
      }

      setStep(4)
    } catch (err) {
      console.error(err)
      setError('Σφάλμα αποθήκευσης. Δοκιμάστε ξανά.')
    }
    setLoading(false)
  }

  const room = reservation?.rooms
  const isCheckinToday = reservation?.check_in_date === new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-dvh bg-stone-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-stone-800/60 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center">
          <img src="/logo-tower15.jpg" alt="Tower 15 Suites" className="h-10 w-auto" />
        </div>
        {step > 0 && step < 4 && (
          <div className="text-stone-500 font-mono text-xs">
            {step}/{STEPS.length - 1}
          </div>
        )}
      </header>

      {/* Progress bar */}
      {step > 0 && step < 4 && (
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      <main className="flex-1 flex flex-col items-center justify-center px-5 py-10">

        {/* ══ STEP 0: LOOKUP ══ */}
        {step === 0 && (
          <div className="w-full max-w-sm animate-in">
            <div className="text-center mb-10">
              <h1 className="font-display text-4xl font-light text-white mb-2">Καλώς ήρθατε</h1>
              <div className="divider" />
              <p className="text-stone-400 text-sm font-body">
                Συμπληρώστε τον αριθμό κράτησής σας<br />ή το επίθετό σας για να ξεκινήσετε.
              </p>
            </div>

            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="label">Αριθμός Κράτησης</label>
                <input
                  className="input-field"
                  placeholder="πχ. BK-12345678"
                  value={lookup.code}
                  onChange={e => setLookup(l => ({ ...l, code: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-stone-800" />
                <span className="text-stone-600 text-xs font-body">ή</span>
                <div className="flex-1 h-px bg-stone-800" />
              </div>
              <div>
                <label className="label">Επίθετο</label>
                <input
                  className="input-field"
                  placeholder="πχ. Παπαδόπουλος"
                  value={lookup.lastname}
                  onChange={e => setLookup(l => ({ ...l, lastname: e.target.value }))}
                />
              </div>

              {error && <p className="text-red-400 text-sm font-body text-center">{error}</p>}

              <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
                {loading ? 'Αναζήτηση...' : 'Έναρξη Check-In →'}
              </button>
            </form>
          </div>
        )}

        {/* ══ STEP 1: GUEST DETAILS ══ */}
        {step === 1 && (
          <div className="w-full max-w-sm animate-in">
            <div className="mb-8">
              <div className="text-xs font-mono text-brand-400 uppercase tracking-widest mb-2">Βήμα 1 — Στοιχεία</div>
              <h2 className="font-display text-3xl font-light text-white">Προσωπικά Στοιχεία</h2>
              {reservation && (
                <div className="mt-3 px-3 py-2 border border-stone-800 bg-stone-900/50">
                  <span className="text-stone-400 text-xs">Κράτηση: </span>
                  <span className="text-brand-300 text-xs font-mono">{reservation.reservation_code}</span>
                  {room && <span className="text-stone-400 text-xs ml-3">Δωμάτιο {room.room_number}</span>}
                </div>
              )}
            </div>
            <form onSubmit={handleGuestNext} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Όνομα *</label>
                  <input className="input-field" placeholder="Γιώργος" value={guest.first_name}
                    onChange={e => setGuest(g => ({ ...g, first_name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Επίθετο *</label>
                  <input className="input-field" placeholder="Νικολάου" value={guest.last_name}
                    onChange={e => setGuest(g => ({ ...g, last_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Κινητό Τηλέφωνο *</label>
                <input className="input-field" type="tel" placeholder="+30 6900000000" value={guest.phone}
                  onChange={e => setGuest(g => ({ ...g, phone: e.target.value }))} />
              </div>
              <div>
                <label className="label">Email *</label>
                <input className="input-field" type="email" placeholder="email@example.com" value={guest.email}
                  onChange={e => setGuest(g => ({ ...g, email: e.target.value }))} />
                <p className="text-stone-600 text-xs mt-1 font-body">Σε αυτό το email θα λάβετε τους κωδικούς εισόδου.</p>
              </div>
              <div>
                <label className="label">Εθνικότητα</label>
                <select className="input-field" value={guest.nationality}
                  onChange={e => setGuest(g => ({ ...g, nationality: e.target.value }))}>
                  <option>Ελλάδα</option>
                  <option>Αλβανία</option>
                  <option>Βουλγαρία</option>
                  <option>Γερμανία</option>
                  <option>Ηνωμένο Βασίλειο</option>
                  <option>ΗΠΑ</option>
                  <option>Ιταλία</option>
                  <option>Κύπρος</option>
                  <option>Ρουμανία</option>
                  <option>Άλλη</option>
                </select>
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <div className="flex gap-3">
                <button type="button" className="btn-ghost flex-1" onClick={() => setStep(0)}>← Πίσω</button>
                <button type="submit" className="btn-primary flex-1">Συνέχεια →</button>
              </div>
            </form>
          </div>
        )}

        {/* ══ STEP 2: ID DETAILS ══ */}
        {step === 2 && (
          <div className="w-full max-w-sm animate-in">
            <div className="mb-8">
              <div className="text-xs font-mono text-brand-400 uppercase tracking-widest mb-2">Βήμα 2 — Ταυτοποίηση</div>
              <h2 className="font-display text-3xl font-light text-white">Έγγραφο Ταυτότητας</h2>
            </div>
            <form onSubmit={handleIdNext} className="space-y-4">
              <div>
                <label className="label">Τύπος Εγγράφου *</label>
                <select className="input-field" value={guest.id_type}
                  onChange={e => setGuest(g => ({ ...g, id_type: e.target.value }))}>
                  <option value="national_id">Αστυνομική Ταυτότητα</option>
                  <option value="passport">Διαβατήριο</option>
                  <option value="afm">ΑΦΜ (Μόνο για Έλληνες)</option>
                </select>
              </div>
              <div>
                <label className="label">
                  {guest.id_type === 'national_id' && 'Αριθμός Ταυτότητας *'}
                  {guest.id_type === 'passport' && 'Αριθμός Διαβατηρίου *'}
                  {guest.id_type === 'afm' && 'ΑΦΜ *'}
                </label>
                <input
                  className="input-field font-mono tracking-wider"
                  placeholder={guest.id_type === 'afm' ? '000000000' : guest.id_type === 'passport' ? 'AB1234567' : 'ΑΒ-123456'}
                  value={guest.id_number}
                  onChange={e => setGuest(g => ({ ...g, id_number: e.target.value }))}
                />
              </div>

              {guest.nationality === 'Ελλάδα' && guest.id_type !== 'afm' && (
                <div>
                  <label className="label">ΑΦΜ (Προαιρετικό)</label>
                  <input
                    className="input-field font-mono"
                    placeholder="000000000"
                    value={guest.afm}
                    onChange={e => setGuest(g => ({ ...g, afm: e.target.value }))}
                  />
                </div>
              )}

              <div className="px-4 py-3 border border-stone-800 bg-stone-900/30">
                <p className="text-stone-500 text-xs leading-relaxed">
                  🔒 Τα στοιχεία σας αποθηκεύονται με ασφάλεια και χρησιμοποιούνται αποκλειστικά για τη διαδικασία check-in σύμφωνα με τη νομοθεσία GDPR.
                </p>
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <div className="flex gap-3">
                <button type="button" className="btn-ghost flex-1" onClick={() => setStep(1)}>← Πίσω</button>
                <button type="submit" className="btn-primary flex-1">Συνέχεια →</button>
              </div>
            </form>
          </div>
        )}

        {/* ══ STEP 3: PHOTO ══ */}
        {step === 3 && (
          <div className="w-full max-w-sm animate-in">
            <div className="mb-8">
              <div className="text-xs font-mono text-brand-400 uppercase tracking-widest mb-2">Βήμα 3 — Φωτογραφία</div>
              <h2 className="font-display text-3xl font-light text-white">Φωτογραφία Εγγράφου</h2>
              <p className="text-stone-400 text-sm mt-2">Τραβήξτε ή ανεβάστε φωτογραφία της ταυτότητας / διαβατηρίου σας.</p>
            </div>

            {!photoPreview && !useCamera && (
              <div className="space-y-3">
                <label className="upload-zone block cursor-pointer"
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleFileDrop}>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileDrop} />
                  <div className="text-4xl mb-3">📄</div>
                  <div className="text-white text-sm font-body">Σύρτε φωτογραφία εδώ</div>
                  <div className="text-stone-500 text-xs mt-1">ή κάντε κλικ για επιλογή</div>
                </label>
                <button type="button" className="btn-ghost w-full" onClick={startCamera}>
                  📷 Χρήση Κάμερας
                </button>
              </div>
            )}

            {useCamera && (
              <div className="space-y-3">
                <div className="relative border border-stone-700 overflow-hidden" style={{ aspectRatio: '4/3' }}>
                  <video ref={videoRef} autoPlay playsInline muted
                    className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-brand-500/40 pointer-events-none" />
                </div>
                <div className="flex gap-3">
                  <button type="button" className="btn-ghost flex-1" onClick={stopCamera}>Ακύρωση</button>
                  <button type="button" className="btn-primary flex-1" onClick={capturePhoto}>📸 Λήψη</button>
                </div>
              </div>
            )}

            {photoPreview && (
              <div className="space-y-4">
                <div className="relative border border-brand-500/40 overflow-hidden">
                  <img src={photoPreview} alt="ID preview" className="w-full object-cover" />
                  <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs px-2 py-1">✓ Ανέβηκε</div>
                </div>
                <button type="button" className="btn-ghost w-full text-xs"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}>
                  Αντικατάσταση φωτογραφίας
                </button>
              </div>
            )}

            {error && <p className="text-red-400 text-sm text-center mt-3">{error}</p>}

            {/* GDPR Consent */}
            <div className="border border-stone-800 bg-stone-900/30 p-3 mt-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gdprConsent}
                  onChange={e => { setGdprConsent(e.target.checked); setError('') }}
                  className="mt-0.5 w-4 h-4 flex-shrink-0 accent-amber-600"
                />
                <span className="text-stone-400 text-xs leading-relaxed">
                  Συμφωνώ με τους{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-brand-400 underline">
                    Όρους Χρήσης
                  </a>
                  {' '}και την{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-400 underline">
                    Πολιτική Απορρήτου
                  </a>
                  . Τα δεδομένα μου θα διαγραφούν αυτόματα εντός 90 ημερών από το check-out. *
                </span>
              </label>
            </div>

            <div className="flex gap-3 mt-3">
              <button type="button" className="btn-ghost flex-1" onClick={() => setStep(2)}>← Πίσω</button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={handleSubmit}
                disabled={loading || !photoFile || !gdprConsent}
              >
                {loading ? 'Αποθήκευση...' : 'Ολοκλήρωση ✓'}
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 4: SUCCESS ══ */}
        {step === 4 && (
          <div className="w-full max-w-sm animate-in text-center">
            <div className="w-16 h-16 bg-emerald-900/40 border border-emerald-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">✓</span>
            </div>
            <h2 className="font-display text-4xl font-light text-white mb-3">Ευχαριστούμε!</h2>
            <div className="divider" />
            <p className="text-stone-300 text-sm leading-relaxed mb-6">
              Το online check-in σας ολοκληρώθηκε επιτυχώς.
            </p>

            <div className="card text-left space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📧</span>
                <div>
                  <div className="text-white text-sm font-body font-medium mb-1">Κωδικοί πρόσβασης</div>
                  <div className="text-stone-400 text-xs leading-relaxed">
                    {isCheckinToday
                      ? <>Οι κωδικοί εισόδου, keylocker και WiFi <strong className="text-emerald-400">στάλθηκαν ήδη</strong> στο email σας.</>
                      : <>Θα λάβετε email με τους κωδικούς εισόδου, keylocker και WiFi <strong className="text-brand-300">στις 14:00</strong> της ημέρας άφιξής σας.</>
                    }
                  </div>
                </div>
              </div>
              <div className="h-px bg-stone-800" />
              <div className="flex items-start gap-3">
                <span className="text-2xl">🏨</span>
                <div>
                  <div className="text-white text-sm font-body font-medium mb-1">Check-in</div>
                  <div className="text-stone-400 text-xs leading-relaxed">
                    Τα δωμάτια είναι διαθέσιμα από τις <strong className="text-brand-300">15:00</strong>. Για πρώιμο check-in επικοινωνήστε μαζί μας.
                  </div>
                </div>
              </div>
              <div className="h-px bg-stone-800" />
              <div className="flex items-start gap-3">
                <span className="text-2xl">🕐</span>
                <div>
                  <div className="text-white text-sm font-body font-medium mb-1">Check-out</div>
                  <div className="text-stone-400 text-xs leading-relaxed">
                    Παρακαλούμε αποχωρήστε έως τις <strong className="text-brand-300">11:30</strong> της ημέρας αναχώρησης.
                  </div>
                </div>
              </div>
              {reservation && (
                <>
                  <div className="h-px bg-stone-800" />
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 text-xs">Κράτηση</span>
                    <span className="font-mono text-brand-300 text-sm">{reservation.reservation_code}</span>
                  </div>
                  {room && (
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500 text-xs">Δωμάτιο</span>
                      <span className="font-mono text-white text-sm">{room.room_number}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border border-stone-800 bg-stone-900/30 px-4 py-3 mb-6 text-left">
              <p className="text-stone-500 text-xs leading-relaxed">
                📞 Χρειάζεστε βοήθεια; <a href="tel:+306949655349" className="text-brand-400 font-bold">+30 6949655349</a>
              </p>
            </div>

            <p className="text-stone-600 text-xs">
              Designed &amp; Developed by{' '}
              <a href="https://webrya.com" target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-stone-400 transition-colors">Webrya</a>
            </p>
          </div>
        )}
      </main>
    </div>
  )
}