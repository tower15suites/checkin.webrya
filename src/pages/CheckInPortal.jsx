import { useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { translations } from '../lib/i18n.js'

export default function CheckInPortal() {
  const [searchParams] = useSearchParams()
  const [lang, setLang] = useState('el')
  const t = translations[lang]

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

  const [lookup, setLookup] = useState({
    code: searchParams.get('reservation') || searchParams.get('code') || '',
    lastname: searchParams.get('lastname') || '',
  })

  const [guest, setGuest] = useState({
    first_name: '', last_name: '', phone: '', email: '',
    nationality: '',
    id_type: 'national_id',
    id_number: '', afm: '',
  })

  // Set default nationality when lang changes
  const toggleLang = () => {
    const newLang = lang === 'el' ? 'en' : 'el'
    setLang(newLang)
    setError('')
    if (!guest.nationality || guest.nationality === translations[lang].defaultNationality) {
      setGuest(g => ({ ...g, nationality: translations[newLang].defaultNationality }))
    }
  }

  const progress = (step / (t.steps.length - 1)) * 100
  const room = reservation?.rooms
  const isCheckinToday = reservation?.check_in_date === new Date().toISOString().split('T')[0]

  async function handleLookup(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let query
      const hasCode = lookup.code.trim().length > 0
      const hasLastname = lookup.lastname.trim().length > 0

      if (!hasCode && !hasLastname) {
        setError(t.errorFillCodeOrLastname); setLoading(false); return
      }

      if (hasCode) {
        const code = lookup.code.trim()
        query = supabase.from('reservations').select('*, rooms(*)')
          .or(`reservation_code.ilike.${code},hosthub_id.ilike.${code}`)
      } else {
        query = supabase.from('reservations').select('*, rooms(*)')
          .ilike('guest_last_name', `%${lookup.lastname.trim()}%`)
          // FIX: φίλτρο μόνο για μελλοντικές + σημερινές κρατήσεις
          .gte('check_out_date', new Date().toISOString().split('T')[0])
          .order('check_in_date', { ascending: true })
      }

      const { data: rawData, error: err } = await query.limit(1).maybeSingle()
      const data = rawData

      if (err || !data) {
        // FIX: αν δεν βρέθηκε με επίθετο, δοκιμάζουμε να κάνουμε sync πρώτα
        if (hasLastname && !hasCode) {
          setError(lang === 'el'
            ? 'Η κράτηση δεν βρέθηκε. Βεβαιωθείτε ότι το επίθετο είναι σωστό, ή χρησιμοποιήστε τον αριθμό κράτησης.'
            : 'Reservation not found. Please check your last name spelling, or use your reservation number.')
        } else {
          setError(t.errorNotFound)
        }
      } else if (data.status === 'checked_in' && data.codes_sent) {
        setError(t.errorAlreadyCheckedIn)
      } else {
        setReservation(data)
        setGuest(g => ({
          ...g,
          first_name: data.guest_first_name || '',
          last_name: data.guest_last_name || '',
          email: data.guest_email || '',
          phone: data.guest_phone || '',
          nationality: g.nationality || t.defaultNationality,
        }))
        setStep(1)
      }
    } catch { setError(t.errorConnection) }
    setLoading(false)
  }

  function handleGuestNext(e) {
    e.preventDefault()
    setError('')
    const { first_name, last_name, phone, email } = guest
    if (!first_name || !last_name || !phone || !email) { setError(t.errorFillAll); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError(t.errorInvalidEmail); return }
    setStep(2)
  }

  function handleIdNext(e) {
    e.preventDefault()
    setError('')
    if (!guest.id_number) { setError(t.errorFillId); return }
    setStep(3)
  }

  const handleFileDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files[0] || e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError(t.errorImageOnly); return }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setError('')
  }, [t])

  async function startCamera() {
    setUseCamera(true)
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch { setError(lang === 'el' ? 'Δεν επιτράπηκε πρόσβαση στην κάμερα. Ανεβάστε φωτογραφία.' : 'Camera access denied. Please upload a photo.'); setUseCamera(false) }
    }, 100)
  }

  function capturePhoto() {
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
    canvas.toBlob(blob => {
      const file = new File([blob], 'id-photo.jpg', { type: 'image/jpeg' })
      setPhotoFile(file); setPhotoPreview(URL.createObjectURL(blob)); stopCamera(); setError('')
    }, 'image/jpeg', 0.9)
  }

  function stopCamera() { streamRef.current?.getTracks().forEach(t => t.stop()); setUseCamera(false) }

  async function handleSubmit() {
    if (!photoFile) { setError(t.errorNoPhoto); return }
    if (!gdprConsent) { setError(t.errorNoConsent); return }
    setError(''); setLoading(true)
    try {
      const ext = photoFile.name.split('.').pop()
      const filename = `${reservation.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('guest-photos').upload(filename, photoFile, { upsert: true })
      if (uploadErr) throw uploadErr

      const { error: insertErr } = await supabase.from('guest_checkins').insert({
        reservation_id: reservation.id,
        first_name: guest.first_name, last_name: guest.last_name,
        phone: guest.phone, email: guest.email,
        id_type: guest.id_type, id_number: guest.id_number,
        afm: guest.afm || null, nationality: guest.nationality,
        photo_url: filename, gdpr_consent: true,
        gdpr_consent_at: new Date().toISOString(),
      })
      if (insertErr) throw insertErr

      const { error: updateErr } = await supabase.from('reservations').update({ status: 'checked_in' }).eq('id', reservation.id)
      if (updateErr) throw updateErr

      if (isCheckinToday) {
        try {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-codes`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ reservationId: reservation.id }),
          })
        } catch (e) { console.warn('send-codes non-fatal:', e) }
      }
      setStep(4)
    } catch (err) { console.error(err); setError(t.errorSave) }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh bg-stone-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-stone-800/60 px-6 py-5 flex items-center justify-between">
        <img src="/logo-tower15suites.png" alt="Tower 15 Suites" className="h-10 w-auto" />
        <div className="flex items-center gap-4">
          {step > 0 && step < 4 && (
            <div className="text-stone-500 font-mono text-xs">{step}/{t.steps.length - 1}</div>
          )}
          <button
            onClick={toggleLang}
            className="text-xs font-mono border border-stone-700 hover:border-brand-500 text-stone-400 hover:text-white px-2.5 py-1 transition-colors"
          >
            {t.langSwitch}
          </button>
        </div>
      </header>

      {/* Progress bar */}
      {step > 0 && step < 4 && (
        <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
      )}

      <main className="flex-1 flex flex-col items-center justify-center px-5 py-10">

        {/* ══ STEP 0: LOOKUP ══ */}
        {step === 0 && (
          <div className="w-full max-w-sm animate-in">
            <div className="text-center mb-10">
              <h1 className="font-display text-4xl font-light text-white mb-2">{t.welcome}</h1>
              <div className="divider" />
              <p className="text-stone-400 text-sm font-body whitespace-pre-line">{t.welcomeSub}</p>
            </div>
            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="label">{t.reservationCode}</label>
                <input className="input-field" placeholder={t.reservationPlaceholder} value={lookup.code}
                  onChange={e => setLookup(l => ({ ...l, code: e.target.value }))} />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-stone-800" />
                <span className="text-stone-600 text-xs font-body">{t.or}</span>
                <div className="flex-1 h-px bg-stone-800" />
              </div>
              <div>
                <label className="label">{t.lastName}</label>
                <input className="input-field" placeholder={t.lastNamePlaceholder} value={lookup.lastname}
                  onChange={e => setLookup(l => ({ ...l, lastname: e.target.value }))} />
              </div>
              {error && <p className="text-red-400 text-sm font-body text-center">{error}</p>}
              <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
                {loading ? t.searching : t.startCheckin}
              </button>
            </form>
          </div>
        )}

        {/* ══ STEP 1: GUEST DETAILS ══ */}
        {step === 1 && (
          <div className="w-full max-w-sm animate-in">
            <div className="mb-8">
              <div className="text-xs font-mono text-brand-400 uppercase tracking-widest mb-2">{t.step1Label}</div>
              <h2 className="font-display text-3xl font-light text-white">{t.step1Title}</h2>
              {reservation && (
                <div className="mt-3 px-3 py-2 border border-stone-800 bg-stone-900/50">
                  <span className="text-stone-400 text-xs">{t.reservationLabel} </span>
                  <span className="text-brand-300 text-xs font-mono">{reservation.reservation_code}</span>
                  {room && <span className="text-stone-400 text-xs ml-3">{t.roomLabel} {room.room_number}</span>}
                </div>
              )}
            </div>
            <form onSubmit={handleGuestNext} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t.firstName}</label>
                  <input className="input-field" placeholder={t.firstNamePlaceholder} value={guest.first_name}
                    onChange={e => setGuest(g => ({ ...g, first_name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">{t.lastNameField}</label>
                  <input className="input-field" placeholder={t.lastNameFieldPlaceholder} value={guest.last_name}
                    onChange={e => setGuest(g => ({ ...g, last_name: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">{t.phone}</label>
                <input className="input-field" type="tel" placeholder={t.phonePlaceholder} value={guest.phone}
                  onChange={e => setGuest(g => ({ ...g, phone: e.target.value }))} />
              </div>
              <div>
                <label className="label">{t.email}</label>
                <input className="input-field" type="email" placeholder={t.emailPlaceholder} value={guest.email}
                  onChange={e => setGuest(g => ({ ...g, email: e.target.value }))} />
                <p className="text-stone-600 text-xs mt-1 font-body">{t.emailHint}</p>
              </div>
              <div>
                <label className="label">{t.nationality}</label>
                <select className="input-field" value={guest.nationality || t.defaultNationality}
                  onChange={e => setGuest(g => ({ ...g, nationality: e.target.value }))}>
                  {t.nationalities.map(n => <option key={n}>{n}</option>)}
                </select>
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <div className="flex gap-3">
                <button type="button" className="btn-ghost flex-1" onClick={() => setStep(0)}>{t.back}</button>
                <button type="submit" className="btn-primary flex-1">{t.continue}</button>
              </div>
            </form>
          </div>
        )}

        {/* ══ STEP 2: ID DETAILS ══ */}
        {step === 2 && (
          <div className="w-full max-w-sm animate-in">
            <div className="mb-8">
              <div className="text-xs font-mono text-brand-400 uppercase tracking-widest mb-2">{t.step2Label}</div>
              <h2 className="font-display text-3xl font-light text-white">{t.step2Title}</h2>
            </div>
            <form onSubmit={handleIdNext} className="space-y-4">
              <div>
                <label className="label">{t.idType}</label>
                <select className="input-field" value={guest.id_type}
                  onChange={e => setGuest(g => ({ ...g, id_type: e.target.value }))}>
                  <option value="national_id">{t.idTypeNational}</option>
                  <option value="passport">{t.idTypePassport}</option>
                  <option value="afm">{t.idTypeAfm}</option>
                </select>
              </div>
              <div>
                <label className="label">
                  {guest.id_type === 'national_id' && t.idNumberNational}
                  {guest.id_type === 'passport' && t.idNumberPassport}
                  {guest.id_type === 'afm' && t.idNumberAfm}
                </label>
                <input className="input-field font-mono tracking-wider"
                  placeholder={guest.id_type === 'afm' ? t.idPlaceholderAfm : guest.id_type === 'passport' ? t.idPlaceholderPassport : t.idPlaceholderNational}
                  value={guest.id_number}
                  onChange={e => setGuest(g => ({ ...g, id_number: e.target.value }))} />
              </div>
              {(guest.nationality === 'Ελλάδα' || guest.nationality === 'Greece') && guest.id_type !== 'afm' && (
                <div>
                  <label className="label">{t.afmOptional}</label>
                  <input className="input-field font-mono" placeholder="000000000" value={guest.afm}
                    onChange={e => setGuest(g => ({ ...g, afm: e.target.value }))} />
                </div>
              )}
              <div className="px-4 py-3 border border-stone-800 bg-stone-900/30">
                <p className="text-stone-500 text-xs leading-relaxed">{t.gdprNote}</p>
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <div className="flex gap-3">
                <button type="button" className="btn-ghost flex-1" onClick={() => setStep(1)}>{t.back}</button>
                <button type="submit" className="btn-primary flex-1">{t.continue}</button>
              </div>
            </form>
          </div>
        )}

        {/* ══ STEP 3: PHOTO ══ */}
        {step === 3 && (
          <div className="w-full max-w-sm animate-in">
            <div className="mb-8">
              <div className="text-xs font-mono text-brand-400 uppercase tracking-widest mb-2">{t.step3Label}</div>
              <h2 className="font-display text-3xl font-light text-white">{t.step3Title}</h2>
              <p className="text-stone-400 text-sm mt-2">{t.step3Sub}</p>
            </div>

            {!photoPreview && !useCamera && (
              <div className="space-y-3">
                <label className="upload-zone block cursor-pointer" onDragOver={e => e.preventDefault()} onDrop={handleFileDrop}>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileDrop} />
                  <div className="text-4xl mb-3">📄</div>
                  <div className="text-white text-sm font-body">{t.dragPhoto}</div>
                  <div className="text-stone-500 text-xs mt-1">{t.orClickSelect}</div>
                </label>
                <button type="button" className="btn-ghost w-full" onClick={startCamera}>{t.useCamera}</button>
              </div>
            )}

            {useCamera && (
              <div className="space-y-3">
                <div className="relative border border-stone-700 overflow-hidden" style={{ aspectRatio: '4/3' }}>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-brand-500/40 pointer-events-none" />
                </div>
                <div className="flex gap-3">
                  <button type="button" className="btn-ghost flex-1" onClick={stopCamera}>{t.cancelCamera}</button>
                  <button type="button" className="btn-primary flex-1" onClick={capturePhoto}>{t.takePhoto}</button>
                </div>
              </div>
            )}

            {photoPreview && (
              <div className="space-y-4">
                <div className="relative border border-brand-500/40 overflow-hidden">
                  <img src={photoPreview} alt="ID preview" className="w-full object-cover" />
                  <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs px-2 py-1">{t.uploaded}</div>
                </div>
                <button type="button" className="btn-ghost w-full text-xs"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}>
                  {t.replacePhoto}
                </button>
              </div>
            )}

            {error && <p className="text-red-400 text-sm text-center mt-3">{error}</p>}

            {/* GDPR Consent */}
            <div className="border border-stone-800 bg-stone-900/30 p-3 mt-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={gdprConsent}
                  onChange={e => { setGdprConsent(e.target.checked); setError('') }}
                  className="mt-0.5 w-4 h-4 flex-shrink-0 accent-amber-600" />
                <span className="text-stone-400 text-xs leading-relaxed">
                  {t.gdprConsent}{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-brand-400 underline">{t.gdprTerms}</a>
                  {' '}{t.gdprAnd}{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-400 underline">{t.gdprPrivacy}</a>
                  {t.gdprConsentSuffix}
                </span>
              </label>
            </div>

            <div className="flex gap-3 mt-3">
              <button type="button" className="btn-ghost flex-1" onClick={() => setStep(2)}>{t.back}</button>
              <button type="button" className="btn-primary flex-1" onClick={handleSubmit}
                disabled={loading || !photoFile || !gdprConsent}>
                {loading ? t.saving : t.complete}
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
            <h2 className="font-display text-4xl font-light text-white mb-3">{t.thankYou}</h2>
            <div className="divider" />
            <p className="text-stone-300 text-sm leading-relaxed mb-6">{t.successSub}</p>

            <div className="card text-left space-y-3 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📧</span>
                <div>
                  <div className="text-white text-sm font-body font-medium mb-1">{t.accessCodes}</div>
                  <div className="text-stone-400 text-xs leading-relaxed">
                    {isCheckinToday
                      ? <>{t.codesSentAlready} <strong className="text-emerald-400">{t.codesSentAlready2}</strong> {t.codesSentAlready3}</>
                      : <>{t.codesSentLater} <strong className="text-brand-300">{t.codesSentAt}</strong> {t.codesSentLater2}</>
                    }
                  </div>
                </div>
              </div>
              <div className="h-px bg-stone-800" />
              <div className="flex items-start gap-3">
                <span className="text-2xl">🏨</span>
                <div>
                  <div className="text-white text-sm font-body font-medium mb-1">{t.checkinInfo}</div>
                  <div className="text-stone-400 text-xs leading-relaxed">
                    {t.checkinTime} <strong className="text-brand-300">{t.checkinTime2}</strong>{t.checkinEarly}
                  </div>
                </div>
              </div>
              <div className="h-px bg-stone-800" />
              <div className="flex items-start gap-3">
                <span className="text-2xl">🕐</span>
                <div>
                  <div className="text-white text-sm font-body font-medium mb-1">{t.checkoutInfo}</div>
                  <div className="text-stone-400 text-xs leading-relaxed">
                    {t.checkoutTime} <strong className="text-brand-300">{t.checkoutTime2}</strong> {t.checkoutTime3}
                  </div>
                </div>
              </div>
              {reservation && (
                <>
                  <div className="h-px bg-stone-800" />
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 text-xs">{t.reservationLabel2}</span>
                    <span className="font-mono text-brand-300 text-sm">{reservation.reservation_code}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 text-xs">{t.arrivalLabel}</span>
                    <span className="font-mono text-white text-sm">{reservation.check_in_date}</span>
                  </div>
                  {room && (
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500 text-xs">{t.roomLabel2}</span>
                      <span className="font-mono text-white text-sm">{room.room_number}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="border border-stone-800 bg-stone-900/30 px-4 py-3 mb-6 text-left">
              <p className="text-stone-500 text-xs leading-relaxed">
                📞 {t.needHelp} <a href="tel:+306949655349" className="text-brand-400 font-bold">+30 6949655349</a>
              </p>
            </div>

            <p className="text-stone-600 text-xs">
              Designed &amp; Developed by{' '}
              <a href="https://webrya.com" target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-stone-400 transition-colors">Webrya</a>
            </p>
          </div>
        )}

        {/* Webrya credit */}
        <div className="text-center mt-auto pt-6 pb-4 flex flex-col items-center gap-1.5">
          <span className="text-stone-700 text-xs uppercase tracking-widest">Powered by</span>
          <a href="https://webrya.com" target="_blank" rel="noopener noreferrer">
            <img src="/webrya-logo.webp" alt="Webrya" className="h-10 w-auto opacity-40 hover:opacity-80 transition-opacity" style={{ mixBlendMode: 'screen' }} />
          </a>
        </div>
      </main>
    </div>
  )
}