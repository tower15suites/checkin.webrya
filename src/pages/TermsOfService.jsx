export default function TermsOfService() {
  return (
    <div className="min-h-dvh bg-stone-950 flex flex-col">
      <header className="border-b border-stone-800/60 px-6 py-5">
        <img src="/logo-tower15.jpg" alt="Tower 15 Suites" className="h-10 w-auto" />
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-5 py-12 w-full">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-light text-white mb-2">Όροι Χρήσης</h1>
          <div className="w-12 h-px bg-brand-500 my-6" />
          <p className="text-stone-400 text-sm font-body">
            Τελευταία ενημέρωση: Απρίλιος 2026
          </p>
        </div>

        <div className="space-y-8 font-body text-stone-300 text-sm leading-relaxed">

          <section>
            <h2 className="text-white text-base font-medium mb-3">1. Γενικά</h2>
            <p className="text-stone-400">
              Η χρήση της παρούσας πλατφόρμας online check-in («Υπηρεσία») υπόκειται στους παρόντες Όρους Χρήσης. Η πλατφόρμα παρέχεται από το <strong className="text-stone-300">Tower 15 Suites</strong> (Ιωάννου Φαρμάκη 15, Θεσσαλονίκη) αποκλειστικά για τη διευκόλυνση της διαδικασίας check-in των επισκεπτών. Η χρήση της Υπηρεσίας συνεπάγεται πλήρη αποδοχή των παρόντων όρων.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-medium mb-3">2. Δικαίωμα Χρήσης</h2>
            <p className="text-stone-400">
              Η Υπηρεσία απευθύνεται αποκλειστικά σε επισκέπτες που διαθέτουν έγκυρη κράτηση στο Tower 15 Suites. Η χρήση από μη εξουσιοδοτημένα πρόσωπα απαγορεύεται. Ο χρήστης βεβαιώνει ότι τα στοιχεία που υποβάλλει είναι αληθή, ακριβή και ενημερωμένα.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-medium mb-3">3. Διαδικασία Check-In</h2>
            <div className="space-y-3 text-stone-400">
              <p>
                Ο επισκέπτης υποχρεούται να συμπληρώσει ορθά όλα τα υποχρεωτικά πεδία της φόρμας check-in, να υποβάλει σαφή και ευανάγνωστη φωτογραφία εγκεκριμένου εγγράφου ταυτοποίησης (ταυτότητα, διαβατήριο ή ΑΦΜ) και να παράσχει έγκυρη διεύθυνση email για την παραλαβή των κωδικών πρόσβασης.
              </p>
              <p>
                Η ολοκλήρωση του online check-in δεν εγγυάται αυτόματη άμεση πρόσβαση στο δωμάτιο. Τα δωμάτια είναι διαθέσιμα από τις <strong className="text-stone-300">15:00</strong> της ημέρας άφιξης.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-white text-base font-medium mb-3">4. Κωδικοί Πρόσβασης</h2>
            <div className="space-y-3 text-stone-400">
              <p>
                Οι κωδικοί εισόδου (keylocker, WiFi, εξώπορτα) αποστέλλονται στο email που δηλώθηκε κατά το check-in στις <strong className="text-stone-300">14:00</strong> της ημέρας άφιξης, εφόσον έχει ολοκληρωθεί το online check-in.
              </p>
              <p>
                Ο επισκέπτης υποχρεούται να διατηρεί τους κωδικούς εμπιστευτικούς και να μην τους κοινοποιεί σε τρίτους. Το Tower 15 Suites δεν φέρει ευθύνη για μη εξουσιοδοτημένη χρήση κωδικών που έχουν κοινοποιηθεί από τον επισκέπτη.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-white text-base font-medium mb-3">5. Κανόνες Διαμονής</h2>
            <ul className="space-y-2 text-stone-400">
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> Check-in: από τις <strong className="text-stone-300">15:00</strong></li>
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> Check-out: έως τις <strong className="text-stone-300">11:30</strong></li>
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> Απαγορεύεται το κάπνισμα εντός των δωματίων</li>
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> Απαγορεύονται οι υπερβολικοί θόρυβοι μετά τις 23:00</li>
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> Τα κατοικίδια επιτρέπονται μόνο κατόπιν προηγούμενης συνεννόησης</li>
              <li className="flex gap-2"><span className="text-brand-500 flex-shrink-0">—</span> Ο αριθμός διαμενόντων δεν μπορεί να υπερβαίνει τη δυναμικότητα του δωματίου</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-base font-medium mb-3">6. Ευθύνες & Αποζημίωση</h2>
            <div className="space-y-3 text-stone-400">
              <p>
                Ο επισκέπτης είναι υπεύθυνος για τυχόν ζημιές που προκαλούνται στο δωμάτιο ή στους κοινόχρηστους χώρους κατά τη διάρκεια της διαμονής του. Το Tower 15 Suites διατηρεί το δικαίωμα χρέωσης αποζημίωσης για οποιαδήποτε ζημία.
              </p>
              <p>
                Το Tower 15 Suites δεν φέρει ευθύνη για απώλεια ή κλοπή προσωπικών αντικειμένων εντός του καταλύματος.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-white text-base font-medium mb-3">7. Ακυρώσεις & Επιστροφές</h2>
            <p className="text-stone-400">
              Η πολιτική ακυρώσεων καθορίζεται από την πλατφόρμα κράτησης (Booking.com, Airbnb κ.λπ.) ή από τη σύμβαση απευθείας κράτησης. Το online check-in δεν τροποποιεί την ισχύουσα πολιτική ακυρώσεων.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-medium mb-3">8. Προσωπικά Δεδομένα</h2>
            <p className="text-stone-400">
              Η επεξεργασία των προσωπικών δεδομένων σας διέπεται από την{' '}
              <a href="/privacy" className="text-brand-400 underline">Πολιτική Απορρήτου</a>{' '}
              του Tower 15 Suites, η οποία αποτελεί αναπόσπαστο μέρος των παρόντων Όρων Χρήσης.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-medium mb-3">9. Τροποποίηση Όρων</h2>
            <p className="text-stone-400">
              Το Tower 15 Suites διατηρεί το δικαίωμα τροποποίησης των παρόντων όρων οποτεδήποτε. Οι αλλαγές τίθενται σε ισχύ από τη δημοσίευσή τους. Η συνέχιση χρήσης της Υπηρεσίας μετά την τροποποίηση συνεπάγεται αποδοχή των νέων όρων.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-medium mb-3">10. Εφαρμοστέο Δίκαιο</h2>
            <p className="text-stone-400">
              Οι παρόντες όροι διέπονται από το ελληνικό δίκαιο. Για κάθε διαφορά αρμόδια είναι τα δικαστήρια Θεσσαλονίκης.
            </p>
          </section>

          <section>
            <h2 className="text-white text-base font-medium mb-3">11. Επικοινωνία</h2>
            <p className="text-stone-400">
              Tower 15 Suites<br />
              Ιωάννου Φαρμάκη 15, Θεσσαλονίκη 546 29<br />
              Email: <a href="mailto:info@tower15suites.gr" className="text-brand-400">info@tower15suites.gr</a><br />
              Τηλέφωνο: <a href="tel:+306949655349" className="text-brand-400">+30 6949655349</a>
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-stone-800 px-6 py-4 text-center">
        <p className="text-stone-600 text-xs">
          Tower 15 Suites · Ιωάννου Φαρμάκη 15, Θεσσαλονίκη ·{' '}
          <a href="/privacy" className="text-stone-500 hover:text-stone-400 mr-3">Πολιτική Απορρήτου</a>
          <a href="/checkin" className="text-stone-500 hover:text-stone-400">Επιστροφή στο Check-In</a>
        </p>
      </footer>
    </div>
  )
}
