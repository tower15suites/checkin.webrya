export default function PrivacyPolicy() {
  return (
    <div className="min-h-dvh bg-stone-950 flex flex-col">
      <header className="border-b border-stone-800/60 px-6 py-5">
        <img src="/logo-tower15.jpg" alt="Tower 15 Suites" className="h-10 w-auto" />
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-5 py-12 w-full">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-light text-white mb-2">Πολιτική Απορρήτου</h1>
          <div className="w-12 h-px bg-brand-500 my-6" />
          <p className="text-stone-400 text-sm font-body">
            Τελευταία ενημέρωση: Απρίλιος 2026
          </p>
        </div>

        <div className="space-y-8 font-body text-stone-300 text-sm leading-relaxed">

          <section>
            <h2 className="text-white text-base font-medium mb-3">1. Υπεύθυνος Επεξεργασίας</h2>
            <p>
              <strong className="text-brand-300">Tower 15 Suites</strong><br />
              Ιωάννου Φαρμάκη 15, Θεσσαλονίκη 546 29<br />
              Email: <a href="mailto:info@tower15suites.gr" className="text-brand-400">info@tower15suites.gr</a><br />
              Τηλέφωνο: <a href="tel:+306949655349" className="text-brand-400">+30 6949655349</a>
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-medium mb-3">2. Ποια Δεδομένα Συλλέγουμε</h2>
            <p className="mb-3">Κατά τη διαδικασία online check-in συλλέγουμε:</p>
            <ul className="space-y-1.5 text-stone-400">
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> Ονοματεπώνυμο</li>
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> Αριθμό τηλεφώνου</li>
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> Διεύθυνση email</li>
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> Εθνικότητα</li>
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> Αριθμό ταυτότητας ή διαβατηρίου (ή ΑΦΜ)</li>
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> Φωτογραφία εγγράφου ταυτότητας</li>
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> Στοιχεία κράτησης (δωμάτιο, ημερομηνίες)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-base font-medium mb-3">3. Σκοπός Επεξεργασίας</h2>
            <p className="mb-3">Τα δεδομένα σας χρησιμοποιούνται αποκλειστικά για:</p>
            <ul className="space-y-1.5 text-stone-400">
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> Την ολοκλήρωση της διαδικασίας check-in σύμφωνα με την ελληνική νομοθεσία (Ν. 4442/2016 περί τήρησης αρχείου διαμενόντων)</li>
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> Την αποστολή κωδικών πρόσβασης στο δωμάτιο</li>
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> Την επικοινωνία σχετικά με την κράτησή σας</li>
            </ul>
            <p className="mt-3 text-stone-400">
              Νομική βάση επεξεργασίας: <strong className="text-stone-300">Εκτέλεση σύμβασης</strong> (άρθρο 6§1β ΓΚΠΔ) και <strong className="text-stone-300">Έννομη υποχρέωση</strong> (άρθρο 6§1γ ΓΚΠΔ).
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-medium mb-3">4. Διάρκεια Διατήρησης</h2>
            <div className="space-y-3 text-stone-400">
              <p>
                <strong className="text-stone-300">Στοιχεία check-in & φωτογραφίες:</strong> Διατηρούνται για <strong className="text-brand-300">90 ημέρες</strong> μετά το check-out και στη συνέχεια διαγράφονται αυτόματα.
              </p>
              <p>
                <strong className="text-stone-300">Στοιχεία κράτησης:</strong> Διατηρούνται για <strong className="text-brand-300">3 ημέρες</strong> μετά το check-out για λόγους ασφαλείας.
              </p>
              <p>
                Σε περίπτωση νομικής διαφοράς ή αιτήματος αρχής, τα δεδομένα δύνανται να διατηρηθούν έως την επίλυση.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-white text-base font-medium mb-3">5. Αποδέκτες Δεδομένων</h2>
            <p className="text-stone-400 mb-3">
              Τα δεδομένα σας <strong className="text-stone-300">δεν διαβιβάζονται σε τρίτους</strong> για εμπορικούς σκοπούς. Πρόσβαση έχουν μόνο:
            </p>
            <ul className="space-y-1.5 text-stone-400">
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> Το εξουσιοδοτημένο προσωπικό του Tower 15 Suites</li>
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> <strong className="text-stone-300">Supabase</strong> (αποθήκευση δεδομένων, servers εντός ΕΕ)</li>
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> Αρμόδιες αρχές (Αστυνομία, ΑΑΔΕ) εφόσον απαιτείται από τη νομοθεσία</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-base font-medium mb-3">6. Ασφάλεια Δεδομένων</h2>
            <p className="text-stone-400">
              Όλα τα δεδομένα μεταδίδονται κρυπτογραφημένα (HTTPS/TLS). Οι φωτογραφίες αποθηκεύονται σε private bucket χωρίς δημόσια πρόσβαση. Η πρόσβαση στο σύστημα διαχείρισης προστατεύεται με κωδικό.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-medium mb-3">7. Τα Δικαιώματά Σας (ΓΚΠΔ)</h2>
            <p className="mb-3 text-stone-400">Έχετε δικαίωμα:</p>
            <ul className="space-y-1.5 text-stone-400">
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> <strong className="text-stone-300">Πρόσβασης</strong> στα δεδομένα που τηρούμε για εσάς</li>
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> <strong className="text-stone-300">Διόρθωσης</strong> ανακριβών δεδομένων</li>
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> <strong className="text-stone-300">Διαγραφής</strong> («δικαίωμα στη λήθη») — εφόσον δεν συντρέχει νόμιμη υποχρέωση διατήρησης</li>
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> <strong className="text-stone-300">Περιορισμού</strong> της επεξεργασίας</li>
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> <strong className="text-stone-300">Φορητότητας</strong> των δεδομένων σας</li>
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> <strong className="text-stone-300">Εναντίωσης</strong> στην επεξεργασία</li>
            </ul>
            <p className="mt-3 text-stone-400">
              Για άσκηση δικαιωμάτων: <a href="mailto:info@tower15suites.gr" className="text-brand-400">info@tower15suites.gr</a>
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-medium mb-3">8. Καταγγελία στην Αρχή</h2>
            <p className="text-stone-400">
              Έχετε δικαίωμα καταγγελίας στην <strong className="text-stone-300">Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (ΑΠΔΠΧ)</strong>:{' '}
              <a href="https://www.dpa.gr" target="_blank" rel="noopener noreferrer" className="text-brand-400">www.dpa.gr</a>
            </p>
          </section>

          <section className="border-t border-stone-800 pt-6">
            <p className="text-stone-600 text-xs">
              Αυτή η πολιτική απορρήτου συντάχθηκε σύμφωνα με τον Γενικό Κανονισμό Προστασίας Δεδομένων (ΓΚΠΔ/GDPR — Κανονισμός ΕΕ 2016/679) και την ελληνική νομοθεσία.
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-stone-800 px-6 py-4 text-center">
        <p className="text-stone-600 text-xs">
          Tower 15 Suites · Ιωάννου Φαρμάκη 15, Θεσσαλονίκη ·{' '}
          <a href="/terms" className="text-stone-500 hover:text-stone-400 mr-3">Όροι Χρήσης</a>
          <a href="/checkin" className="text-stone-500 hover:text-stone-400">Επιστροφή στο Check-In</a>
        </p>
      </footer>
    </div>
  )
}
