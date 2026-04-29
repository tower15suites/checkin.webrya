/**
 * Shared language detection utility
 * Χρησιμοποιείται από: send-checkin-link, send-codes, send-checkout-reminder, send-checkin-confirmation
 * Κανόνας: ελληνικοί χαρακτήρες → 'el', γνωστά ελληνικά ονόματα → 'el', αλλιώς → 'en'
 */

const GREEK_NAMES = new Set([
  'alexandros','alex','nikos','nikolaos','giorgos','georgios','george','dimitris','dimitrios',
  'kostas','konstantinos','yannis','ioannis','john','petros','stavros','apostolos','apostolis',
  'michalis','michael','vasilis','vasileios','panagiotis','panagis','thanasis','athanasios',
  'christos','christ','spyros','spyridon','antonis','antonios','katerina','aikaterini','maria',
  'elena','eleni','sofia','sofi','anna','ioanna','georgia','angeliki','angelos','andreas',
  'evangelia','evangelos','stavroula','despina','fotini','theodoros','theodore','thanos',
  'lefteris','eleftherios','manolis','emmanouel','stratos','efstratios','giannis','tasos',
  'manos','makis','lakis','babis','kosmas','pavlos','paul','stelios','stylianos',
  'kyriakos','kyriaki','panos','takis','vaggelis','vangelis','zoe','zoi',
  'dimos','theofilos','arsenios','filippos','philip','marios','nektarios',
  'charalampos','haris','harris','fotis','fotios',
  'koulouris','papadopoulos','papageorgiou','nikolaidis','georgiou','alexandrou',
  'karamanlis','stefanidis','dimitriou','konstantinidis','papadimitriou','kougioumtzi',
  'michaloglou','stamos','karagianni','bervinova','papaioannou','vasileiou',
  'christodoulou','oikonomou','makris','antonopoulos','stavropoulos','tsakiris',
  'petrou','andreou','theodorou','ioannou',
])

export function detectLanguage(firstName: string, lastName: string): 'el' | 'en' {
  const name = `${firstName} ${lastName}`.toLowerCase()
  // Ελληνικοί χαρακτήρες → αμέσως ελληνικά
  if (/[α-ωάέήίόύώϊϋΐΰ]/.test(name)) return 'el'
  // Γνωστά ελληνικά ονόματα (latinized)
  const parts = name.split(/\s+/)
  if (parts.some(p => GREEK_NAMES.has(p))) return 'el'
  return 'en'
}
